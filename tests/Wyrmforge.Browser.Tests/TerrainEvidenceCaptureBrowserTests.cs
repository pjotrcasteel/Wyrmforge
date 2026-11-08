using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>Proves the iPhone capture's independent painter agrees with the actual cached pixels on a known-good frame.</summary>
[TestClass]
public sealed class TerrainEvidenceCaptureBrowserTests : PageTest
{
    /// <summary>Baseline and crater states must produce no false-positive pixel differences on an uncorrupted canvas.</summary>
    [TestMethod]
    public async Task TerrainEvidence_ViewportReferenceMatchesCache_WhenRenderedFromSameAuthoritativeFrame()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.DOMContentLoaded });

        var mismatched = await Page.EvaluateAsync<int[]>("""
            async () => {
                const { TerrainCanvasCache, mergeTerrainFrame, paintTerrainCell, TERRAIN_MATERIAL } =
                    await import('/js/arena-terrain-canvas.js?v=20261108-terrain-evidence-v1');
                const { captureTerrainViewport } =
                    await import('/js/arena-terrain-evidence.js?v=20261108-terrain-evidence-v1');
                const columns = 12, rows = 14;
                const source = {
                    revision: 1, columns, rows, visualSeed: 197,
                    surface: Array(columns * rows).fill(0),
                    material: Array.from({ length: columns * rows }, (_, i) =>
                        i % columns < 3 ? TERRAIN_MATERIAL.Ash : TERRAIN_MATERIAL.Soil),
                    fine: [], road: [4 * 16, 0, 4 * 16, rows * 16]
                };
                const camera = { x: 37, y: 51, width: 290, height: 360 };
                const cache = new TerrainCanvasCache();
                const result = [];
                const compare = frame => {
                    cache.update(frame, 0);
                    const capture = captureTerrainViewport(cache, frame, camera, 0,
                        paintTerrainCell, 32, 2);
                    result.push(capture.pixelComparison.mismatched);
                };
                const initial = mergeTerrainFrame(null, source);
                compare(initial);
                const heights = Array(64).fill(0);
                heights[2 * 8 + 3] = -2;
                heights[3 * 8 + 3] = -2;
                const damaged = mergeTerrainFrame(initial, { ...source, revision: 2,
                    fine: [{ index: 6 * columns + 6, heights, topsoil: 0, stoneTop: -8 }] });
                compare(damaged);
                const farther = heights.slice();
                farther[4 * 8 + 4] = -3;
                const repeated = mergeTerrainFrame(damaged, { ...source, revision: 3,
                    fine: [{ index: 6 * columns + 6, heights: farther, topsoil: 0, stoneTop: -8 }] });
                compare(repeated);
                return result;
            }
            """);

        CollectionAssert.AreEqual(new[] { 0, 0, 0 }, mismatched,
            "One-shot independent terrain viewport must not invent differences absent from the ground cache.");
    }
}
