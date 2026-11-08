using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;

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
    /// <summary>Reproduces the real iPhone viewport, dirty cells and world dimensions with a winding authored road.</summary>
    [TestMethod]
    public async Task DamagedTerrain_IPhoneCaptureViewportRemainsIdenticalAfterRepeatedRegionalImpacts()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.DOMContentLoaded });

        var differences = await Page.EvaluateAsync<int[]>("""
            async () => {
                const { TerrainCanvasCache, mergeTerrainFrame, TERRAIN_MATERIAL } =
                    await import('/js/arena-terrain-canvas.js');
                const columns = 32, rows = 60, count = columns * rows;
                const surface = Array.from({ length: count }, (_, i) => {
                    const column = i % columns, row = Math.floor(i / columns);
                    // Shaped forest heights (including cliffs): a deliberately harder
                    // case than the old uniform, flat 12x14 road-only test.
                    if (column < 6 && row > 36 && row < 56) return 8;
                    if (column > 26 && row > 24 && row < 54) return -4;
                    return 0;
                });
                const material = Array.from({ length: count }, (_, i) =>
                    ((i % columns) * 7 + Math.floor(i / columns) * 3) % 19 < 3 ?
                        TERRAIN_MATERIAL.Ash : TERRAIN_MATERIAL.Soil);
                const road = [];
                for (let row = 0; row < rows; row++)
                    road.push(Math.round((16 + Math.sin(row * .17) * 3.4) * 16), row * 16);
                const base = { revision: 1, columns, rows, visualSeed: -1885611032,
                    surface, material, fine: [], road, cracks: [] };
                let current = mergeTerrainFrame(null, base);
                const regional = new TerrainCanvasCache();
                regional.enableNormals();
                regional.update(current, 0);
                const viewport = { x: 327, y: 1264, width: 402, height: 656 };
                const copy = (cache, normal) => {
                    const out = document.createElement('canvas');
                    out.width = viewport.width * 2;
                    out.height = viewport.height * 2;
                    const ctx = out.getContext('2d', { willReadFrequently: true });
                    ctx.imageSmoothingEnabled = false;
                    ctx.setTransform(2, 0, 0, 2, -viewport.x * 2, -viewport.y * 2);
                    if (normal) cache.drawNormals(ctx, viewport);
                    else cache.draw(ctx, viewport);
                    return ctx.getImageData(0, 0, out.width, out.height).data;
                };
                const mismatches = [];
                const compare = () => {
                    const full = new TerrainCanvasCache();
                    full.enableNormals();
                    full.update({ ...current, kindMaps: undefined }, 0);
                    for (const normal of [false, true]) {
                        const a = copy(regional, normal), b = copy(full, normal);
                        let mismatch = 0;
                        for (let index = 0; index < a.length; index += 4)
                            if (a[index] !== b[index] || a[index + 1] !== b[index + 1] ||
                                a[index + 2] !== b[index + 2] || a[index + 3] !== b[index + 3]) mismatch++;
                        mismatches.push(mismatch);
                    }
                };
                const impacts = [
                    // Same two dirty indices captured on Safari at C# revision 1325.
                    [1680, [26, 27, 28, 33, 34, 35, 36, 37, 41, 42, 43, 44, 45, 49, 50, 51, 52, 53, 57, 58, 59, 60, 61]],
                    [1712, [2, 3, 4]],
                    [49 * columns + 15, [12, 13, 20, 21]],
                    [43 * columns + 19, [27, 28, 35, 36]],
                    [53 * columns + 16, [2, 3, 4, 10, 11, 12]],
                ];
                for (const [i, [index, dug]] of impacts.entries()) {
                    const heights = Array(64).fill(0);
                    for (const micro of dug) heights[micro] = -1;
                    current = mergeTerrainFrame(current, { ...base, revision: i + 2,
                        fine: [{ index, heights, topsoil: 0, stoneTop: -8 }] });
                    regional.update(current, 0);
                    compare();
                }
                return mismatches;
            }
            """);

        CollectionAssert.AreEqual(Enumerable.Repeat(0, 10).ToArray(), differences,
            "Safari-sized viewport albedo and normals must agree with fresh ground across repeated road impacts.");
    }

    /// <summary>Replays the actual captured Safari site's C# terrain generator and damaged road cells.</summary>
    [TestMethod]
    public async Task DamagedTerrain_CapturedIPhoneSiteSeedKeepsExactAlbedoAndNormals()
    {
        const int siteSeed = -1885611032;
        var site = ArenaTerrainGenerator.Generate(siteSeed, 0, 32, 60, (16, 52), (16, 6));
        var source = site.Grid.ToFrame(-1);
        var initial = new
        {
            revision = 1,
            columns = source.Columns,
            rows = source.Rows,
            visualSeed = source.VisualSeed,
            surface = source.Surface,
            material = source.Material,
            fine = source.Fine.Select(block => new
            {
                index = block.Index, heights = block.Heights, topsoil = block.Topsoil,
                stoneTop = block.StoneTop, wear = block.Wear
            }).ToArray(),
            road = source.Road,
            cracks = source.Cracks,
        };
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.DOMContentLoaded });
        var mismatches = await Page.EvaluateAsync<int[]>("""
            async input => {
                const { TerrainCanvasCache, mergeTerrainFrame } = await import('/js/arena-terrain-canvas.js');
                let current = mergeTerrainFrame(null, input);
                const initialFineCount = current.fine.size;
                const incremental = new TerrainCanvasCache();
                incremental.enableNormals();
                incremental.update(current, 0);
                const camera = { x: 327, y: 1264, width: 402, height: 656 };
                const sample = (cache, normal) => {
                    const canvas = document.createElement('canvas');
                    canvas.width = camera.width * 2;
                    canvas.height = camera.height * 2;
                    const context = canvas.getContext('2d', { willReadFrequently: true });
                    context.imageSmoothingEnabled = false;
                    context.setTransform(2, 0, 0, 2, -camera.x * 2, -camera.y * 2);
                    if (normal) cache.drawNormals(context, camera);
                    else cache.draw(context, camera);
                    return context.getImageData(0, 0, canvas.width, canvas.height).data;
                };
                const check = () => {
                    const fresh = new TerrainCanvasCache();
                    fresh.enableNormals();
                    fresh.update({ ...current, kindMaps: undefined }, 0);
                    return [false, true].map(normal => {
                        const actual = sample(incremental, normal), expected = sample(fresh, normal);
                        let count = 0;
                        for (let i = 0; i < actual.length; i += 4)
                            if (actual[i] !== expected[i] || actual[i + 1] !== expected[i + 1] ||
                                actual[i + 2] !== expected[i + 2] || actual[i + 3] !== expected[i + 3]) count++;
                        return count;
                    });
                };
                const results = [initialFineCount];
                // Physical evidence: the final C# update altered precisely these two
                // adjacent road cells (indices 1680/1712). Recreate a few prior
                // impacts in the same corridor to exercise cumulative cache damage.
                const impacts = [
                    [50 * 32 + 17, [18, 19, 26, 27]],
                    [47 * 32 + 16, [28, 29, 36, 37]],
                    [52 * 32 + 16, [26, 27, 28, 33, 34, 35, 36, 37, 41, 42, 43, 44, 45, 49, 50, 51, 52, 53, 57, 58, 59, 60, 61]],
                    [53 * 32 + 16, [2, 3, 4]]
                ];
                for (const [offset, [index, excavated]] of impacts.entries()) {
                    const previous = current.fine.get(index);
                    const heights = previous?.heights?.slice() ?? Array(64).fill(current.surface[index]);
                    for (const micro of excavated) heights[micro] = -1;
                    const fine = { index, heights, topsoil: previous?.topsoil ?? input.material[index],
                        stoneTop: previous?.stoneTop ?? -8, wear: previous?.wear ?? null };
                    current = mergeTerrainFrame(current, { ...input, revision: offset + 2, fine: [fine] });
                    incremental.update(current, 0);
                    results.push(...check());
                }
                return results;
            }
            """, initial);
        Assert.IsTrue(mismatches[0] > 0, "The captured site must use real authored fine terrain, not a flat synthetic test.");
        CollectionAssert.AreEqual(new int[8], mismatches.Skip(1).ToArray(),
            $"Actual generator seed {siteSeed} must keep cached albedo and normals identical after four road impacts.");
    }

}
