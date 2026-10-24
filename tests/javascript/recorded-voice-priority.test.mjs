import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Real recorded-audio path, with just DOM mounting replaced by an explicit
// manifest load. This tests the production voice policy, not a copied policy.
const original = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');
const soundDesign = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sound-design.js', import.meta.url), 'utf8');
const boot = "if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountControls, { once: true });\\n    else mountControls();";
assert.ok(original.includes(boot), 'The harness must track the real game startup');
const playable = original.replace(boot, 'loadManifest();');

function fixture() {
    const started = [], stopped = [];
    const param = () => ({
        value: 0,
        setTargetAtTime(value) { this.value = value; },
        cancelScheduledValues() {},
        setValueAtTime(value) { this.value = value; },
        linearRampToValueAtTime(value) { this.value = value; },
    });
    class Source {
        constructor() { this.buffer = null; this.playbackRate = { value: 1 }; this.onended = null; }
        connect() {}
        disconnect() {}
        start() { started.push(this); }
        stop() { stopped.push(this); this.onended?.(); }
    }
    class FakeAudioContext {
        constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
        resume() { return Promise.resolve(); }
        createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
        createBufferSource() { return new Source(); }
        decodeAudioData(data) {
            return Promise.resolve({ duration: 1.5, id: new TextDecoder().decode(data) });
        }
    }

    const item = name => ({ file: name + '.ogg', license: 'CC0' });
    const manifest = {
        version: 2,
        music: { menu: 'm.ogg', hunt: 'h.ogg' },
        cues: {
            arcane: { variants: [item('arcane')] },
            fire: { variants: [item('fire')] },
            frost: { variants: [item('frost')] },
            lightning: { variants: [item('lightning')] },
            'hollow-approach': { variants: [item('hollow1'), item('hollow2')] },
            'hollow-death': { variants: [item('hollowdeath')] },
            hurt: item('playerhurt'),
            'upgrade-choice': item('upgrade'),
        },
        uiMaterials: {
            vellum: { variants: [item('vellum')] },
            stone: { variants: [item('stone')] },
            iron: { variants: [item('iron')] },
        },
    };
    const encoder = new TextEncoder();
    const fetch = async url => url.includes('manifest.json')
        ? { ok: true, json: async () => manifest }
        : { ok: true, arrayBuffer: async () => encoder.encode(url).buffer };
    const document = {
        readyState: 'loading', hidden: false, baseURI: 'https://example.test/',
        currentScript: { src: 'https://example.test/audio.js?v=test' },
        addEventListener() {},
        querySelector() { return null; },
    };
    const window = {
        AudioContext: FakeAudioContext,
        localStorage: { getItem() { return null; }, setItem() {} },
        setTimeout() { return 1; },
        clearTimeout() {},
    };
    const env = { document, window, navigator: {}, fetch, URL, performance: { now: () => 10000 }, console, Float32Array, Math };
    runInNewContext(soundDesign, env);
    runInNewContext(playable, env);
    return { audio: window.wyrmforgeAudio, started, stopped };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('recorded voices keep a hard limit and let player damage preempt a creature ambience voice', async () => {
    const { audio, started, stopped } = fixture();
    await settle(); // loadManifest / HTTP-like async manifest response
    audio.testSound(); // unlock the actual audio context without DOM controls
    await settle();
    for (let i = 0; i < 5; i++) assert.equal(audio.play('hollow-approach', true), true);
    await settle();
    assert.equal(audio.diagnostics().voices.combat, 5);
    assert.equal(started.filter(source => source.buffer.id.includes('hollow')).length, 5);
    assert.equal(audio.play('hollow-approach', true), false, 'do not exceed the combat voice cap');

    assert.equal(audio.play('hurt', true), true, 'damage outranks creature approach');
    await settle();
    assert.equal(stopped.length, 1, 'one harmless creature voice is stolen');
    assert.equal(audio.diagnostics().voices.combat, 5, 'stealing does not leak or exceed the cap');
    assert.ok(started.some(source => source.buffer.id.includes('playerhurt')));
    assert.equal(audio.play('hollow-approach', true), false, 'low-priority voices cannot cut off damage');
});

test('a higher-priority monster death preempts approach ambience without stealing moment music', async () => {
    const { audio, stopped } = fixture();
    await settle();
    audio.testSound();
    await settle();
    for (let i = 0; i < 5; i++) audio.play('hollow-approach', true);
    await settle();
    assert.equal(audio.play('hollow-death', true), true);
    await settle();
    assert.equal(stopped.length, 1);
    assert.equal(audio.diagnostics().voices.combat, 5);
});
