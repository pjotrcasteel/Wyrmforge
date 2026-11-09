import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('waygate GPU capture does not emit purple light across masonry', () => {
    const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /layer\.kind === 'exit'\s*\?\s*\{\s*material:\s*\{[^}]*emission:\s*['"]#b18ae1/);
    assert.match(source, /layer\.kind === 'exit'\s*\?\s*\{\s*material:\s*\{\s*roughness:\s*\.95,\s*emissionIntensity:\s*0/);
});
