import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-map.js', import.meta.url), 'utf8');
const { focusHunter } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function territory(y, reduced = false) {
    globalThis.window = { matchMedia: () => ({ matches: reduced }) };
    return { scrollHeight: 1800, clientHeight: 400, scrollTop: 0, calls: [],
        querySelectorAll: () => [],
        querySelector: () => y === null ? null : { offsetTop: y },
        scrollTo(options) { this.calls.push(options); this.scrollTop = options.top; } };
}

test('opening view keeps the hunter and nearby choices in frame instead of the lair', () => {
    const map = territory(1700);
    focusHunter(map);
    assert.equal(map.calls[0].behavior, 'instant');
    assert.ok(map.scrollTop > 1000);
    assert.ok(1700 - map.scrollTop >= 0 && 1700 - map.scrollTop < map.clientHeight);
});

test('advancement scrolls toward the next stretch and reduced motion skips animation', () => {
    const map = territory(1000);
    focusHunter(map, true);
    assert.equal(map.calls[0].behavior, 'smooth');
    assert.ok(map.calls[0].top < 1000);
    const reduced = territory(1000, true);
    focusHunter(reduced, true);
    assert.equal(reduced.calls[0].behavior, 'instant');
});

test('final approach clamps to the top and missing marker preserves manual scroll', () => {
    const final = territory(200);
    focusHunter(final);
    assert.equal(final.scrollTop, 0);
    const unknown = territory(null);
    unknown.scrollTop = 600;
    focusHunter(unknown, true);
    assert.equal(unknown.scrollTop, 600);
    assert.equal(unknown.calls.length, 0);
});


test('unequal road entrances remain visible on a short phone viewport', () => {
    const map = territory(1000, true);
    map.querySelectorAll = () => [{ offsetTop: 700 }, { offsetTop: 900 }];
    focusHunter(map, true);
    assert.equal(map.scrollTop, 630);
    assert.ok(700 - map.scrollTop >= 70);
    assert.ok(900 - map.scrollTop < map.clientHeight - 45);
});
