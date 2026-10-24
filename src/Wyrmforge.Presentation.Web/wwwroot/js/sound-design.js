// WyrmForge Sound Identity 1.0 — "Ancient Resonance".
// Original procedural sample authoring, not real-time oscillators. Rendering is deterministic, side-effect-free,
// and deliberately band-limited: warm physical bodies, soft elemental air, restrained metallic decay.
// In a later release these recipes may be replaced by recordings without changing the game event contract.
(() => {
    const palette = Object.freeze({
        ui: { label: 'Stone / vellum', bus: 'ui', volume: 0.25, cooldown: 110, duration: 0.12, priority: 1 },
        'building-open': { label: 'Town building — wood and hinge', bus: 'ui', volume: 0.45, cooldown: 210, duration: 0.30, priority: 2 },
        'codex-open': { label: 'Codex — old book and worn leather', bus: 'ui', volume: 0.53, cooldown: 420, duration: 0.52, priority: 2 },
        arcane: { label: 'Arcane — woven aether', bus: 'combat', volume: 0.35, cooldown: 550, duration: 0.40, priority: 1 },
        fire: { label: 'Ember — breath and cinder', bus: 'combat', volume: 0.42, cooldown: 590, duration: 0.38, priority: 1 },
        frost: { label: 'Frost — glass and snow', bus: 'combat', volume: 0.37, cooldown: 620, duration: 0.47, priority: 1 },
        lightning: { label: 'Storm — restrained discharge', bus: 'combat', volume: 0.35, cooldown: 650, duration: 0.34, priority: 1 },
        impact: { label: 'Impact — stone and cloth', bus: 'combat', volume: 0.27, cooldown: 420, duration: 0.23, priority: 1 },
        'enemy-down': { label: 'Enemy down — fading ember', bus: 'combat', volume: 0.24, cooldown: 1100, duration: 0.34, priority: 1 },
        'hollow-approach': { label: 'Hollowed — ragged undead breath', bus: 'combat', volume: 0.22, cooldown: 6500, duration: 0.62, priority: 1 },
        'hollow-hit': { label: 'Hollowed — damaged flesh', bus: 'combat', volume: 0.25, cooldown: 480, duration: 0.26, priority: 1 },
        'hollow-death': { label: 'Hollowed — fading final breath', bus: 'combat', volume: 0.30, cooldown: 480, duration: 0.70, priority: 2 },
        'ashling-approach': { label: 'Ashling — furnace-throat rasp', bus: 'combat', volume: 0.21, cooldown: 6500, duration: 0.65, priority: 1 },
        'ashling-hit': { label: 'Ashling — fractured ember body', bus: 'combat', volume: 0.25, cooldown: 480, duration: 0.26, priority: 1 },
        'ashling-death': { label: 'Ashling — cinder breath expires', bus: 'combat', volume: 0.31, cooldown: 480, duration: 0.70, priority: 2 },
        hurt: { label: 'Hurt — grounded warning', bus: 'combat', volume: 0.62, cooldown: 850, duration: 0.43, priority: 2 },
        'hunt-start': { label: 'Expedition departure — boots and traveling cloak', bus: 'moment', volume: 0.57, cooldown: 800, duration: 0.93, priority: 3 },
        'trail-enter': { label: 'Advance to next arena', bus: 'moment', volume: 0.36, cooldown: 360, duration: 0.34, priority: 2 },
        'threat-reveal': { label: 'Danger arrives', bus: 'moment', volume: 0.58, cooldown: 1000, duration: 0.86, priority: 4 },
        'upgrade-open': { label: 'Discovery — a gentle glimmer', bus: 'moment', volume: 0.44, cooldown: 700, duration: 0.79, priority: 3 },
        'upgrade-choice': { label: 'Upgrade chosen — warm resonance', bus: 'moment', volume: 0.60, cooldown: 420, duration: 1.08, priority: 4 },
        'power-burst': { label: 'Power unleashed', bus: 'moment', volume: 0.82, cooldown: 1000, duration: 1.04, priority: 4 },
        'trail-clear': { label: 'Trail conquered', bus: 'moment', volume: 0.67, cooldown: 900, duration: 0.83, priority: 3 },
        wyrm: { label: 'The Wyrm awakens', bus: 'moment', volume: 0.85, cooldown: 1800, duration: 1.75, priority: 5 },
        reward: { label: 'Relic / essence', bus: 'moment', volume: 0.67, cooldown: 430, duration: 0.84, priority: 3 },
        victory: { label: 'Victory — the realm yields', bus: 'moment', volume: 0.82, cooldown: 1500, duration: 1.55, priority: 5 },
        death: { label: 'Defeat — a fading oath', bus: 'moment', volume: 0.72, cooldown: 1400, duration: 1.20, priority: 4 },
    });

    const semitone = n => Math.pow(2, n / 12);
    const smooth = x => { const v = Math.max(0, Math.min(1, x)); return v * v * (3 - 2 * v); };
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

    function createRandom(seed) {
        let state = seed >>> 0;
        return () => {
            state = (Math.imul(1664525, state) + 1013904223) >>> 0;
            return state / 4294967296 * 2 - 1;
        };
    }

    function render(name, variation = 0, sampleRate = 24000) {
        const definition = palette[name];
        if (!definition) throw new Error(`Unknown WyrmForge audio event: ${name}`);
        const rate = clamp(Math.round(sampleRate), 8000, 96000);
        const variant = ((Math.trunc(variation) % 3) + 3) % 3;
        const length = Math.ceil((definition.duration + 0.12) * rate);
        const dry = new Float32Array(length);
        let seed = 2166136261;
        for (const char of name) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
        const random = createRandom(seed ^ (variant * 0x9e3779b9));
        const detune = [0.985, 1, 1.016][variant];
        const pi2 = Math.PI * 2;

        // Body: slightly inharmonic, gently drifting partials for an instrument-like rather than electronic tone.
        function body(begin, duration, from, to, level, attack = 0.016, falloff = 3.1, warmth = 0.26) {
            let phase = 0;
            const first = Math.floor(begin * rate), count = Math.max(1, Math.floor(duration * rate));
            for (let n = 0; n < count && first + n < length; n++) {
                const t = n / rate, u = n / count;
                const frequency = (from * (1 - smooth(u)) + to * smooth(u)) * detune;
                phase += pi2 * frequency / rate;
                const onset = smooth(t / attack);
                const envelope = onset * Math.exp(-falloff * u) * (1 - smooth(Math.max(0, u - 0.89) / 0.11));
                const grain = Math.sin(phase) + warmth * Math.sin(phase * 2.003 + 0.3) + warmth * 0.21 * Math.sin(phase * 3.01 + 1.3);
                dry[first + n] += grain * envelope * level;
            }
        }

        // Physical strike: differing resonant decay constants give soft wood/metal, never bell-like square waves.
        function strike(begin, frequency, level, duration = 0.65, material = 'stone') {
            const ratios = material === 'glass' ? [1, 2.01, 2.68, 4.12] : [1, 1.51, 2.27, 3.42];
            const weights = material === 'glass' ? [0.9, 0.28, 0.12, 0.025] : [0.95, 0.27, 0.11, 0.035];
            const first = Math.floor(begin * rate), count = Math.min(length - first, Math.floor(duration * rate));
            for (let n = 0; n < count; n++) {
                const t = n / rate;
                const onset = smooth(t / 0.004);
                let sample = 0;
                for (let k = 0; k < ratios.length; k++) {
                    sample += weights[k] * Math.sin(pi2 * frequency * detune * ratios[k] * t + k * 0.31)
                        * Math.exp(-t * (2.8 + k * 3.25));
                }
                dry[first + n] += sample * level * onset * (1 - smooth(Math.max(0, t - duration + 0.035) / 0.035));
            }
        }

        // Air, sand and flame: filtered random textures, with only a trace of upper-band crackle.
        function air(begin, duration, cutoffFrom, cutoffTo, level, attack = 0.045, mode = 'soft') {
            const first = Math.floor(begin * rate), count = Math.max(1, Math.floor(duration * rate));
            let low = 0, lower = 0, mean = 0;
            for (let n = 0; n < count && n + first < length; n++) {
                const t = n / rate, u = n / count;
                const cutoff = cutoffFrom + (cutoffTo - cutoffFrom) * smooth(u);
                const alpha = clamp(pi2 * cutoff / rate, 0, 0.92);
                const white = random();
                low += alpha * (white - low);
                lower += alpha * 0.45 * (low - lower);
                mean += 0.015 * (lower - mean);
                const grit = mode === 'spark' ? (low - lower) * 0.46 : 0;
                const texture = (lower - mean) + grit;
                const shape = smooth(t / attack) * Math.pow(1 - smooth(u), mode === 'spark' ? 1.8 : 1.2);
                dry[first + n] += texture * shape * level;
            }
        }

        // Low-end energy always has an audible mid-bass overtone for small phone speakers.
        function weight(begin, level, duration = 0.33, from = 158, to = 72) {
            body(begin, duration, from, to, level, 0.007, 4.7, 0.48);
        }

        switch (name) {
            case 'ui':
                strike(0, 238, 0.42, 0.11, 'stone');
                air(0, 0.07, 430, 210, 0.09, 0.003);
                break;
            case 'codex-open':
                air(0, 0.42, 750, 170, 0.25, 0.016);
                weight(0.07, 0.22, 0.15, 160, 105);
                break;
            case 'building-open':
                weight(0, 0.30, 0.19, 215, 124);
                air(0, 0.12, 490, 250, 0.18, 0.013);
                break;
            case 'arcane':
                air(0, 0.30, 820, 320, 0.24);
                body(0.012, 0.33, 370, 218, 0.28, 0.018, 4.7);
                strike(0.042, 293.66, 0.12, 0.35, 'stone');
                break;
            case 'fire':
                air(0.0, 0.32, 1000, 240, 0.65, 0.021, 'soft');
                weight(0.035, 0.30, 0.24, 184, 94);
                air(0.045, 0.14, 1280, 410, 0.26, 0.018, 'spark');
                break;
            case 'frost':
                air(0.015, 0.37, 780, 340, 0.24, 0.055);
                strike(0.025, 440, 0.20, 0.44, 'glass');
                strike(0.088, 659.25, 0.095, 0.32, 'glass');
                break;
            case 'lightning':
                air(0.008, 0.23, 2300, 560, 0.50, 0.004, 'spark');
                weight(0.011, 0.34, 0.16, 223, 116);
                strike(0.054, 392, 0.13, 0.19, 'stone');
                break;
            case 'impact':
                weight(0, 0.48, 0.17, 210, 102);
                air(0, 0.17, 880, 180, 0.28, 0.005, 'soft');
                break;
            case 'hollow-approach':
            case 'ashling-approach':
                air(0.015, 0.53, 520, 180, 0.24, 0.07);
                body(0.05, 0.36, 105, 78, 0.20, 0.04);
                break;
            case 'hollow-hit':
            case 'ashling-hit':
                air(0.00, 0.22, 850, 225, 0.22, 0.005);
                weight(0.0, 0.17, 0.14, 160, 100);
                break;
            case 'hollow-death':
            case 'ashling-death':
                air(0.0, 0.57, 480, 115, 0.30, 0.05);
                weight(0.04, 0.25, 0.3, 170, 68);
                break;
            case 'enemy-down':
                air(0.005, 0.23, 630, 170, 0.26);
                body(0.01, 0.25, 260, 126, 0.19, 0.013, 6.2);
                break;
            case 'hurt':
                weight(0, 0.68, 0.34, 204, 86);
                air(0.006, 0.28, 810, 170, 0.25, 0.005);
                body(0.10, 0.25, 139, 104, 0.15, 0.028, 3.6);
                break;
            case 'hunt-start':
                weight(0.005, 0.35, 0.20, 175, 100);
                air(0.045, 0.38, 610, 300, 0.27, 0.06, 'soft');
                weight(0.22, 0.31, 0.18, 165, 92);
                break;
            case 'trail-enter':
                weight(0, 0.28, 0.17, 195, 113);
                air(0.01, 0.14, 420, 250, 0.12, 0.006);
                break;
            case 'threat-reveal':
                body(0.05, 0.62, 130, 80, 0.28, 0.16, 2.1);
                air(0.08, 0.60, 330, 195, 0.32, 0.15);
                break;
            case 'upgrade-open':
                body(0.02, 0.65, 293.66, 349.23, 0.23, 0.13, 2.0);
                air(0.0, 0.63, 360, 960, 0.25, 0.22);
                strike(0.25, 440, 0.21, 0.48, 'glass');
                break;
            case 'upgrade-choice':
                weight(0.0, 0.36, 0.35, 165, 102);
                strike(0.055, 293.66, 0.34, 0.80, 'stone');
                strike(0.17, 440, 0.26, 0.72, 'glass');
                strike(0.33, 587.33, 0.17, 0.58, 'glass');
                air(0.055, 0.55, 490, 780, 0.20, 0.14);
                break;
            case 'power-burst':
                weight(0.015, 0.75, 0.54, 220, 83);
                air(0.02, 0.78, 1250, 270, 0.68, 0.034);
                body(0.12, 0.74, 146.83, 73.42, 0.36, 0.035, 2.7);
                strike(0.23, 293.66, 0.17, 0.65, 'stone');
                break;
            case 'trail-clear':
                strike(0.01, 293.66, 0.22, 0.60, 'stone');
                strike(0.16, 440, 0.24, 0.55, 'glass');
                air(0.06, 0.53, 400, 690, 0.19, 0.13);
                break;
            case 'wyrm':
                body(0.02, 1.38, 98, 65.4, 0.48, 0.28, 1.2, 0.45);
                body(0.13, 1.33, 147, 83, 0.36, 0.17, 2.2, 0.30);
                air(0.02, 1.37, 410, 170, 0.44, 0.29);
                weight(0.62, 0.31, 0.46, 154, 76);
                break;
            case 'reward':
                strike(0.005, 293.66, 0.32, 0.68, 'glass');
                strike(0.14, 440, 0.25, 0.56, 'glass');
                air(0.015, 0.57, 460, 780, 0.18, 0.10);
                break;
            case 'victory':
                weight(0, 0.35, 0.35, 166, 108);
                strike(0.08, 293.66, 0.31, 0.78, 'stone');
                strike(0.31, 440, 0.31, 0.83, 'glass');
                strike(0.57, 587.33, 0.28, 0.79, 'glass');
                air(0.16, 1.17, 330, 740, 0.23, 0.25);
                break;
            case 'death':
                body(0.0, 0.86, 233, 97.99, 0.33, 0.05, 1.9);
                air(0.08, 0.89, 620, 145, 0.27, 0.22);
                strike(0.25, 146.83, 0.14, 0.64, 'stone');
                break;
        }

        // A few dark early reflections tie every effect to the same acoustic space.
        const output = new Float32Array(length);
        const delays = [0.037, 0.069, 0.119].map(seconds => Math.floor(seconds * rate));
        const decay = [0.12, 0.09, 0.06];
        let low = 0, peak = 0;
        for (let i = 0; i < length; i++) {
            let signal = dry[i];
            for (let j = 0; j < delays.length; j++) if (i >= delays[j]) signal += dry[i - delays[j]] * decay[j];
            low += 0.12 * (signal - low);
            // Retain the body, with a soft 1-pole high-frequency reduction and DC blocking.
            const softened = 0.66 * signal + 0.34 * low;
            output[i] = Math.tanh(softened * 1.25);
            peak = Math.max(peak, Math.abs(output[i]));
        }
        // Fixed headroom independent of source layering: no clipped attacks and predictable bus mixing.
        const scale = peak > 0 ? 0.78 / peak : 1;
        for (let i = 0; i < output.length; i++) output[i] *= scale;
        return output;
    }

    window.WyrmforgeSoundDesign = Object.freeze({
        version: '1.0',
        identity: 'Ancient Resonance',
        palette,
        render,
        previewNames: ['arcane', 'fire', 'frost', 'lightning', 'impact', 'hurt',
            'upgrade-open', 'upgrade-choice', 'power-burst', 'reward', 'wyrm', 'victory', 'death'],
    });
})();
