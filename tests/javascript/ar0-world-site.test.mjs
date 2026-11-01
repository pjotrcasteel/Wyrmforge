import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drawSemanticSiteFloor, semanticSiteModeEnabled, matrixSiteModeEnabled } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';

function fakeCanvas() {
    const strokes = [];
    const fills = [];
    return {
        strokes, fills,
        ctx: {
            save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
            arc() {}, fill() {}, stroke() { strokes.push(this.strokeStyle); },
            fillRect(x, y, w, h) { fills.push({ x, y, w, h, color: this.fillStyle }); },
            fillText() {},
        },
    };
}

test('AR0 semantic floor consumes real versioned C# site corridors and typed material IDs', () => {
    const { ctx, fills, strokes } = fakeCanvas();
    const geography = {
        version: 1, siteId: 'fire:depth-1-opening-1',
        substrate: { material: 1 },
        ports: [
            { edgeId: 'camp|depth-1-opening-1', entrance: true, direction: 'SW', localPoint: { x: .06, y: .94 } },
            { edgeId: 'depth-1-opening-1|depth-1-road-1', entrance: false, direction: 'NE', localPoint: { x: .94, y: .06 } },
        ],
        corridors: [
            { edgeId: 'camp|depth-1-opening-1', material: 2, width: .09,
                points: [{ x: .5, y: .5 }, { x: .06, y: .94 }] },
            { edgeId: 'depth-1-opening-1|depth-1-road-1', material: 2, width: .09,
                points: [{ x: .5, y: .5 }, { x: .94, y: .06 }] },
        ],
    };

    assert.equal(drawSemanticSiteFloor(ctx, geography, 390, 844), true);
    assert.equal(fills.length, 1);
    assert.equal(fills[0].w, 390);
    assert.equal(fills[0].h, 844);
    assert.equal(strokes.length, 4, 'two route strokes and two port rims');
    assert.equal(drawSemanticSiteFloor(ctx, { ...geography, version: 9 }, 390, 844), false);
    assert.equal(drawSemanticSiteFloor(ctx, { ...geography, substrate: { material: 42 } }, 390, 844), false);
});

test('AR0 opt-in stays inactive for the default game and activates only for the semantic Hunt query', () => {
    const previous = globalThis.location;
    try {
        globalThis.location = { search: '' };
        assert.equal(semanticSiteModeEnabled(), false);
        assert.equal(matrixSiteModeEnabled(), false);
        globalThis.location = { search: '?arenaGpu=1&arenaTerrain=semantic' };
        assert.equal(semanticSiteModeEnabled(), true);
        assert.equal(matrixSiteModeEnabled(), false);
        globalThis.location = { search: '?arenaTerrain=xyzgrid' };
        assert.equal(matrixSiteModeEnabled(), true);
        assert.equal(semanticSiteModeEnabled(), false);
        globalThis.location = { search: '?arenaTerrain=source-art' };
        assert.equal(semanticSiteModeEnabled(), false);
        assert.equal(matrixSiteModeEnabled(), false);
    } finally {
        if (previous === undefined) delete globalThis.location;
        else globalThis.location = previous;
    }
});

test('AR0 diagnostics remain projections, not a second JS gameplay or geographic generator', () => {
    const application = readFileSync(new URL('../../src/Wyrmforge.Application/Runs/Navigation/WorldSiteGeography.cs', import.meta.url), 'utf8');
    const renderer = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js', import.meta.url), 'utf8');
    assert.match(application, /WorldSiteGeographyProjection/);
    assert.match(application, /WorldSeed/);
    assert.match(renderer, /drawSemanticSiteFloor\(ctx, environment\.geography, width, height, environment\.geographyActive === true\)/);
    assert.match(renderer, /if \(!semantic && !matrix\) \{[\s\S]*?const texture = terrainTexture\([\s\S]*?ctx\.drawImage\(texture\.image/,
        'Neither semantic nor C# matrix reviews may allocate or paint the legacy terrain atlas.');
    const liveScene = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(liveScene, /semanticSiteModeEnabled\(\) && snapshot\.environment\?\.geography\?\.version === 1/);
    assert.match(liveScene, /matrixSiteModeEnabled\(\) && snapshot\.environment\?\.strata/);
    assert.match(liveScene, /drawGothicNight\(ctx, gothicNightPlan\(/,
        'Normal Hunts must retain the original night lighting engine.');
    assert.doesNotMatch(application, /#[0-9a-fA-F]{6}/, 'C# material IDs must not carry presentation colors');
});
