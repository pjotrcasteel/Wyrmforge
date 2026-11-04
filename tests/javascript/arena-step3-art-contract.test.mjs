import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(
    new URL('../../user_handover_files/concepts/arena-v2/wet-forest/asset-review-manifest.json',
        import.meta.url), 'utf8'));
const readRuntime = name => readFileSync(
    new URL('../../src/Wyrmforge.Presentation.Web/' + name, import.meta.url), 'utf8');

test('Step 3 defines exactly six new standalone review candidates and never claims accepted art', () => {
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.phase, 'CONCEPT_REVIEW_ONLY');
    assert.equal(manifest.runtimeIntegration, false);
    assert.equal(manifest.previousArenaAssetsForbidden, true);
    assert.deepEqual(manifest.targetPlatforms, ['iOS', 'Android']);
    assert.equal(manifest.assets.length, 6);
    assert.equal(new Set(manifest.assets.map(x => x.id)).size, 6);
    assert.deepEqual(manifest.assets.map(x => x.slot), [1, 2, 3, 4, 5, 6]);
    assert.ok(manifest.assets.every(x =>
        x.approved === false && x.reviewState === 'pending' && x.imagePath === null &&
        x.requiredDeliverables.includes('separate transparent RGBA sprite')));
    assert.deepEqual(manifest.assets.map(x => x.role), [
        'canopy', 'deadwood', 'understory', 'ground-anchored-prop', 'rock', 'deadwood-ground']);
});

test('Step-3 concept contract does not reinstate old assets or alter approved floor', () => {
    const ground = readRuntime('wwwroot/js/arena-ground-foundation.js');
    const lab = readRuntime('Pages/ArenaLab.razor');
    const materials = readRuntime('wwwroot/js/arena-materials.js');
    const hunt = readRuntime('wwwroot/js/arena.js');
    for (const asset of manifest.assets) {
        assert.ok(asset.id.startsWith('wet-forest-'));
        assert.equal(asset.layers.length > 0, true);
        assert.ok(asset.pivot.x > 0 && asset.pivot.x < 1);
        assert.ok(asset.pivot.y > 0 && asset.pivot.y <= 1);
        assert.equal(ground.includes(asset.id), false);
        assert.equal(lab.includes(asset.id), false);
        assert.equal(hunt.includes(asset.id), false);
    }
    assert.doesNotMatch(lab, /old-tree-asset|approvedTreeSprite|step3CharacterOcclusion/);
    assert.match(materials, /export function drawGroundMaterialTransitions/);
});
