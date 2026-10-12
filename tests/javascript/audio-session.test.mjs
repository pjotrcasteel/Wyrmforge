import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';

const soundSource = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sound-design.js', import.meta.url), 'utf8');
const audioSource = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');

function harness({ sessionSupported = true, scriptSrc = null } = {}) {
    const started = [];
    const settings = new Map();
    const session = { type: 'ambient' };
    class Parameter {
        constructor() { this.value = 0; }
        setTargetAtTime(value) { this.value = value; }
        cancelScheduledValues() {}
    }
    class Node {
        constructor() { this.gain = new Parameter(); this.playbackRate = new Parameter(); }
        connect() {}
        disconnect() {}
        start() { started.push(this.buffer); }
    }
    class FakeContext {
        constructor() {
            this.state = 'suspended';
            this.sampleRate = 24000;
            this.currentTime = 0;
            this.destination = new Node();
        }
        resume() { this.state = 'running'; return Promise.resolve(); }
        createGain() { return new Node(); }
        createBufferSource() { return new Node(); }
        createBuffer(channels, samples, rate) {
            assert.equal(channels, 1);
            assert.equal(rate, this.sampleRate);
            return { copyToChannel(pcm) { assert.equal(pcm.length, samples); this.sample = pcm; } };
        }
    }
    const window = {
        AudioContext: FakeContext,
        localStorage: { getItem: key => settings.get(key) ?? null, setItem: (key, val) => settings.set(key, val) },
        setTimeout: callback => { callback(); return 1; },
        clearTimeout() {},
    };
    const document = { readyState: 'loading', hidden: false, currentScript: scriptSrc ? { src: scriptSrc } : null, addEventListener() {}, querySelector() { return null; } };
    const navigator = sessionSupported ? { audioSession: session } : {};
    const environment = { window, document, navigator, performance: { now: () => 5000 }, console, Math, Float32Array, URL };
    runInNewContext(soundSource, environment);
    runInNewContext(audioSource, environment);
    return { audio: window.wyrmforgeAudio, sound: window.WyrmforgeSoundDesign, started, settings, session };
}

test('audio revision follows the deployed script commit for iPhone cache invalidation', () => {
    const { audio } = harness({ scriptSrc: 'https://example.test/js/audio.js?v=abcdef123456' });
    assert.equal(audio.diagnostics().audioRevision, 'abcdef123456');
    const fallback = harness();
    assert.equal(fallback.audio.diagnostics().audioRevision, '0.0.111');
});

test('iPhone Silent Mode configures playback before the first sampled sound', () => {
    const { audio, session, started } = harness();
    assert.equal(session.type, 'ambient');
    audio.testSound();
    assert.equal(session.type, 'playback');
    assert.equal(audio.diagnostics().state, 'running');
    assert.equal(audio.diagnostics().identity, 'recordings-loading');
    assert.equal(started.length, 1);
    assert.ok(started[0].sample.some(value => Math.abs(value) > 0.1));
});

test('unsupported AudioSession still plays authored samples, not oscillator beeps', () => {
    const { audio, started } = harness({ sessionSupported: false });
    audio.testSound();
    assert.equal(audio.diagnostics().session, 'unsupported');
    assert.equal(started.length, 1);
});

test('mute and category volume settings persist without muting gameplay logic', () => {
    const { audio, started, settings } = harness();
    audio.setEnabled(false);
    assert.equal(audio.play('arcane'), false);
    assert.equal(started.length, 0);
    assert.equal(settings.get('wyrmforge.audio.enabled.v1'), 'false');
    audio.setEnabled(true);
    audio.updateVolume('combat', 0.25);
    assert.equal(settings.get('wyrmforge.audio.enabled.v1'), 'true');
    assert.equal(settings.get('wyrmforge.audio.combat.v1'), '0.25');
    assert.ok(started.length >= 1);
});

test('cached voiced cues rotate through authored variations', () => {
    const { audio, started } = harness();
    audio.testSound();
    audio.play('arcane', true);
    audio.play('arcane', true);
    const a = started.at(-2).sample;
    const b = started.at(-1).sample;
    assert.notDeepEqual(Array.from(a.slice(0, 100)), Array.from(b.slice(0, 100)));
});
