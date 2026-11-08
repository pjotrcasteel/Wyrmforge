using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>Pixel-exact proof that voxel damage does not restyle neighbouring grass, road or normal maps.</summary>
[TestClass]
public sealed class TerrainRepaintPixelBrowserTests : PageTest
{
    /// <summary>Full and incremental terrain rendering must produce identical pixels from the same C# snapshot.</summary>
    [TestMethod]
    public async Task DamagedTerrain_RegionalRepaintMatchesFreshFullPaintPixelForPixel()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.DOMContentLoaded });

        var differences = await Page.EvaluateAsync<int[]>("""
            async () => {
                const { TerrainCanvasCache, mergeTerrainFrame, TERRAIN_MATERIAL } =
                    await import('/js/arena-terrain-canvas.js');
                const columns = 12, rows = 14, count = columns * rows;
                const terrain = {
                    revision: 1, columns, rows, visualSeed: 119,
                    surface: Array(count).fill(0),
                    material: Array.from({ length: count }, (_, i) =>
                        i % columns === 2 ? TERRAIN_MATERIAL.Ash : TERRAIN_MATERIAL.Soil),
                    fine: [],
                    road: [6 * 16, 0, 6 * 16, rows * 16],
                    cracks: []
                };
                const before = mergeTerrainFrame(null, terrain);
                const regional = new TerrainCanvasCache();
                regional.enableNormals();
                regional.update(before, 0);
                const pixels = canvas => canvas.getContext('2d')
                    .getImageData(0, 0, canvas.width, canvas.height).data;
                const baseline = Object.fromEntries(['canvas', 'normalCanvas']
                    .map(channel => [channel, pixels(regional[channel])]));

                // A single Fireball excavation. All other surface data is identical.
                const heights = Array(64).fill(0);
                for (const [x, y] of [[2, 2], [3, 2], [2, 3], [3, 3]])
                    heights[y * 8 + x] = -3;
                const changed = mergeTerrainFrame(before, {
                    ...terrain, revision: 2, fine: [
                        { index: 6 * columns + 6, heights, topsoil: 0, stoneTop: -8 }
                    ]
                });
                if (changed.changed.length !== 1) throw new Error('The crater must invalidate one source block');
                regional.update(changed, 0);

                const differences = [];
                const compareFull = snapshot => {
                    const full = new TerrainCanvasCache();
                    full.enableNormals();
                    full.update({ ...snapshot, kindMaps: undefined }, 0);
                    for (const channel of ['canvas', 'normalCanvas']) {
                        const a = regional[channel], b = full[channel];
                        if (a.width !== b.width || a.height !== b.height)
                            throw new Error(channel + ': dimensions disagree');
                        const left = pixels(a), right = pixels(b);
                        let mismatches = 0;
                        for (let i = 0; i < left.length; i++)
                            if (left[i] !== right[i]) mismatches++;
                        differences.push(mismatches);
                    }
                };
                compareFull(changed);

                // Consecutive hits, including a distant crater, must not alter untouched terrain
                // or make neighbouring dirty clips produce a different result from a fresh paint.
                const moreHeights = Array(64).fill(0);
                for (const [x, y] of [[4, 4], [5, 4]]) moreHeights[y * 8 + x] = -2;
                const next = mergeTerrainFrame(changed, {
                    ...terrain, revision: 3, fine: [
                        { index: columns + 2, heights: moreHeights, topsoil: 0, stoneTop: -8 },
                        { index: 12 * columns + 9, heights: moreHeights, topsoil: 0, stoneTop: -8 }
                    ]
                });
                regional.update(next, 0);
                compareFull(next);

                // Real events can also replace a coarse material. The previous
                // splat mask is keyed only by cell index and cannot be reused
                // when a new top material requires a different base mask.
                // This failed before the fix: incremental ground retained the
                // old grass/path mask while a fresh full paint drew stone.
                const coarse = { ...terrain, revision: 4, material: [...terrain.material] };
                coarse.material[8 * columns + 5] = TERRAIN_MATERIAL.Stone;
                const withStone = mergeTerrainFrame(next, coarse);
                if (!withStone.changed.includes(8 * columns + 5))
                    throw new Error('A coarse replacement must invalidate its block');
                regional.update(withStone, 0);
                compareFull(withStone);

                // Repeated, partly overlapping craters must never accumulate
                // stale rectangles, even next to the original authored road.
                let current = withStone;
                const impacts = [
                    { row: 7, column: 6, depth: -1 }, { row: 7, column: 7, depth: -2 },
                    { row: 9, column: 6, depth: -3 }, { row: 10, column: 5, depth: -1 },
                    { row: 5, column: 4, depth: -2 },
                ];
                for (const [i, impact] of impacts.entries()) {
                    const more = Array(64).fill(0);
                    for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++)
                        more[y * 8 + x] = impact.depth;
                    const incoming = { ...coarse, revision: 5 + i, fine: [
                        { index: impact.row * columns + impact.column,
                            heights: more, topsoil: 0, stoneTop: -8 }
                    ] };
                    current = mergeTerrainFrame(current, incoming);
                    regional.update(current, 0);
                    compareFull(current);
                }

                // The leftmost 1m column is outside all dirty regions. Every one of its
                // pixels, including the normal map, must match the untouched initial terrain.
                for (const channel of ['canvas', 'normalCanvas']) {
                    const canvas = regional[channel], actual = pixels(canvas), original = baseline[channel];
                    const untouchedWidth = 32 * 2;
                    let mismatches = 0;
                    for (let y = 0; y < canvas.height; y++)
                        for (let x = 0; x < untouchedWidth * 4; x++) {
                            const index = y * canvas.width * 4 + x;
                            if (original[index] !== actual[index]) mismatches++;
                        }
                    differences.push(mismatches);
                }
                return differences;
            }
            """);

        CollectionAssert.AreEqual(Enumerable.Repeat(0, 18).ToArray(), differences,
            "Incremental crater repaint must match a full redraw, including all unchanged ground and normal-map pixels");
    }

    /// <summary>Mixed-material tiles remain pixel-identical to an independent atlas oracle after deferred repaint history.</summary>
    [TestMethod]
    public async Task MixedSplatTiles_KeepTheirOwnAlbedoAndNormalCoverageAfterOtherTilesAreDrawn()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.GotoAsync(root + "/?layerLab=1", new() { WaitUntil = WaitUntilState.DOMContentLoaded });

        var mismatches = await Page.EvaluateAsync<int>("""
            async () => {
                const { TerrainCanvasCache, mergeTerrainFrame, TERRAIN_MATERIAL, paintLavaEmissive } =
                    await import('/js/arena-terrain-canvas.js');
                const { TILE, MEGA, generateTileSet, normalFromTile } = await import('/js/arena-terrain-tiles.js');
                // Same module URL imported by the production terrain painter.
                const { setLayerLabEnabled } =
                    await import('/js/arena-layer-lab.js?v=20261108-crack-isolation-v1');
                for (const key of ['decals', 'bakedShadows', 'faces']) setLayerLabEnabled(key, false);

                const columns = 8, rows = 8, count = columns * rows;
                const original = mergeTerrainFrame(null, {
                    revision: 1, columns, rows, visualSeed: 1128,
                    surface: Array(count).fill(0),
                    material: Array(count).fill(TERRAIN_MATERIAL.Soil),
                    fine: [], road: [], cracks: []
                });
                const cache = new TerrainCanvasCache();
                cache.enableNormals();
                cache.update(original, 0);

                // These maps are deliberately not generated by the production kindMap:
                // the independent oracle knows exactly which texture must be on each pixel.
                const specs = [
                    [2, 2, 9, 0, -1], [3, 2, 0, 1, -1],
                    [4, 2, 1, 9, -1], [5, 2, 9, 1, 0],
                    [2, 3, 0, 9, -1], [3, 3, 1, 0, -1],
                    [4, 3, 9, 0, 1], [5, 3, 0, 1, 9]
                ];
                const masks = [];
                for (const [column, row, main, minority, third] of specs) {
                    const map = new Uint8Array(TILE * TILE).fill(main);
                    const offset = column * 19 + row * 13;
                    for (let i = 0; i < 101; i++) map[(i * 37 + offset) % map.length] = minority;
                    if (third >= 0) for (let i = 0; i < 151; i++)
                        map[(i * 53 + offset + 7) % map.length] = third;
                    cache.kindMaps.set(row * columns + column, map);
                    masks.push(map);
                }

                const kinds = ['grassTop', 'grassDryTop', 'mudTop', 'dirtTop', 'ashTop', 'stoneTop',
                    'rubbleTop', 'lavaTop', 'slabTop', 'pathTop'];
                const atlas = generateTileSet(0);
                const normalAtlases = Object.fromEntries(kinds.map(kind =>
                    [kind, normalFromTile(atlas[kind][0], 2.4, 0)]));
                const oracle = (kind, column, row, x, y, normal) => {
                    const tile = atlas[kinds[kind]][0];
                    const bytes = normal ? normalAtlases[kinds[kind]] : tile.data;
                    const source = (((row % MEGA) * TILE + y) * tile.width + (column % MEGA) * TILE + x) * 4;
                    return bytes.subarray(source, source + 4);
                };
                const compare = () => {
                    let differences = 0;
                    for (const [channel, normal] of [['canvas', false], ['normalCanvas', true]]) {
                        const surface = cache[channel];
                        const pixels = surface.getContext('2d').getImageData(0, 0, surface.width, surface.height).data;
                        for (const [i, [column, row]] of specs.entries()) {
                            const map = masks[i];
                            for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
                                const pixel = y * TILE + x;
                                const expect = oracle(map[pixel], column, row, x, y, normal);
                                const target = (((row * 32 + 128) * 2 + y) * surface.width + column * TILE + x) * 4;
                                for (let channelIndex = 0; channelIndex < 4; channelIndex++)
                                    if (pixels[target + channelIndex] !== expect[channelIndex]) differences++;
                            }
                        }
                    }
                    return differences;
                };

                const dirty = [3 * columns + 3];
                cache.update({ ...original, revision: 2, changed: dirty, visualDeltaComplete: true }, 0);
                let differences = compare();

                // Repaint with a different final block/mask: earlier tiles must not
                // inherit the 101-pixel stencil left by the last draw.
                const last = new Uint8Array(TILE * TILE).fill(9);
                for (let i = 0; i < 101; i++) last[(i * 37 + 9) % last.length] = 0;
                cache.kindMaps.set(7 * columns + 7, last);
                cache.update({ ...original, revision: 3, changed: dirty, visualDeltaComplete: true }, 0);
                differences += compare();

                // The separate lava emitter also used to overwrite shared mask state.
                const lavaMask = new Uint8Array(TILE * TILE).fill(9);
                for (let i = 0; i < 101; i++) lavaMask[(i * 37 + 9) % lavaMask.length] = 7;
                const lava = { ...original, material: Array(count).fill(TERRAIN_MATERIAL.Lava),
                    baseMaterial: Array(count).fill(TERRAIN_MATERIAL.Lava),
                    kindMaps: new Map([[0, lavaMask]]) };
                const glow = document.createElement('canvas');
                glow.width = glow.height = TILE * columns;
                paintLavaEmissive(glow.getContext('2d'), lava, 0,
                    { x: 0, y: 0, width: columns * 32, height: rows * 32 });
                cache.update({ ...original, revision: 4, changed: dirty, visualDeltaComplete: true }, 0);
                differences += compare();
                return differences;
            }
            """);

        Assert.AreEqual(0, mismatches,
            "Splat albedo and normal pixels must match the independent material coverage, even after further mask/emissive draws");
    }
}
