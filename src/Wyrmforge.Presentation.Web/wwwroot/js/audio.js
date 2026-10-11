// WyrmForge audio runtime — sample playback, mix priorities and a small main-menu Sound Atelier.
// No synthesis on the animation/gameplay hot path. Sound identity lives in sound-design.js.
(() => {
    const design = window.WyrmforgeSoundDesign;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const savedEnabledKey = 'wyrmforge.audio.enabled.v1';
    const volumeKeys = { ui: 'wyrmforge.audio.ui.v1', combat: 'wyrmforge.audio.combat.v1', moment: 'wyrmforge.audio.moment.v1', music: 'wyrmforge.audio.music.v1' };
    const volumes = { ui: 0.40, combat: 0.53, moment: 0.72, music: 0.33 };
    const lastCue = new Map();
    const variants = new Map();
    const buffers = new Map();
    const voices = { ui: 0, combat: 0, moment: 0 };
    const activeVoices = { ui: [], combat: [], moment: [] };
    const maxVoices = { ui: 2, combat: 5, moment: 3 };
    let enabled = true;
    let unlocked = false;
    let context = null;
    let master = null;
    let buses = null;
    let testButton = null;
    let toggleButton = null;
    let labButton = null;
    let lab = null;
    let status = null;
    let statusTimer = 0;
    let recordedManifest = null;
    const recordedBuffers = new Map();
    const musicPlayers = new Map();
    let currentMusic = null;
    let fadeGeneration = 0;
    let wantedMusic = null;

    function loadPreference(key) {
        try { return window.localStorage.getItem(key); } catch { return null; }
    }
    function savePreference(key, value) {
        try { window.localStorage.setItem(key, String(value)); } catch { /* Private browsing may disable storage. */ }
    }
    enabled = loadPreference(savedEnabledKey) !== 'false';
    for (const group of Object.keys(volumes)) {
        const saved = Number(loadPreference(volumeKeys[group]));
        if (loadPreference(volumeKeys[group]) !== null && Number.isFinite(saved)) volumes[group] = Math.max(0, Math.min(1, saved));
    }

    function configureSession() {
        try {
            if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
        } catch { /* Unsupported audio session APIs must not interrupt gameplay. */ }
    }

    function ensureContext() {
        if (!AudioContextClass || !design) return null;
        configureSession(); // Keep the iPhone Silent Mode fix from 0.0.107.
        try {
            if (!context) {
                context = new AudioContextClass();
                master = context.createGain();
                master.gain.value = 0.62;
                let destination = context.destination;
                if (typeof context.createDynamicsCompressor === 'function') {
                    const limiter = context.createDynamicsCompressor();
                    limiter.threshold.value = -16;
                    limiter.knee.value = 10;
                    limiter.ratio.value = 3;
                    limiter.attack.value = 0.004;
                    limiter.release.value = 0.25;
                    limiter.connect(destination);
                    destination = limiter;
                }
                master.connect(destination);
                buses = {};
                for (const group of Object.keys(volumes)) {
                    buses[group] = context.createGain();
                    buses[group].gain.value = volumes[group];
                    buses[group].connect(master);
                }
            }
            if (context.state !== 'running' && context.state !== 'closed') void context.resume().catch(() => {});
            return context;
        } catch (error) {
            console.warn('WyrmForge audio unavailable.', error);
            return null;
        }
    }

    function unlock() {
        if (!enabled) return;
        unlocked = true;
        ensureContext();
        syncMusic();
    }


    // Files are imported, verified and committed by tools/audio/import_licensed_audio.py.
    // No hotlinking to third-party media. Manifest absence is silent rather than playing the rejected synthesizer.
    const assetUrl = name => new URL('audio/recorded/' + name, document.baseURI).href;

    function loadManifest() {
        if (typeof fetch !== 'function' || !document.baseURI) return;
        void fetch(assetUrl('manifest.json')).then(response => {
            if (!response.ok) throw new Error('Recorded audio pack unavailable: ' + response.status);
            return response.json();
        }).then(manifest => {
            if (!manifest.cues?.arcane || !manifest.cues?.fire || !manifest.cues?.frost || !manifest.cues?.lightning ||
                !manifest.music?.menu || !manifest.music?.hunt) throw new Error('Incomplete recorded fantasy audio manifest');
            recordedManifest = manifest;
            if (status) status.textContent = 'RECORDED AUDIO READY';
            syncMusic();
        }).catch(error => {
            console.warn('Recorded WyrmForge audio not yet installed:', error);
            if (status) status.textContent = 'RECORDED AUDIO UNAVAILABLE';
        });
    }

    function loadRecordedBuffer(name) {
        if (recordedBuffers.has(name)) return recordedBuffers.get(name);
        const entry = recordedManifest?.cues?.[name];
        if (!entry || !context) return Promise.reject(new Error('Unmapped recorded sound: ' + name));
        const pending = fetch(assetUrl(entry.file)).then(response => {
            if (!response.ok) throw new Error('Recorded sound unavailable: ' + name + ' (' + response.status + ')');
            return response.arrayBuffer();
        }).then(bytes => context.decodeAudioData(bytes));
        recordedBuffers.set(name, pending);
        pending.catch(() => recordedBuffers.delete(name));
        return pending;
    }

    function playRecorded(name, sound, preview, now) {
        const bus = sound.bus;
        if (voices[bus] >= maxVoices[bus]) return false;
        lastCue.set(name, now);
        const variant = (variants.get(name) ?? 0) % 3;
        variants.set(name, (variants.get(name) ?? 0) + 1);
        void loadRecordedBuffer(name).then(buffer => {
            if (!enabled || !context || context.state === 'closed' || voices[bus] >= maxVoices[bus]) return;
            const source = context.createBufferSource();
            const gain = context.createGain();
            source.buffer = buffer;
            source.playbackRate.value = [0.977, 1, 1.019][variant];
            gain.gain.value = sound.volume;
            source.connect(gain);
            gain.connect(buses[bus]);
            voices[bus]++;
            source.onended = () => {
                voices[bus] = Math.max(0, voices[bus] - 1);
                source.disconnect();
                gain.disconnect();
            };
            if (bus === 'moment') {
                const parameter = buses.combat.gain, t = context.currentTime;
                if (parameter.setTargetAtTime) {
                    parameter.cancelScheduledValues(t);
                    parameter.setTargetAtTime(volumes.combat * 0.40, t, 0.035);
                    parameter.setTargetAtTime(volumes.combat, t + Math.max(0.4, buffer.duration * 0.55), 0.16);
                }
            }
            source.start();
        }).catch(error => {
            console.warn('Recorded WyrmForge cue could not load:', name, error);
            if (status) status.textContent = 'SOUND COULD NOT LOAD: ' + name.toUpperCase();
        });
        return true;
    }

    function musicPlayer(kind) {
        if (musicPlayers.has(kind)) return musicPlayers.get(kind);
        if (typeof window.Audio !== 'function' || !recordedManifest?.music?.[kind]) return null;
        const player = new window.Audio(assetUrl(recordedManifest.music[kind]));
        player.preload = 'none';
        player.loop = true;
        player.volume = 0;
        musicPlayers.set(kind, player);
        return player;
    }

    function stopMusic() {
        fadeGeneration++;
        for (const player of musicPlayers.values()) {
            player.pause();
            player.volume = 0;
        }
        currentMusic = null;
    }

    function syncMusic() {
        if (!recordedManifest || !enabled || !unlocked || typeof window.Audio !== 'function') {
            if (currentMusic && !enabled) stopMusic();
            return;
        }
        const desired = document.querySelector?.('.game-screen') ? 'hunt' : 'menu';
        if (currentMusic === desired) return;
        const next = musicPlayer(desired);
        if (!next) return;
        const previous = currentMusic ? musicPlayer(currentMusic) : null;
        currentMusic = desired;
        const generation = ++fadeGeneration;
        const started = performance.now();
        // Start new media from an already unlocked context; rejected autoplay is retried on the next gesture.
        void next.play().catch(error => {
            currentMusic = null;
            console.debug('Music awaits user interaction:', error);
        });
        function fade(now) {
            if (generation !== fadeGeneration || !enabled) return;
            const progress = Math.max(0, Math.min(1, (now - started) / 5000));
            const musicLevel = volumes.music * 0.52;
            next.volume = Math.min(1, musicLevel * Math.sin(progress * Math.PI / 2));
            if (previous) previous.volume = Math.min(1, musicLevel * Math.cos(progress * Math.PI / 2));
            if (progress < 1) {
                window.requestAnimationFrame(fade);
            } else if (previous && previous !== next) {
                previous.pause();
                previous.volume = 0;
                previous.currentTime = 0;
            }
        }
        if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(fade);
        else next.volume = volumes.music * 0.52;
    }

    function observeMusicState() {
        if (typeof MutationObserver !== 'function' || !document.body) return;
        const observer = new MutationObserver(() => {
            if (!recordedManifest || !unlocked || !enabled) return;
            const desired = document.querySelector?.('.game-screen') ? 'hunt' : 'menu';
            if (desired !== currentMusic) syncMusic();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function bufferFor(name, variant) {
        const key = `${name}:${variant}`;
        if (buffers.has(key)) return buffers.get(key);
        const pcm = design.render(name, variant, context.sampleRate);
        const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
        buffer.copyToChannel(pcm, 0);
        buffers.set(key, buffer);
        return buffer;
    }

    function play(name, preview = false) {
        if (!enabled || !design?.palette[name]) return false;
        if (!unlocked && !preview) return false;
        const ctx = ensureContext();
        if (!ctx || ctx.state === 'closed') return false;
        const sound = design.palette[name];
        const now = performance.now();
        if (!preview && now - (lastCue.get(name) ?? -Infinity) < sound.cooldown) return false;
        if (recordedManifest) {
            if (!recordedManifest.cues[name]) return false;
            return playRecorded(name, sound, preview, now);
        }
        if (typeof fetch === 'function') return false; // Never play synthetic fallback in the real browser.
        if (voices[sound.bus] >= maxVoices[sound.bus]) {
            // Never let extra effects raise the peak; important moments may replace a less important voice.
            const active = activeVoices[sound.bus];
            const lowest = active.reduce((candidate, item) => !candidate || item.priority < candidate.priority ? item : candidate, null);
            if (!lowest || lowest.priority >= sound.priority) return false;
            try { lowest.source.stop(); } catch { /* Already stopped. */ }
            lowest.release();
        }

        try {
            const count = variants.get(name) ?? 0;
            const variant = count % 3;
            const source = ctx.createBufferSource();
            source.buffer = bufferFor(name, variant);
            source.playbackRate.value = [0.986, 1, 1.014][variant];
            const gain = ctx.createGain();
            const bus = buses[sound.bus];
            gain.gain.value = sound.volume;
            source.connect(gain);
            gain.connect(bus);
            let released = false;
            const voice = {
                source,
                priority: sound.priority,
                release() {
                    if (released) return;
                    released = true;
                    voices[sound.bus] = Math.max(0, voices[sound.bus] - 1);
                    const index = activeVoices[sound.bus].indexOf(voice);
                    if (index !== -1) activeVoices[sound.bus].splice(index, 1);
                    source.disconnect();
                    gain.disconnect();
                },
            };
            source.onended = voice.release;

            if (sound.bus === 'moment') {
                const at = ctx.currentTime;
                const combatGain = buses.combat.gain;
                if (typeof combatGain.setTargetAtTime === 'function') {
                    combatGain.cancelScheduledValues(at);
                    combatGain.setTargetAtTime(volumes.combat * 0.38, at, 0.035);
                    combatGain.setTargetAtTime(volumes.combat, at + Math.max(0.25, sound.duration * 0.62), 0.15);
                }
            }

            source.start();
            voices[sound.bus]++;
            activeVoices[sound.bus].push(voice);
            variants.set(name, count + 1);
            lastCue.set(name, now);
            return true;
        } catch (error) {
            console.warn('WyrmForge sound cue failed:', name, error);
            return false; // Gameplay must remain independent from sound.
        }
    }

    function updateVolume(group, value) {
        if (!Object.hasOwn(volumes, group)) return;
        const next = Math.max(0, Math.min(1, Number(value) || 0));
        volumes[group] = next;
        savePreference(volumeKeys[group], next);
        if (group === 'music') {
            if (currentMusic) {
                const player = musicPlayers.get(currentMusic);
                if (player) player.volume = next * 0.52;
            }
            return;
        }
        if (buses) {
            const parameter = buses[group].gain;
            if (context.state === 'running' && typeof parameter.setTargetAtTime === 'function') {
                parameter.setTargetAtTime(next, context.currentTime, 0.015);
            } else {
                parameter.value = next;
            }
        }
    }

    function sync() {
        if (toggleButton) {
            toggleButton.textContent = enabled ? '♫ SFX ON' : '♪ SFX OFF';
            toggleButton.setAttribute('aria-label', enabled ? 'Mute game sound effects' : 'Enable game sound effects');
            toggleButton.setAttribute('aria-pressed', String(enabled));
            toggleButton.title = enabled ? 'Mute sound effects' : 'Enable sound effects';
        }
        if (testButton) testButton.disabled = !enabled;
    }

    function setEnabled(value) {
        enabled = Boolean(value);
        savePreference(savedEnabledKey, enabled);
        sync();
        if (enabled) {
            unlock();
            play('ui', true);
        } else {
            stopMusic();
        }
        if (status) status.textContent = enabled ? '' : 'SFX MUTED';
        return enabled;
    }

    function testSound() {
        if (!enabled) setEnabled(true);
        unlock(); // A direct click creates/resumes the audio session before scheduling the sample.
        const sent = play('upgrade-choice', true);
        if (status) status.textContent = sent ? 'PLAYING RECORDED FANTASY…' : 'RECORDED AUDIO LOADING';
        window.clearTimeout(statusTimer);
        statusTimer = window.setTimeout(() => {
            const session = navigator.audioSession?.type ?? 'browser default';
            if (status) status.textContent = `${context?.state === 'running' ? 'AUDIO TEST SENT' : 'AUDIO ' + (context?.state ?? 'UNAVAILABLE').toUpperCase()} · ${session}`;
        }, 650);
    }

    function makeButton(text, className, ariaLabel, action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = text;
        button.setAttribute('aria-label', ariaLabel);
        button.addEventListener('click', action);
        return button;
    }

    function makeVolumeControl(group, label) {
        const row = document.createElement('label');
        row.className = 'wyrmforge-sound-volume';
        const title = document.createElement('span');
        title.textContent = label;
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '100';
        input.step = '5';
        input.value = String(Math.round(volumes[group] * 100));
        input.setAttribute('aria-label', `${label} volume`);
        const value = document.createElement('output');
        value.textContent = input.value + '%';
        input.addEventListener('input', () => {
            updateVolume(group, Number(input.value) / 100);
            value.textContent = input.value + '%';
        });
        row.append(title, input, value);
        return row;
    }

    function toggleLab() {
        if (!lab) return;
        const open = lab.hidden;
        lab.hidden = !open;
        labButton?.setAttribute('aria-expanded', String(open));
        if (open) {
            unlock();
            lab.querySelector('button')?.focus();
        } else {
            labButton?.focus();
        }
    }

    function mountControls() {
        if (toggleButton || !document.body) return;
        const controls = document.createElement('div');
        controls.className = 'wyrmforge-sound-controls';
        controls.setAttribute('aria-label', 'Sound effects controls');

        lab = document.createElement('section');
        lab.className = 'wyrmforge-sound-lab';
        lab.hidden = true;
        lab.setAttribute('role', 'dialog');
        lab.setAttribute('aria-label', 'Sound Atelier');
        const heading = document.createElement('h3');
        heading.textContent = 'SOUND ATELIER';
        const desc = document.createElement('p');
        desc.textContent = 'Recorded dark fantasy · human-made spell effects and music';
        const samples = document.createElement('div');
        samples.className = 'wyrmforge-sound-samples';
        for (const name of design?.previewNames ?? []) {
            const item = makeButton(design.palette[name].label, 'wyrmforge-sound-sample', `Preview ${name} sound`, () => {
                unlock();
                play(name, true);
            });
            samples.appendChild(item);
        }
        const levels = document.createElement('div');
        levels.className = 'wyrmforge-sound-levels';
        levels.append(makeVolumeControl('ui', 'Interface'), makeVolumeControl('combat', 'Combat'), makeVolumeControl('moment', 'Moments'), makeVolumeControl('music', 'Music'));
        const close = makeButton('CLOSE', 'wyrmforge-sound-close', 'Close Sound Atelier', toggleLab);
        const credit = document.createElement('p');
        credit.textContent = 'Recorded music: Brandon Morris (CC0). Spell effects: JC Sounds (CC BY 4.0) and rubberduck (CC0).';
        const creditLink = document.createElement('a');
        creditLink.textContent = 'Asset credits & licenses';
        creditLink.href = 'https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1';
        creditLink.target = '_blank';
        creditLink.rel = 'noopener noreferrer';
        credit.append(' ', creditLink);
        lab.append(heading, desc, samples, levels, credit, close);

        status = document.createElement('span');
        status.className = 'wyrmforge-sound-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        testButton = makeButton('TEST ♪', 'wyrmforge-sound-test', 'Play sound test', testSound);
        labButton = makeButton('SOUNDS', 'wyrmforge-sound-lab-toggle', 'Open Sound Atelier', toggleLab);
        labButton.setAttribute('aria-expanded', 'false');
        toggleButton = makeButton('', 'wyrmforge-sound-toggle', 'Mute game sound effects', () => setEnabled(!enabled));
        sync();
        controls.append(lab, status, labButton, testButton, toggleButton);
        document.body.appendChild(controls);
        observeMusicState();
        loadManifest();
    }

    document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    document.addEventListener('touchend', unlock, { capture: true, passive: true });
    document.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            for (const track of musicPlayers.values()) track.pause();
            currentMusic = null;
        } else if (enabled) {
            if (context) ensureContext();
            syncMusic();
        }
    });
    document.addEventListener('click', event => {
        if (!event.target?.closest || document.querySelector('.game-screen')) return;
        if (event.target.closest('button:not(.wyrmforge-sound-toggle):not(.wyrmforge-sound-test):not(.wyrmforge-sound-lab-toggle):not(.wyrmforge-sound-sample):not(.wyrmforge-sound-close)')) {
            play('ui');
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && lab && !lab.hidden) toggleLab();
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountControls, { once: true });
    else mountControls();

    window.wyrmforgeAudio = {
        play, setEnabled, testSound, isEnabled: () => enabled, updateVolume,
        diagnostics: () => ({ enabled, state: context?.state ?? 'uninitialized', session: navigator.audioSession?.type ?? 'unsupported',
            identity: recordedManifest ? 'Recorded Dark Fantasy' : 'recordings-loading', music: currentMusic, recorded: Boolean(recordedManifest), voices: { ...voices } }),
    };
})();
