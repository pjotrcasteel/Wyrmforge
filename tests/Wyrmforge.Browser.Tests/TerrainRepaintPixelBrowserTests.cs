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
                // The leftmost 1m column is outside both dirty regions. Every one of its
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

        CollectionAssert.AreEqual(new[] { 0, 0, 0, 0, 0, 0 }, differences,
            "Incremental crater repaint must match a full redraw, including all unchanged ground and normal-map pixels");
    }
    /// <summary>A shallow crater must retain authored grass and road pixels at the new physical height.</summary>
    [TestMethod]
    public async Task ShallowExcavation_RetainsOriginalGrassAndRoadPixels_DeepExcavationRevealsEarth()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.DOMContentLoaded });

        var matches = await Page.EvaluateAsync<int[]>("""
            async () => {
                const { TerrainCanvasCache, mergeTerrainFrame, TERRAIN_MATERIAL, TERRAIN_PAD_UNITS } =
                    await import('/js/arena-terrain-canvas.js');
                const columns = 8, rows = 8, count = columns * rows;
                const original = { revision: 1, columns, rows, visualSeed: 615,
                    surface: Array(count).fill(0), material: Array(count).fill(TERRAIN_MATERIAL.Soil),
                    road: [4 * 16 + 8, 0, 4 * 16 + 8, rows * 16], fine: [] };
                const cache = new TerrainCanvasCache();
                cache.update(mergeTerrainFrame(null, original), 0);
                const evidence = [cache.canvas.toDataURL('image/png')];
                const context = () => cache.canvas.getContext('2d', { willReadFrequently: true });
                const locations = [0, 4].map(column => ({
                    index: (rows - 1) * columns + column,
                    x: (column * 32 + 3 * 4) * 2,
                    y: (TERRAIN_PAD_UNITS + (rows - 1) * 32 + 7 * 4) * 2
                }));
                const patch = (loc, depth) => context().getImageData(loc.x, loc.y + depth * 8, 8, 8).data;
                const intact = locations.map(location => patch(location, 0));
                const damaged = depth => locations.map(location => ({
                    index: location.index,
                    heights: Array.from({ length: 64 }, (_, index) => index === 7 * 8 + 3 ? -depth : 0),
                    topsoil: TERRAIN_MATERIAL.Soil, stoneTop: -8
                }));
                let frame = mergeTerrainFrame(null, original);
                frame = mergeTerrainFrame(frame, { ...original, revision: 2, fine: damaged(1) });
                cache.update(frame, 0);
                evidence.push(cache.canvas.toDataURL('image/png'));
                const shallow = locations.map(location => patch(location, 1));
                frame = mergeTerrainFrame(frame, { ...original, revision: 3, fine: damaged(3) });
                cache.update(frame, 0);
                evidence.push(cache.canvas.toDataURL('image/png'));
                window.__shallowTerrainEvidence = evidence;
                const deep = locations.map(location => patch(location, 3));
                const equalPixels = (a, b) => {
                    let matched = 0;
                    for (let i = 0; i < a.length; i += 4)
                        if (a[i] === b[i] && a[i + 1] === b[i + 1] &&
                            a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3]) matched++;
                    return matched;
                };
                return locations.map((_, i) => [equalPixels(intact[i], shallow[i]),
                    equalPixels(intact[i], deep[i])]).flat();
            }
            """);

        var images = await Page.EvaluateAsync<string[]>("() => window.__shallowTerrainEvidence");
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        for (var i = 0; i < images.Length; i++)
        {
            var data = images[i];
            var filename = new[] { "original", "shallow", "deep" }[i];
            await File.WriteAllBytesAsync(Path.Combine(output, $"terrain-surface-{filename}.png"),
                Convert.FromBase64String(data[(data.IndexOf(',') + 1)..]));
        }

        Assert.IsGreaterThan(8, matches[0],
            "shallow grass must retain a substantial number of its original exact pixels, even though its top sinks");
        Assert.IsGreaterThan(matches[1], matches[0],
            "one-step shallow grass must resemble its original grass more than a genuinely exposed deep dirt floor");
        Assert.IsGreaterThan(8, matches[2],
            "the road must retain its original fine-grained pixel-art texture after one shallow 12.5cm scratch");
    }

}
