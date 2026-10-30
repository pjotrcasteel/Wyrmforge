import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldBoundaryWindow } from '../../tools/art/prototypes/terrain-world-variation.mjs';
import { ACTOR_REFERENCE_CONFIG, buildCharacterScaleReview } from
    '../../tools/art/prototypes/build-ecology-character-scale-review.mjs';

test('art comparison samples the actual production Hollowed and Ashling, not stand-ins', () => {
    const {scene, enlarged, metadata} = buildCharacterScaleReview();
    assert.equal(metadata.schema, 'wf32-character-scale-review.v1');
    assert.match(metadata.kind, /NOT A LIVE HUNT/);
    assert.equal(scene.width, 384);
    assert.equal(scene.height, 256);
    assert.equal(enlarged.width, scene.width * 3);
    assert.equal(enlarged.height, scene.height * 3);
    assert.deepEqual(metadata.actors.map(actor => actor.kind), ['hollowed', 'ashling']);
    assert.deepEqual(metadata.actors.map(actor => actor.direction), ['S', 'S']);
    assert.deepEqual(metadata.actors.map(actor => actor.frame), [0, 0]);
    assert.ok(metadata.actors[0].image.endsWith('/hollow-rigged/arms/standard-walk.png'));
    assert.ok(metadata.actors[1].image.endsWith('/ashling-rigged/walk.png'));
    assert.deepEqual(metadata.actors.map(actor => actor.sourceFootAnchor), [[48,72], [48,70]]);
    assert.deepEqual(metadata.actors.map(actor => actor.renderedCellPixels), [93,81.6]);
    assert.deepEqual(metadata.actors.map(actor => actor.footAnchor), [
        ACTOR_REFERENCE_CONFIG.hollowed.anchor, ACTOR_REFERENCE_CONFIG.ashling.anchor
    ]);
});

test('actors are visible at native game-art scale on unchanged P1i terrain, with grass in foreground', () => {
    const {scene, enlarged, metadata} = buildCharacterScaleReview();
    const original = createWorldBoundaryWindow('flagstone', 'grass', {
        seed: 2211, state:'reclaimed', role:'left',
        boundaryX:23, boundaryY:128, originX:0, originY:0,
        width:384, height:256
    });
    const changed = (x0, y0, x1, y1) => {
        let count = 0;
        for (let y=y0; y<y1; y++)
            for (let x=x0; x<x1; x++)
                if (scene.get(x,y).some((v,i) => v!==original.albedo.get(x,y)[i])) count++;
        return count;
    };
    assert.ok(changed(48,112,108,184) > 30, 'Hollowed missing from comparison');
    assert.ok(changed(282,117,332,184) > 30, 'Ashling missing from comparison');
    assert.equal(metadata.props.length, 4);
    assert.deepEqual(metadata.props.map(p => p.kind),
        ['grass-medium', 'rock-small', 'rock-cluster', 'grass-tall']);
    assert.deepEqual(metadata.props.map(p => p.projectedHeightPixels), [28,12,17,45]);
    assert.deepEqual(scene.get(85,185), enlarged.get(85*3,185*3));
    assert.match(metadata.restrictions,/No gameplay, physics, runtime renderer, terrain blend/);
});
