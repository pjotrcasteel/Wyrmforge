import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/sound-design.js', import.meta.url), 'utf8');
const scope = { window: {}, Float32Array, Math };
runInNewContext(source, scope);
const design = scope.window.WyrmforgeSoundDesign;

test('all gameplay event names have a working authored sample and declared mix role', () => {
    const names = ['ui', 'building-open', 'codex-open', 'arcane', 'fire', 'frost', 'lightning', 'impact', 'enemy-down', 'hollow-approach', 'hollow-hit', 'hollow-death', 'ashling-approach', 'ashling-hit', 'ashling-death', 'hurt',
        'hunt-start', 'trail-enter', 'threat-reveal', 'upgrade-open', 'upgrade-choice', 'power-burst', 'trail-clear', 'wyrm', 'reward', 'victory', 'death'];
    assert.deepEqual(Object.keys(design.palette), names);
    for (const name of names) {
        const spec = design.palette[name];
        assert.ok(['ui', 'combat', 'moment'].includes(spec.bus));
        assert.ok(spec.volume > 0 && spec.volume <= 1);
        assert.ok(spec.cooldown >= 100);
        const samples = design.render(name, 0, 24000);
        assert.ok(samples.length >= Math.floor(spec.duration * 24000), name);
        let peak = 0, energy = 0;
        for (const sample of samples) {
            assert.ok(Number.isFinite(sample), `${name} has a non-finite sample`);
            peak = Math.max(peak, Math.abs(sample));
            energy += sample * sample;
        }
        assert.ok(peak <= 0.781, `${name} has a clipping risk`);
        assert.ok(energy / samples.length > 0.00002, `${name} is effectively silent`);
    }
});

test('repeated spell variations are bounded, meaningful and deterministic', () => {
    for (const name of ['arcane', 'fire', 'frost', 'lightning', 'ui']) {
        const a = design.render(name, 0, 24000);
        const b = design.render(name, 1, 24000);
        const again = design.render(name, 0, 24000);
        assert.equal(a.length, b.length);
        assert.deepEqual(Array.from(a.slice(0, 512)), Array.from(again.slice(0, 512)));
        assert.notDeepEqual(Array.from(a.slice(0, 512)), Array.from(b.slice(0, 512)));
    }
});

test('the longer Wyrm and power events outlast routine UI, while regular spells stay under half a second', () => {
    assert.ok(design.palette.wyrm.duration > design.palette.ui.duration * 10);
    assert.ok(design.palette['power-burst'].duration > design.palette.impact.duration * 3);
    for (const name of ['arcane', 'fire', 'frost', 'lightning']) {
        assert.ok(design.palette[name].duration < 0.5);
        assert.ok(design.palette[name].volume < design.palette.wyrm.volume);
    }
});

test('unsupported cue names fail clearly and do not silently create a beep', () => {
    assert.throws(() => design.render('not-an-event'), /Unknown WyrmForge audio event/);
});
