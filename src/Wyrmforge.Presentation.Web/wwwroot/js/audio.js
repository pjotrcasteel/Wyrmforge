// WyrmForge audio runtime — sample playback, mix priorities and a small main-menu Sound Atelier.
// No synthesis on the animation/gameplay hot path. Sound identity lives in sound-design.js.
(() => {
    const design = window.WyrmforgeSoundDesign;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const savedEnabledKey = 'wyrmforge.audio.enabled.v1';
    const volumeKeys = { ui: 'wyrmforge.audio.ui.v1', combat: 'wyrmforge.audio.combat.v1', moment: 'wyrmforge.audio.moment.v1', music: 'wyrmforge.audio.music.v1' };
    const volumes = { ui: 0.32, combat: 0.36, moment: 0.69, music: 0.66 };
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
    let recentSpell = null;
    const spellSchools = new Set(['arcane', 'fire', 'frost', 'lightning']);

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
        prewarmTransitions();
        startMusicFromGesture();
        syncMusic();
    }


    // Files are imported, verified and committed by tools/audio/import_licensed_audio.py.
    // No hotlinking to third-party media. Manifest absence is silent rather than playing the rejected synthesizer.
    // audio.js is already loaded with a commit-specific ?v= token on GitHub Pages.
    // Reuse that token for the manifest and media files so iOS Safari never serves a
    // stale sound mapping after deployments, without disabling useful asset caching.
    const audioRevision = (() => {
        try {
            const src = document.currentScript?.src;
            return src ? new URL(src).searchParams.get('v') || '0.0.111' : '0.0.111';
        } catch {
            return '0.0.111';
        }
    })();
    const assetUrl = name => {
        const url = new URL('audio/recorded/' + name, document.baseURI);
        url.searchParams.set('v', audioRevision);
        return url.href;
    };

    function loadManifest() {
        if (typeof fetch !== 'function' || !document.baseURI) return;
        void fetch(assetUrl('manifest.json')).then(response => {
            if (!response.ok) throw new Error('Recorded audio pack unavailable: ' + response.status);
            return response.json();
        }).then(manifest => {
            if (manifest.version !== 2 || !manifest.cues?.arcane?.variants?.length || !manifest.cues?.fire?.variants?.length || !manifest.cues?.frost?.variants?.length || !manifest.cues?.lightning?.variants?.length ||
                !manifest.music?.menu || !manifest.music?.hunt) throw new Error('Incomplete recorded fantasy audio manifest');
            recordedManifest = manifest;
            prewarmTransitions();
            if (status) status.textContent = 'RECORDED AUDIO READY';
            startMusicFromGesture(); // May be blocked outside a gesture; the next tap retries both tracks.
            syncMusic();
        }).catch(error => {
            console.warn('Recorded WyrmForge audio not yet installed:', error);
            if (status) status.textContent = 'RECORDED AUDIO UNAVAILABLE';
        });
    }


    // Cache decoded recordings by filename. Variations are different human-performed attacks, not
    // a single repeated WAV shifted by a few cents. The game remains operational if loading fails.
    function loadRecordedBuffer(entry) {
        if (recordedBuffers.has(entry.file)) return recordedBuffers.get(entry.file);
        if (!entry?.file || !context) return Promise.reject(new Error('Recorded sound file is missing'));
        const pending = fetch(assetUrl(entry.file)).then(response => {
            if (!response.ok) throw new Error('Recorded sound unavailable: ' + entry.file + ' (' + response.status + ')');
            return response.arrayBuffer();
        }).then(bytes => context.decodeAudioData(bytes));
        recordedBuffers.set(entry.file, pending);
        pending.catch(() => recordedBuffers.delete(entry.file));
        return pending;
    }

    // These shared semantic events can be implemented by a Web Audio or future native mobile adapter.
    // Preload compact, often-used transitions; never block navigation if a recording is unavailable.
    function prewarmTransitions() {
        if (!recordedManifest || !context || !enabled) return;
        for (const name of ['building-open', 'hunt-start', 'trail-enter', 'threat-reveal']) {
            const cue = recordedManifest.cues?.[name];
            for (const entry of cue ? [cue, ...(cue.layers ?? [])] : []) {
                void loadRecordedBuffer(entry).catch(() => {});
            }
        }
    }

    function recordedEntry(name, type, variation) {
        const definition = recordedManifest?.cues?.[name];
        if (!definition) return null;
        const clips = type === 'hit' ? definition.hitVariants : definition.variants;
        if (type === 'buildup') return definition.buildup ?? null;
        return clips?.length ? clips[variation % clips.length] : (type === 'cast' ? definition : null);
    }

    function playRecordedEntry(entry, sound, name, variation, gainScale = 1, delay = 0) {
        if (!entry || !enabled || !context) return false;
        const bus = sound.bus;
        // Hard limit on simultaneous sounds; the music soundtrack is independent of these limits.
        if (voices[bus] >= maxVoices[bus]) return false;
        void loadRecordedBuffer(entry).then(buffer => {
            if (!enabled || !context || context.state === 'closed' || voices[bus] >= maxVoices[bus]) return;
            const source = context.createBufferSource();
            const gain = context.createGain();
            source.buffer = buffer;
            source.playbackRate.value = [0.99, 1, 1.01][variation % 3];
            const mix = entry.mix;
            const level = Math.min(0.7, sound.volume * gainScale * (mix?.gain ?? 1));
            const at = context.currentTime + delay;
            const duration = buffer.duration / source.playbackRate.value;
            const naturalTail = Math.min(bus === 'ui' ? 0.12 : bus === 'moment' ? 0.54 : 0.24, duration * 0.48);
            const tail = Math.min(mix?.releaseSeconds ?? naturalTail, duration * 0.70);
            const attack = Math.min(mix?.attackSeconds ?? 0.018, duration * 0.12);
            // Never stop a menu, reward or magical cue with a hard gain edge.
            if (gain.gain.setValueAtTime && gain.gain.linearRampToValueAtTime) {
                gain.gain.setValueAtTime(0.0001, at);
                gain.gain.linearRampToValueAtTime(level, at + attack);
                gain.gain.setValueAtTime(level, Math.max(at + attack, at + duration - tail));
                gain.gain.linearRampToValueAtTime(0.0001, at + duration);
            } else {
                gain.gain.value = level;
            }
            source.connect(gain);
            let filter = null;
            if (mix?.lowpassHz && typeof context.createBiquadFilter === 'function') {
                // Reward cues should sound warm, not like shrill alerts. Other combat SFX stay unchanged.
                filter = context.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = mix.lowpassHz;
                filter.Q.value = 0.65;
                gain.connect(filter);
                filter.connect(buses[bus]);
            } else {
                gain.connect(buses[bus]);
            }
            voices[bus]++;
            source.onended = () => {
                voices[bus] = Math.max(0, voices[bus] - 1);
                source.disconnect();
                gain.disconnect();
                filter?.disconnect();
            };
            if (bus === 'moment') {
                const parameter = buses.combat.gain;
                if (parameter.setTargetAtTime) {
                    parameter.cancelScheduledValues(at);
                    parameter.setTargetAtTime(volumes.combat * 0.56, at, 0.055);
                    parameter.setTargetAtTime(volumes.combat, at + Math.max(0.4, duration * 0.67), 0.20);
                }
            }
            source.start(at);
        }).catch(error => {
            console.warn('Recorded WyrmForge cue could not load:', name, error);
            if (status) status.textContent = 'SOUND COULD NOT LOAD: ' + name.toUpperCase();
        });
        return true;
    }

    function playSpellImpact(school, preview = false) {
        const options = recordedManifest?.cues?.[school]?.hitVariants;
        if (!options?.length) return false;
        const count = variants.get(school + '-hit') ?? 0;
        variants.set(school + '-hit', count + 1);
        const sound = design.palette.impact;
        return playRecordedEntry(options[count % options.length], sound, school + '-hit', count, preview ? 0.62 : 0.53);
    }

    function playRecorded(name, sound, preview, now) {
        const count = variants.get(name) ?? 0;
        const isSpell = spellSchools.has(name);
        if (name === 'impact' && recentSpell && now - recentSpell.at < 1250 &&
            playSpellImpact(recentSpell.name, preview)) {
            lastCue.set(name, now);
            return true;
        }
        const entry = recordedEntry(name, 'cast', count);
        if (!entry) return false;
        if (!playRecordedEntry(entry, sound, name, count, isSpell ? 0.72 : 1)) return false;
        // The departure gesture is one semantic event made from physical sound layers.
        // Distinct delay and gain profiles are declared in the portable manifest.
        if (entry.layers?.length) {
            for (const layer of entry.layers) {
                playRecordedEntry(layer, sound, name + '-layer', count, layer.gainScale ?? 1, layer.delaySeconds ?? 0);
            }
        }
        variants.set(name, count + 1);
        lastCue.set(name, now);
        if (isSpell) {
            if (!preview) recentSpell = { name, at: now };
            if (!preview && count % 7 === 0) {
                const buildup = recordedEntry(name, 'buildup', count);
                if (buildup) playRecordedEntry(buildup, sound, name + '-buildup', count, 0.13);
            }
            if (preview && typeof window.setTimeout === 'function') {
                window.setTimeout(() => playSpellImpact(name, true), 230);
            }
        }
        return true;
    }

    // Both source elements begin inside one real user gesture and remain playing at zero gain
    // when off-screen. iOS Safari cannot reliably start the next track in a later async
    // MutationObserver or Promise callback. The shared Web Audio mixer owns the fades.
    function musicTrack(kind) {
        if (musicPlayers.has(kind)) return musicPlayers.get(kind);
        if (!recordedManifest?.music?.[kind] || typeof window.Audio !== 'function' || !context) return null;
        const player = new window.Audio(assetUrl(recordedManifest.music[kind]));
        player.loop = true;
        player.preload = 'auto';
        let gain = null;
        if (typeof context.createMediaElementSource === 'function') {
            const source = context.createMediaElementSource(player);
            gain = context.createGain();
            gain.gain.value = 0;
            source.connect(gain);
            gain.connect(buses.music);
            player.volume = 1; // Safari ignores or limits HTMLAudioElement.volume. Web Audio gain is authoritative.
        } else {
            player.volume = 0;
        }
        const track = { kind, player, gain, level: 0, starting: false };
        musicPlayers.set(kind, track);
        return track;
    }

    function setMusicLevel(track, value) {
        if (!track) return;
        const level = Math.max(0, Math.min(1, value));
        track.level = level;
        if (track.gain) {
            track.gain.gain.value = level * 0.82;
        } else {
            track.player.volume = level * volumes.music * 0.82;
        }
    }

    function musicIsPlaying(kind) {
        const track = musicPlayers.get(kind);
        return Boolean(track && !track.player.paused);
    }

    function startMusicFromGesture() {
        if (!recordedManifest || !enabled || !context || !unlocked || document.hidden) return;
        for (const kind of ['menu', 'hunt']) {
            const track = musicTrack(kind);
            if (!track || !track.player.paused || track.starting) continue;
            track.starting = true;
            // IMPORTANT: call HTMLMediaElement.play() synchronously within pointerdown/keydown.
            // Do not await a file fetch or media loading before this call.
            try {
                const result = track.player.play();
                Promise.resolve(result).then(() => {
                    track.starting = false;
                    syncMusic();
                }).catch(error => {
                    track.starting = false;
                    console.debug('WyrmForge music awaits another user gesture', error);
                });
            } catch (error) {
                track.starting = false;
                console.debug('WyrmForge music activation unavailable', error);
            }
        }
    }

    function fadeMusicOut(duration = 500) {
        const generation = ++fadeGeneration;
        const tracks = [...musicPlayers.values()];
        const from = tracks.map(t => t.level);
        const started = performance.now();
        const frame = now => {
            if (generation !== fadeGeneration) return;
            const fraction = Math.max(0, Math.min(1, (now - started) / duration));
            for (let i = 0; i < tracks.length; i++) setMusicLevel(tracks[i], from[i] * (1 - fraction));
            if (fraction < 1 && typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(frame);
            } else {
                for (const track of tracks) track.player.pause();
                currentMusic = null;
            }
        };
        if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(frame);
        else {
            for (const track of tracks) {
                setMusicLevel(track, 0);
                track.player.pause();
            }
            currentMusic = null;
        }
    }

    function syncMusic() {
        if (!recordedManifest || !enabled || !unlocked || document.hidden || !context) return;
        const desired = document.querySelector?.('.game-screen') ? 'hunt' : 'menu';
        if (desired === currentMusic && musicIsPlaying(desired)) return;
        const previous = currentMusic;
        currentMusic = desired;
        const generation = ++fadeGeneration;
        const started = performance.now();
        const menu = musicTrack('menu'), hunt = musicTrack('hunt');
        if (!menu || !hunt) return;
        const tracks = [menu, hunt];
        const initial = tracks.map(t => t.level);
        const targets = [desired === 'menu' ? 1 : 0, desired === 'hunt' ? 1 : 0];
        // Five-second equal-power crossfade, with a shorter recovery from browser suspension.
        const duration = previous === null ? 1800 : 4800;
        const frame = now => {
            if (generation !== fadeGeneration || !enabled || document.hidden) return;
            const u = Math.max(0, Math.min(1, (now - started) / duration));
            const eased = u * u * (3 - 2 * u);
            tracks.forEach((track, i) => setMusicLevel(track, initial[i] + (targets[i] - initial[i]) * eased));
            if (u < 1 && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(frame);
        };
        if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(frame);
        else tracks.forEach((track, i) => setMusicLevel(track, targets[i]));
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
            if (buses?.music) buses.music.gain.value = next;
            for (const track of musicPlayers.values()) if (!track.gain) setMusicLevel(track, track.level);
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
            fadeMusicOut(420);
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
        desc.textContent = 'Recorded dark fantasy · layered spells, natural tails and a continuous soundtrack';
        const samples = document.createElement('div');
        samples.className = 'wyrmforge-sound-samples';
        for (const name of design?.previewNames ?? []) {
            const item = makeButton(design.palette[name].label, 'wyrmforge-sound-sample', `Preview ${name} sound`, () => {
                unlock();
                play(name, true);
            });
            samples.appendChild(item);
        }
        const hearMusic = makeButton('HEAR SOUNDTRACK', 'wyrmforge-sound-close', 'Start and preview soundtrack', () => {
            unlock();
            startMusicFromGesture();
            syncMusic();
            if (status) status.textContent = musicIsPlaying(currentMusic ?? 'menu') ? 'SOUNDTRACK PLAYING' : 'SOUNDTRACK STARTING…';
        });
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
        lab.append(heading, desc, hearMusic, samples, levels, credit, close);

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
        // Keep the audio UI attached to the actual Settings screen. On navigation
        // away Blazor removes that screen, so restore the controls to the body
        // (hidden there) and reattach on the next Settings visit.
        const app = document.getElementById('app') ?? document.body;
        const placeInSettings = () => {
            const host = app.querySelector('.settings-audio-slot');
            if (host) {
                if (controls.parentElement !== host) host.appendChild(controls);
            } else if (controls.parentElement !== document.body) {
                document.body.appendChild(controls);
                lab.hidden = true;
                labButton?.setAttribute('aria-expanded', 'false');
            }
        };
        const observer = new MutationObserver(placeInSettings);
        observer.observe(app, { childList: true, subtree: true });
        placeInSettings();
        observeMusicState();
        loadManifest();
    }

    document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    document.addEventListener('touchend', unlock, { capture: true, passive: true });
    document.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            for (const track of musicPlayers.values()) track.player.pause();
            fadeGeneration++;
            currentMusic = null;
        } else if (enabled) {
            if (context) ensureContext();
            // A new direct tap may be required by iOS following suspension.
            syncMusic();
        }
    });
    document.addEventListener('click', event => {
        if (!event.target?.closest || document.querySelector('.game-screen')) return;
        const button = event.target.closest('button');
        if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
        if (button.closest('.wyrmforge-sound-controls') || button.getAttribute('data-sound-cue') === 'none') return;
        // Hunt entry already emits 'hunt-start' from Blazor. Never stack an unrelated menu click on it.
        if (button.matches('.town-door--gate, .enter-realm, .gate-cta')) return;
        const cue = button.getAttribute('data-sound-cue');
        play(cue && design?.palette[cue] ? cue : 'ui');
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && lab && !lab.hidden) toggleLab();
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountControls, { once: true });
    else mountControls();

    window.wyrmforgeAudio = {
        play, setEnabled, testSound, isEnabled: () => enabled, updateVolume,
        diagnostics: () => ({ enabled, state: context?.state ?? 'uninitialized', session: navigator.audioSession?.type ?? 'unsupported',
            identity: recordedManifest ? 'Recorded Dark Fantasy' : 'recordings-loading', audioRevision, music: currentMusic,
            musicPlaying: currentMusic ? musicIsPlaying(currentMusic) : false, musicTracks: [...musicPlayers.values()].map(track => ({ kind: track.kind, paused: track.player.paused, level: track.level })),
            recorded: Boolean(recordedManifest), voices: { ...voices } }),
    };
})();
