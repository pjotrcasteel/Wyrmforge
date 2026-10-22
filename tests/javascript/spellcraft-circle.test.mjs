import test from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, EMBLEM_CELLS, SEATS, RUNES, PULSES, VIGNETTE_SECONDS, elementOf, seatPoint, shardArcs, drawCircle, drawPulse, drawVignette, drawEmblem, haptic }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/spellcraft-circle.js';

function mockContext() {
    const calls = [];
    const gradient = { addColorStop: (...args) => calls.push(['stop', ...args]) };
    return new Proxy({ calls }, {
        get(target, key) {
            if (key in target) return target[key];
            if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => gradient;
            return (...args) => calls.push([key, ...args]);
        },
        set(target, key, value) { calls.push(['set', key, value]); return true; },
    });
}

const named = (ctx, name) => ctx.calls.filter(c => c[0] === name);
const sets = (ctx, key) => ctx.calls.filter(c => c[0] === 'set' && c[1] === key).map(c => c[2]);
const view = (extra = {}) => ({ size: 320, foundation: 'fire', infusion: 'frost', state: 'research', known: 1, needed: 3, stage: 'experimenting', reduced: true, ...extra });

test('the four elements have distinct palettes and resolve case-insensitively', () => {
    assert.deepEqual(Object.keys(ELEMENTS), ['fire', 'frost', 'storm', 'arcane']);
    assert.equal(new Set(Object.values(ELEMENTS).map(e => e.glow)).size, 4);
    assert.equal(elementOf('Frost'), ELEMENTS.frost);
    assert.equal(elementOf(null), null);
    assert.equal(elementOf('void'), null);
});

test('seats sit on the circle: foundation left, infusion right, sealed third seat on top', () => {
    const left = seatPoint('foundation', 200), right = seatPoint('infusion', 200), top = seatPoint('third', 200);
    assert.ok(left.x < 100 && Math.abs(left.y - 100) < 1e-9);
    assert.ok(right.x > 100 && Math.abs(right.y - 100) < 1e-9);
    assert.ok(top.y < 100 && Math.abs(top.x - 100) < 1e-9);
    assert.equal(Object.keys(SEATS).length, 3, 'ordinary spells cap at three elemental roles');
});

test('the centre sigil splits into one shard per required condition', () => {
    for (const needed of [1, 3, 4, 6]) {
        const arcs = shardArcs(needed);
        assert.equal(arcs.length, needed);
        for (const arc of arcs) assert.ok(arc.end > arc.start);
        for (let i = 1; i < arcs.length; i++) assert.ok(arcs[i].start >= arcs[i - 1].end, 'shards do not overlap');
    }
    assert.equal(shardArcs(0).length, 1);
    assert.equal(shardArcs(99).length, 6);
});

test('runes are deterministic script, not random noise per frame', () => {
    assert.equal(RUNES.length, 24);
    assert.ok(RUNES.every(rune => rune.length === 3 && rune.every(stroke => stroke.every(v => v >= -0.5 && v <= 0.5))));
});

test('known shards are lit with element light, unknown shards stay dark', () => {
    const ctx = mockContext();
    drawCircle(ctx, view({ known: 1, needed: 3 }), 0);
    const fills = sets(ctx, 'fillStyle');
    assert.equal(fills.filter(f => f === 'rgba(20, 17, 28, 0.38)').length, 2, 'two unread shards, etched glass');
    assert.ok(named(ctx, 'stop').some(stop => String(stop[2]).startsWith('rgba(255, 122, 54')), 'the lit shard holds Fire light');
    assert.ok(sets(ctx, 'shadowBlur').some(blur => blur > 0), 'lit glass glows');
});

test('sealed pairs show a question mark, not a name', () => {
    const ctx = mockContext();
    drawCircle(ctx, view({ state: 'sealed', known: 0 }), 0);
    assert.deepEqual(named(ctx, 'fillText').map(c => c[1]), ['?']);
});

test('the same element twice is drawn as a rejected, struck-through ring', () => {
    const ctx = mockContext();
    drawCircle(ctx, view({ foundation: 'storm', infusion: 'storm', state: 'same' }), 0);
    assert.ok(sets(ctx, 'strokeStyle').some(s => String(s).startsWith('rgba(226, 84, 74')));
    assert.equal(named(ctx, 'fillText').length, 0);
});

test('reduced motion freezes rotation and removes drifting motes', () => {
    const start = mockContext(), still = mockContext(), moving = mockContext();
    drawCircle(start, view({ reduced: true }), 0);
    drawCircle(still, view({ reduced: true }), 5);
    drawCircle(moving, view({ reduced: false }), 5);
    assert.deepEqual(named(still, 'rotate'), named(start, 'rotate'), 'nothing turns over time');
    assert.ok(named(moving, 'arc').length > named(still, 'arc').length, 'motes and stream sparks only move with motion allowed');
});

test('pulses end after their duration and the binding is the longest ceremony', () => {
    const durations = Object.values(PULSES).map(p => p.duration);
    assert.equal(Math.max(...durations), PULSES.stabilize.duration);
    for (const kind of Object.keys(PULSES)) {
        assert.equal(drawPulse(mockContext(), view(), { kind, seat: 'foundation', element: 'fire' }, 0.1), true, kind);
        assert.equal(drawPulse(mockContext(), view(), { kind }, PULSES[kind].duration + 0.01), false, kind);
    }
    assert.equal(drawPulse(mockContext(), view(), { kind: 'unknown' }, 0), false);
});

test('a failure cracks the sigil and lets warm clue-light through', () => {
    const ctx = mockContext();
    drawPulse(ctx, view(), { kind: 'failure' }, 0.5);
    assert.ok(named(ctx, 'lineTo').length >= 3, 'a crack is drawn');
    assert.ok(ctx.calls.some(c => c[0] === 'stop' && String(c[2]).startsWith('rgba(255, 210, 154')));
});

test('the test vignette tells the truth: unstable recipes fizzle into smoke', () => {
    const stable = mockContext(), unstable = mockContext();
    drawVignette(stable, view(), { family: 'Frostfire', stable: true }, VIGNETTE_SECONDS * 0.8);
    drawVignette(unstable, view(), { family: 'Frostfire', stable: false }, VIGNETTE_SECONDS * 0.8);
    const smoke = ctx => ctx.calls.filter(c => c[0] === 'stop' && String(c[2]).startsWith('rgba(138, 132, 150')).length;
    assert.equal(smoke(stable), 0);
    assert.ok(smoke(unstable) > 0);
    assert.equal(drawVignette(mockContext(), view(), { family: 'Frostfire', stable: true }, VIGNETTE_SECONDS), false);
});

test('Arcane Conduit demonstrates chain discharge instead of a shatter', () => {
    const ctx = mockContext();
    drawVignette(ctx, view({ foundation: 'arcane', infusion: 'storm' }), { family: 'Arcane Conduit', stable: true }, VIGNETTE_SECONDS * 0.7);
    assert.ok(named(ctx, 'lineTo').length >= 12, 'three jagged arcs');
});

test('every research emblem samples the approved atlas without smoothing or replacement glyphs', () => {
    const atlas = { complete: true, naturalWidth: 192 };
    const sources = [];
    for (const element of Object.keys(ELEMENTS)) {
        const ctx = mockContext();
        drawEmblem(ctx, element, 10, 10, 20, 1, atlas);
        const images = named(ctx, 'drawImage');
        assert.equal(images.length, 1, element);
        assert.equal(images[0][1], atlas);
        assert.deepEqual(sets(ctx, 'imageSmoothingEnabled'), [false]);
        sources.push(images[0].slice(2, 4).join(','));
        assert.equal(named(ctx, 'stroke').length, 0, 'no generic vector emblem');
    }
    assert.equal(new Set(sources).size, Object.keys(EMBLEM_CELLS).length);
    const empty = mockContext();
    drawEmblem(empty, null, 0, 0, 20, 1, atlas);
    drawEmblem(empty, 'fire', 0, 0, 20, 1, { complete: false });
    assert.equal(empty.calls.length, 0, 'empty seats and undecoded atlases are safe');
});

test('haptics are optional: no vibrate API means no haptic, never an error', () => {
    assert.equal(haptic('snap'), false);
    assert.equal(haptic('unknown'), false);
});
