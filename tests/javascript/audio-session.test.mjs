import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const audioSource = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');

function createHarness({ sessionSupported = true, startingState = 'suspended' } = {}) {
    const nodes = [];
    const oscillatorStarts = [];
    class FakeNode {
        constructor() {
            this.frequency = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
            this.gain = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
        }
        connect() {}
        disconnect() {}
        start() { oscillatorStarts.push(true); }
        stop() {}
    }
    class FakeAudioContext {
        constructor() {
            this.state = startingState;
            this.destination = new FakeNode();
            this.currentTime = 0;
            this.sampleRate = 44100;
        }
        resume() {
            this.state = 'running';
            return Promise.resolve();
        }
        createGain() { return new FakeNode(); }
        createOscillator() { const node = new FakeNode(); nodes.push(node); return node; }
        createBuffer() { return { getChannelData: () => new Float32Array(32) }; }
        createBufferSource() { return new FakeNode(); }
        createBiquadFilter() { return new FakeNode(); }
    }
    const settings = new Map();
    const session = { type: 'ambient' };
    const navigator = sessionSupported ? { audioSession: session } : {};
    const window = {
        AudioContext: FakeAudioContext,
        localStorage: { getItem: key => settings.get(key) ?? null, setItem: (key, value) => settings.set(key, value) },
        setTimeout: callback => { callback(); return 1; },
        clearTimeout() {},
    };
    const events = new Map();
    const document = { readyState: 'loading', hidden: false, addEventListener: (name, handler) => events.set(name, handler) };
    runInNewContext(audioSource, { window, document, navigator, performance: { now: () => 10_000 }, console, Math, Float32Array });
    return { audio: window.wyrmforgeAudio, session, settings, nodes, oscillatorStarts };
}

test('iPhone playback mode is configured before the first demo sound with silent switch on', () => {
    const { audio, session, oscillatorStarts } = createHarness();
    assert.equal(session.type, 'ambient');
    audio.testSound();
    assert.equal(session.type, 'playback');
    assert.equal(audio.diagnostics().state, 'running');
    assert.equal(audio.diagnostics().session, 'playback');
    assert.equal(oscillatorStarts.length, 2, 'tap schedules two clearly audible test tones');
});

test('browsers without AudioSession still support the test tone', () => {
    const { audio, oscillatorStarts } = createHarness({ sessionSupported: false });
    audio.testSound();
    assert.equal(audio.diagnostics().session, 'unsupported');
    assert.equal(oscillatorStarts.length, 2);
});

test('user mute persists across sound tests and gameplay cues cannot override it', () => {
    const { audio, oscillatorStarts, settings } = createHarness();
    audio.setEnabled(false);
    audio.play('arcane');
    assert.equal(oscillatorStarts.length, 0);
    assert.equal(settings.get('wyrmforge.audio.enabled.v1'), 'false');
    audio.setEnabled(true);
    assert.equal(settings.get('wyrmforge.audio.enabled.v1'), 'true');
    audio.testSound();
    assert.ok(oscillatorStarts.length >= 2);
});
