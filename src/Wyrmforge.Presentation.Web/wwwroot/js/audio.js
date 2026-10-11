// WyrmForge prototype audio. Original Web Audio synthesis: no binary downloads, attribution or game-state coupling.
(() => {
    const preferenceKey = 'wyrmforge.audio.enabled.v1';
    const cooldowns = new Map();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let enabled = true;
    let context = null;
    let master = null;
    let noiseBuffer = null;
    let voices = 0;
    let button = null;
    let testButton = null;
    let testStatus = null;
    let diagnosticTimer = 0;
    try { enabled = window.localStorage.getItem(preferenceKey) !== 'false'; } catch { /* Private mode. */ }

    // iOS Safari's default ambient Web Audio session is inaudible while the iPhone is in Silent Mode.
    // Ask for media playback explicitly before creating/resuming the context (WebKit 237322).
    function configureAudioSession() {
        try {
            if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
        } catch { /* Experimental browser API; continue with ordinary audio on unsupported browsers. */ }
    }

    function ready() {
        if (!enabled || !AudioContextClass) return null;
        configureAudioSession();
        try {
            if (!context) {
                context = new AudioContextClass();
                master = context.createGain();
                master.gain.value = 0.50;
                master.connect(context.destination);
            }
            if (context.state !== 'running' && context.state !== 'closed') void context.resume().catch(() => {});
            return context;
        } catch {
            return null;
        }
    }

    function unlock() { if (enabled) ready(); }

    function reportAudioStatus(message) {
        if (testStatus) testStatus.textContent = message;
    }

    function testSound() {
        if (!enabled) setEnabled(true);
        const ctx = ready(); // Still inside the trusted click event on iOS.
        if (!ctx) {
            reportAudioStatus('AUDIO UNAVAILABLE');
            return;
        }
        // Schedule directly while the click has browser activation. Suspended contexts retain these notes until resumed.
        // This is deliberately louder and longer than an in-game click so it is easy to verify on phone speakers.
        note(523.25, 523.25, 0.38, 'sine', 0.65);
        note(783.99, 783.99, 0.46, 'sine', 0.52, 0.18);
        reportAudioStatus('CHECKING AUDIO…');
        window.clearTimeout(diagnosticTimer);
        diagnosticTimer = window.setTimeout(() => {
            const mode = navigator.audioSession?.type ?? 'browser default';
            reportAudioStatus(ctx.state === 'running' ? `TEST SENT · ${mode}` : `AUDIO ${ctx.state.toUpperCase()} · ${mode}`);
        }, 700);
    }

    function withSource(source, destination, start, duration) {
        if (voices >= 18) return;
        voices++;
        source.connect(destination);
        source.onended = () => {
            voices = Math.max(0, voices - 1);
            source.disconnect();
            destination.disconnect();
        };
        source.start(start);
        source.stop(start + duration + 0.03);
    }

    function note(startHz, endHz, duration, wave = 'sine', loudness = 0.25, delay = 0) {
        const ctx = context;
        if (!ctx || voices >= 18) return;
        const start = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const envelope = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(Math.max(20, startHz), start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), start + duration);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, loudness), start + Math.min(0.018, duration * 0.25));
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        envelope.connect(master);
        withSource(osc, envelope, start, duration);
    }

    function noise(duration, cutoff = 900, loudness = 0.16, delay = 0) {
        const ctx = context;
        if (!ctx || voices >= 18) return;
        if (!noiseBuffer) {
            noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.6), ctx.sampleRate);
            const values = noiseBuffer.getChannelData(0);
            for (let i = 0; i < values.length; i++) values[i] = Math.random() * 2 - 1;
        }
        const start = ctx.currentTime + delay;
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = cutoff;
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(loudness, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        filter.connect(envelope);
        envelope.connect(master);
        withSource(source, filter, start, duration);
    }

    const effects = {
        ui() { note(710, 560, 0.055, 'sine', 0.18); },
        'hunt-start'() {
            note(130, 85, 0.48, 'triangle', 0.32);
            note(330, 440, 0.26, 'sine', 0.2, 0.12);
            noise(0.35, 320, 0.11);
        },
        arcane() {
            note(610, 255, 0.14, 'sine', 0.18);
            note(920, 480, 0.09, 'triangle', 0.09);
        },
        fire() {
            noise(0.16, 1900, 0.18);
            note(215, 85, 0.17, 'sawtooth', 0.11);
        },
        frost() {
            note(1200, 650, 0.21, 'sine', 0.17);
            note(1740, 1020, 0.18, 'sine', 0.1, 0.025);
        },
        lightning() {
            noise(0.095, 4200, 0.17);
            note(1250, 280, 0.095, 'sawtooth', 0.1);
        },
        impact() {
            noise(0.075, 850, 0.13);
            note(145, 72, 0.085, 'triangle', 0.14);
        },
        'enemy-down'() {
            note(240, 90, 0.14, 'triangle', 0.14);
            noise(0.09, 520, 0.075);
        },
        hurt() {
            note(180, 54, 0.28, 'sawtooth', 0.23);
            noise(0.16, 480, 0.2);
        },
        'upgrade-open'() {
            note(420, 640, 0.25, 'sine', 0.18);
            note(630, 940, 0.3, 'sine', 0.15, 0.1);
        },
        'upgrade-choice'() {
            note(500, 680, 0.19, 'triangle', 0.22);
            note(750, 1140, 0.28, 'sine', 0.19, 0.1);
        },
        'power-burst'() {
            noise(0.46, 1100, 0.31);
            note(95, 36, 0.5, 'sawtooth', 0.28);
            note(480, 1150, 0.35, 'sine', 0.17, 0.07);
        },
        'trail-clear'() {
            note(330, 460, 0.24, 'sine', 0.19);
            note(494, 720, 0.27, 'sine', 0.2, 0.16);
        },
        wyrm() {
            note(110, 48, 0.7, 'sawtooth', 0.35);
            noise(0.55, 370, 0.17);
        },
        victory() {
            for (const [i, hz] of [440, 554, 659, 880].entries()) note(hz, hz * 1.01, 0.42, 'sine', 0.22, i * 0.14);
        },
        death() {
            note(340, 120, 0.56, 'triangle', 0.27);
            note(170, 55, 0.66, 'sawtooth', 0.13, 0.13);
        },
        reward() {
            note(540, 840, 0.26, 'sine', 0.21);
            note(820, 1230, 0.27, 'sine', 0.14, 0.11);
        },
    };
    const intervals = { ui: 80, arcane: 250, fire: 250, frost: 250, lightning: 330, impact: 165, 'enemy-down': 280,
        hurt: 550, 'power-burst': 750, 'upgrade-open': 550, 'trail-clear': 550, wyrm: 1500 };

    function play(name) {
        if (!enabled || !Object.hasOwn(effects, name)) return;
        // Ignore automated gameplay cues until a real browser user gesture has activated audio.
        if (!context || context.state !== 'running') return;
        const now = performance.now();
        if (now - (cooldowns.get(name) ?? -Infinity) < (intervals[name] ?? 120)) return;
        cooldowns.set(name, now);
        try { effects[name](); } catch (error) { console.warn('WyrmForge audio cue unavailable', error); }
    }

    function syncButton() {
        if (!button) return;
        button.textContent = enabled ? '♫ SFX ON' : '♪ SFX OFF';
        button.setAttribute('aria-label', enabled ? 'Mute game sound effects' : 'Enable game sound effects');
        button.setAttribute('aria-pressed', String(enabled));
        button.title = enabled ? 'Mute sound effects' : 'Enable sound effects';
        if (testButton) testButton.disabled = !enabled;
    }

    function setEnabled(next) {
        enabled = Boolean(next);
        try { window.localStorage.setItem(preferenceKey, String(enabled)); } catch { /* Still works in memory. */ }
        syncButton();
        reportAudioStatus(enabled ? '' : 'SFX MUTED');
        if (enabled) {
            unlock();
            // Schedule on a gesture even if the context is still resuming.
            if (context) note(710, 560, 0.11, 'sine', 0.25);
        }
        return enabled;
    }

    function mountControl() {
        if (button || !document.body) return;
        const controls = document.createElement('div');
        controls.className = 'wyrmforge-sound-controls';
        controls.setAttribute('aria-label', 'Sound effects controls');

        testButton = document.createElement('button');
        testButton.type = 'button';
        testButton.className = 'wyrmforge-sound-test';
        testButton.textContent = 'TEST ♪';
        testButton.setAttribute('aria-label', 'Play sound test');
        testButton.addEventListener('click', testSound);

        button = document.createElement('button');
        button.type = 'button';
        button.className = 'wyrmforge-sound-toggle';
        button.addEventListener('click', () => setEnabled(!enabled));

        testStatus = document.createElement('span');
        testStatus.className = 'wyrmforge-sound-status';
        testStatus.setAttribute('role', 'status');
        testStatus.setAttribute('aria-live', 'polite');
        syncButton();
        controls.append(testStatus, testButton, button);
        document.body.appendChild(controls);
    }

    document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    document.addEventListener('touchend', unlock, { capture: true, passive: true });
    document.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && enabled) configureAudioSession(); });
    document.addEventListener('click', event => {
        if (event.target instanceof Element && event.target.closest('button:not(.wyrmforge-sound-toggle)')) play('ui');
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountControl, { once: true });
    else mountControl();

    window.wyrmforgeAudio = { play, setEnabled, testSound, isEnabled: () => enabled,
        diagnostics: () => ({ enabled, state: context?.state ?? 'uninitialized', session: navigator.audioSession?.type ?? 'unsupported' }) };

})();
