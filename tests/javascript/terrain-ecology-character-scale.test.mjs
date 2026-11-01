import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldBoundaryWindow } from '../../tools/art/prototypes/terrain-world-variation.mjs';
import { ACTOR_REFERENCE_CONFIG, buildCharacterScaleReview,
    ECOLOGY_VARIANT_REVIEW_ORDER, buildAllVariantScaleReview } from
    '../../tools/art/prototypes/build-ecology-character-scale-review.mjs';

test('art comparison samples the actual production Hollowed and Ashling, not stand-ins', () => {
    const {scene, enlarged, targetScene, targetEnlarged, metadata} = buildCharacterScaleReview();
    assert.equal(metadata.schema, 'wf32-character-scale-review.v2');
    assert.match(metadata.kind, /NOT LIVE HUNT SCREENSHOTS/);
    assert.equal(scene.width, 384);
    assert.equal(scene.height, 256);
    assert.equal(enlarged.width, scene.width * 3);
    assert.equal(enlarged.height, scene.height * 3);
    assert.equal(targetScene.width, scene.width);
    assert.equal(targetScene.height, scene.height);
    assert.equal(targetEnlarged.width, scene.width * 3);
    assert.equal(targetEnlarged.height, scene.height * 3);
    assert.deepEqual(metadata.actors.map(actor => actor.kind), ['hollowed', 'ashling']);
    assert.deepEqual(metadata.actors.map(actor => actor.direction), ['S', 'S']);
    assert.deepEqual(metadata.actors.map(actor => actor.frame), [0, 0]);
    assert.ok(metadata.actors[0].image.endsWith('/hollow-rigged/arms/standard-walk.png'));
    assert.ok(metadata.actors[1].image.endsWith('/ashling-rigged/walk.png'));
    assert.deepEqual(metadata.actors.map(actor => actor.sourceFootAnchor), [[48,72], [48,70]]);
    assert.deepEqual(metadata.actors.map(actor => actor.gameplayRadius), [11,8]);
    assert.equal(metadata.actors[0].renderedCellPixels, 93);
    assert.ok(Math.abs(metadata.actors[1].renderedCellPixels - 81.6*8/11)<1e-10);
    assert.deepEqual(metadata.actors.map(actor => actor.opaqueSourceBounds.height), [49,44]);
    assert.ok(metadata.silhouettes.runtimeHollowToAshlingHeightRatio > 1.6);
    assert.ok(metadata.silhouettes.runtimeHollowToAshlingHeightRatio < 1.9);
    assert.equal(metadata.silhouettes.ownerTargetHollowToAshlingHeightRatio,2);
    assert.ok(metadata.silhouettes.hollowTargetAppearanceMultiplier > 1.1);
    assert.ok(metadata.silhouettes.hollowTargetAppearanceMultiplier < 1.2);
    assert.equal(metadata.silhouettes.ashlingAppearanceMultiplier, 1);
    assert.equal(metadata.silhouettes.targetIsRuntimeChange, false);
    const h=metadata.actors[0].renderedVisibleHeightPixels;
    const a=metadata.actors[1].renderedVisibleHeightPixels;
    assert.ok(Math.abs(h*metadata.silhouettes.hollowTargetAppearanceMultiplier/a-2)<1e-10);
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
    // Target preview changes the Hollowed's appearance only; the Ashling's
    // actual C# radius, source sprites and surroundings remain byte-identical.
    const {targetScene} = buildCharacterScaleReview();
    for(let y=0;y<scene.height;y++)for(let x=240;x<scene.width;x++)
        assert.deepEqual(targetScene.get(x,y),scene.get(x,y));

});

test('all twelve 2.5D variants are individually visible at actual 320/390px actor scale',()=>{
    const narrow=buildAllVariantScaleReview(320),wide=buildAllVariantScaleReview(390);
    assert.deepEqual(ECOLOGY_VARIANT_REVIEW_ORDER,
        ['rock-small','rock-cluster','grass-medium','grass-tall']);
    for(const [width,result] of [[320,narrow],[390,wide]]){
        assert.equal(result.scene.width,width);
        assert.equal(result.scene.height,508);
        assert.equal(result.enlarged.width,width*3);
        assert.equal(result.enlarged.height,1524);
        assert.equal(result.metadata.schema,'wf32-ecology-all-variants-mobile.v1');
        assert.match(result.metadata.kind,/NOT A LIVE HUNT SCREENSHOT/);
        assert.equal(result.metadata.nativeDisplayPixelScale,1);
        assert.deepEqual(result.metadata.actors.map(a=>a.gameplayRadius),[11,8]);
        assert.equal(result.metadata.variants.length,12);
        assert.deepEqual(result.metadata.variants.map(p=>p.kind),ECOLOGY_VARIANT_REVIEW_ORDER.flatMap(k=>[k,k,k]));
        assert.deepEqual(result.metadata.variants.map(p=>p.variant),
            [0,1,2,0,1,2,0,1,2,0,1,2]);
        assert.equal(new Set(result.metadata.variants.map(p=>p.sourceFingerprint)).size,12,
            'all twelve variants must be genuinely different');
        assert.ok(result.metadata.variants.every(p=>p.footAnchor[1]>28&&
            p.footAnchor[1]<result.scene.height));
        assert.deepEqual(result.scene.get(160,250),result.enlarged.get(480,750));
        assert.match(result.metadata.gates,/G shadows\/occlusion/);
    }
    assert.deepEqual(narrow.metadata.variants.map(v=>v.sourceFingerprint),
        wide.metadata.variants.map(v=>v.sourceFingerprint),
        'review viewport must not change original 2.5D art bytes');
    assert.throws(()=>buildAllVariantScaleReview(360),RangeError);
});
