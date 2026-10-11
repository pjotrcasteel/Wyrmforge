// WyrmForge audio runtime — sample playback, mix priorities and a small main-menu Sound Atelier.
// No synthesis on the animation/gameplay hot path. Sound identity lives in sound-design.js.
(() => {
    const design = window.WyrmforgeSoundDesign;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const savedEnabledKey = 'wyrmforge.audio.enabled.v1';
    const volumeKeys = { ui: 'wyrmforge.audio.ui.v1', combat: 'wyrmforge.audio.combat.v1', moment: 'wyrmforge.audio.moment.v1' };
    const volumes = { ui: 0.44, combat: 0.56, moment: 0.82 };
    const lastCue = new Map();
    const variants = new Map();
    const buffers = new Map();
    const voices = { ui: 0, combat: 0, moment: 0 };
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
        if (voices[sound.bus] >= maxVoices[sound.bus] && sound.priority < 3) return false;

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
            source.onended = () => {
                voices[sound.bus] = Math.max(0, voices[sound.bus] - 1);
                source.disconnect();
                gain.disconnect();
            };

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
        }
        if (status) status.textContent = enabled ? '' : 'SFX MUTED';
        return enabled;
    }

    function testSound() {
        if (!enabled) setEnabled(true);
        unlock(); // A direct click creates/resumes the audio session before scheduling the sample.
        const sent = play('upgrade-choice', true);
        if (status) status.textContent = sent ? 'PLAYING ANCIENT RESONANCE…' : 'AUDIO UNAVAILABLE';
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
        desc.textContent = 'Ancient Resonance · V1  —  preview the Wyrmrealm';
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
        levels.append(makeVolumeControl('ui', 'Interface'), makeVolumeControl('combat', 'Combat'), makeVolumeControl('moment', 'Moments'));
        const close = makeButton('CLOSE', 'wyrmforge-sound-close', 'Close Sound Atelier', toggleLab);
        lab.append(heading, desc, samples, levels, close);

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
    }

    document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    document.addEventListener('touchend', unlock, { capture: true, passive: true });
    document.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && enabled && context) ensureContext();
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
            identity: design?.identity ?? 'unavailable', voices: { ...voices } }),
    };
})();
