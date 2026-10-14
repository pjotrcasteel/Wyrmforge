import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('real terrain gates are projected from C# barrier snapshots, not JS-only effects', () => {
    const terrain = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    const snapshots = readFileSync(new URL('../../src/Wyrmforge.Application/Runs/Simulation/Snapshots/ArenaEnvironmentRenderSnapshot.cs', import.meta.url), 'utf8');
    assert.match(terrain, /environment\.barriers\s*\?\?\s*\[\]/);
    assert.match(terrain, /barrier\.open/);
    assert.match(terrain, /barrier\.kind === 'gate'/);
    assert.match(snapshots, /ArenaBarrierRenderSnapshot/);
    assert.match(snapshots, /IReadOnlyList<ArenaBarrierRenderSnapshot> Barriers/);
});

test('terrain gate rendering remains separate from the camera and browser scrolling', () => {
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(arena, /ctx\.translate\(-camera\.x, -camera\.y\)/);
    assert.match(arena, /drawArenaEnvironment\(ctx, snapshot\.environment/);
});
