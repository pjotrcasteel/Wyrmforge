import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audio = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/audio.js', import.meta.url), 'utf8');

test('V2 Minimal accepts rapid Fireball cadence without changing other sound cooldowns', () => {
    assert.match(audio, /name === 'fire' \? 110 : sound\.cooldown/);
    assert.match(audio, /now - \(lastCue\.get\(name\) \?\? -Infinity\) < cooldown/);
});

test('V2 Minimal suppresses overlapping Fireball layers and repeated charge-ups', () => {
    assert.match(audio, /lastCastAt < 700/);
    assert.match(audio, /buildup: !continuous, layers: !continuous/);
    assert.match(audio, /entry\.layers\?\.length && \(!fireMix \|\| fireMix\.layers\)/);
    assert.match(audio, /fireMix \? fireMix\.buildup : count % 7 === 0/);
});

test('V2 Minimal attenuates and spaces Fireball impacts without affecting other schools', () => {
    assert.match(audio, /school === 'fire' && !preview/);
    assert.match(audio, /impactAccent \? 0\.20 : 0\.055/);
    assert.match(audio, /lastImpactAt < 115/);
    assert.match(audio, /: \(preview \? 0\.62 : 0\.53\)/);
});
