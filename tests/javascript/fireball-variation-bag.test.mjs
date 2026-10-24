import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the ACTUAL Fireball bag function from audio.js, not a copied algorithm.
const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');
const start = source.indexOf('    const fireballShuffleBags = new Map();');
const end = source.indexOf('    const buffers = new Map();', start);
assert.ok(start >= 0 && end > start, 'Keep this test attached to the real recorded playback code');

function createPicker(seed = 0x91c6) {
    let state = seed >>> 0;
    const random = () => {
        state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
    const scope = { Map, Array, Math: Object.assign(Object.create(Math), { random }) };
    runInNewContext(source.slice(start, end) + '\nthis.pick = nextFireballTake;', scope);
    return scope.pick;
}

test('every cycle uses all six Fireball recordings exactly once before reusing any take', () => {
    const next = createPicker();
    const picks = Array.from({ length: 6 * 30 }, () => next('fire-cast', 6));
    for (let start = 0; start < picks.length; start += 6) {
        const cycle = picks.slice(start, start + 6);
        assert.deepEqual([...cycle].sort(), [0, 1, 2, 3, 4, 5]);
    }
    for (let i = 1; i < picks.length; i++)
        assert.notEqual(picks[i], picks[i - 1], 'consecutive Fireballs should never sound identical');
});

test('casts and impacts have independent shuffle orders while both exhaust the full pool', () => {
    const next = createPicker(723124);
    const cast = [], impact = [];
    for (let i = 0; i < 60; i++) {
        cast.push(next('fire-cast', 6));
        impact.push(next('fire-hit', 6));
    }
    for (let offset = 0; offset < 60; offset += 6) {
        assert.deepEqual(cast.slice(offset, offset + 6).sort(), [0, 1, 2, 3, 4, 5]);
        assert.deepEqual(impact.slice(offset, offset + 6).sort(), [0, 1, 2, 3, 4, 5]);
    }
    assert.ok(cast.some((take, i) => take !== impact[i]), 'impact variation must not mirror cast variation');
});

test('original two A/B takes still alternate, including shuffle-boundary transitions', () => {
    const next = createPicker();
    const picks = Array.from({ length: 80 }, () => next('fire-hit', 2));
    for (let i = 1; i < picks.length; i++) assert.notEqual(picks[i], picks[i - 1]);
    assert.deepEqual(new Set(picks), new Set([0, 1]));
});

test('switching to a different pool size safely resets the bag without stale indices', () => {
    const next = createPicker();
    for (let i = 0; i < 4; i++) next('fire-cast', 6);
    const reduced = Array.from({ length: 12 }, () => next('fire-cast', 3));
    assert.ok(reduced.every(take => take >= 0 && take < 3));
    for (let offset = 0; offset < reduced.length; offset += 3)
        assert.deepEqual(reduced.slice(offset, offset + 3).sort(), [0, 1, 2]);
});


test('gameplay actually uses the shuffle bag for both Fireball casting and spell impacts', () => {
    assert.match(source, /const castIndex = name === 'fire'[\s\S]*?nextFireballTake\('fire-cast'/);
    assert.match(source, /const index = school === 'fire' \? nextFireballTake\('fire-hit'/);
    assert.match(source, /recordedEntry\(name, 'cast', castIndex\)/);
    assert.match(source, /playRecordedEntry\(options\[index\]/);
    assert.match(source, /for \(const take of \[\.\.\.\(fireball\?\.variants/);
});
