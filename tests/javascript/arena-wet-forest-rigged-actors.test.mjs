import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHollowState, updateHollowSprites } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-sprites.js';
import { ashlingSprites } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/ashling-sprites.js';

const enemies = (hollowX = 120, ashlingY = 220) => [
    { entityId: 1, kind: 0, x: hollowX, y: 260, radius: 11 },
    { entityId: 2, kind: 2, x: 460, y: ashlingY, radius: 8 },
];
const movementOnly = actors => ({ enemies: actors, player: null, deathBursts: [], paused: false, ended: false });

test('the real Lab selects approved eight-direction Hollow and Ashling instead of proxy pixels', () => {
    const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lab.js', import.meta.url), 'utf8');
    assert.match(source, /preloadHollowSprites\(\)/);
    assert.match(source, /ashlingSprites\.preload\(\)/);
    assert.match(source, /updateHollowSprites\(state\.hollow, animationSnapshot, state\.clock\)/);
    assert.match(source, /ashlingSprites\.update\(state\.ashling, animationSnapshot, state\.clock\)/);
    assert.match(source, /drawHollowEnemy\(ctx, actor, state\.hollow\)/);
    assert.match(source, /ashlingSprites\.drawEnemy\(ctx, actor, state\.ashling\)/);
    assert.match(source, /if \(!actual\) drawEnemyPixelArt/);
    assert.match(source, /player: null, deathBursts: \[\]/);
    assert.match(source, /state\.hollow = createHollowState\(\)/);
    assert.match(source, /state\.ashling = ashlingSprites\.createState\(\)/);
    assert.doesNotMatch(source, /drawPaintedEnemy/);
});

test('real character rigs follow C# travel without pretending the navigation probes are attacking', () => {
    const hollow = createHollowState();
    const ashling = ashlingSprites.createState();
    const start = movementOnly(enemies());
    updateHollowSprites(hollow, start, 1);
    ashlingSprites.update(ashling, start, 1);
    const moving = movementOnly(enemies(126, 215));
    updateHollowSprites(hollow, moving, 1.08);
    ashlingSprites.update(ashling, moving, 1.08);

    const h = hollow.entities.get(1), a = ashling.entities.get(2);
    assert.equal(h.direction, 'E');
    assert.equal(a.direction, 'N');
    assert.equal(h.clip, 'walk');
    assert.equal(a.clip, 'walk');
    assert.equal(h.attackAt, null);
    assert.equal(a.attackAt, null);
    assert.ok(h.frame > 0);
    assert.ok(a.frame > 0);

    // Resting on the same physical world foot position must not advance animation.
    updateHollowSprites(hollow, moving, 1.5);
    ashlingSprites.update(ashling, moving, 1.5);
    assert.equal(h.clip, 'walk');
    assert.equal(a.clip, 'walk');
    assert.equal(h.attackAt, null);
    assert.equal(a.attackAt, null);
    assert.equal(hollow.corpses.size, 0);
    assert.equal(ashling.corpses.size, 0);
    assert.deepEqual(moving.enemies, enemies(126, 215));
});

test('the real rig fallback can be disabled without modifying C# props or saves', () => {
    const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lab.js', import.meta.url), 'utf8');
    assert.match(source, /generatorPreview && frame\.environment\?\.habitat === 'WetForest'/);
    assert.match(source, /entityId: mob\.id, kind: mob\.kind, x: mob\.x, y: mob\.y/);
    assert.match(source, /radius: mob\.kind === 0 \? 11 : 8/);
    assert.doesNotMatch(source, /TryDamageProp\(|RestrictMovement\(|saveGame\(|player\.health\s*=/);
});
