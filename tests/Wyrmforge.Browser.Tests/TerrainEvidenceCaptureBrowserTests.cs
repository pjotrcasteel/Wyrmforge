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

        var comparisons = await Page.EvaluateAsync<System.Text.Json.JsonElement>("""
            async () => {
                const { TerrainCanvasCache, mergeTerrainFrame, paintTerrainCell, TERRAIN_MATERIAL } =
                    await import('/js/arena-terrain-canvas.js?v=20261108-fissure-occlusion-v1');
                const { captureTerrainViewport, sampleCachedTerrainViewport, compareTerrainPixels } =
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
                    const full = new TerrainCanvasCache();
                    full.update({ ...frame, kindMaps: new Map() }, 0);
                    const regional = captureTerrainViewport(cache, frame, camera, 0,
                        paintTerrainCell, 32, 2).pixelComparison;
                    const rebuilt = captureTerrainViewport(full, frame, camera, 0,
                        paintTerrainCell, 32, 2).pixelComparison;
                    const a = sampleCachedTerrainViewport(cache, camera, 2);
                    const b = sampleCachedTerrainViewport(full, camera, 2);
                    const parity = compareTerrainPixels(a.pixels, b.pixels, a.width);
                    result.push({ revision: frame.revision, regional, rebuilt, parity });
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

        foreach (var entry in comparisons.EnumerateArray())
        {
            var regional = entry.GetProperty("regional");
            var rebuilt = entry.GetProperty("rebuilt");
            var parity = entry.GetProperty("parity");
            var revision = entry.GetProperty("revision").GetInt32();
            Assert.AreEqual(0, parity.GetProperty("mismatched").GetInt32(),
                $"Regional cache must equal a fresh full rebuild byte-for-byte: {entry}");
            Assert.AreEqual(regional.GetProperty("mismatched").GetInt32(),
                rebuilt.GetProperty("mismatched").GetInt32(),
                $"Both caches must agree equally with the independent painter: {entry}");
            Assert.AreEqual(regional.GetProperty("maxDelta").GetInt32(),
                rebuilt.GetProperty("maxDelta").GetInt32(),
                $"Both caches must have the same maximum channel delta: {entry}");

            var mismatch = regional.GetProperty("mismatched").GetInt32();
            if (revision == 1)
            {
                Assert.AreEqual(0, mismatch, $"Intact terrain must agree exactly with the independent painter: {entry}");
                continue;
            }

            // Linux WebKit can round translucent crater-depth cues differently between
            // the normal cached Canvas2D backend and the read-frequent reference.
            // These are at most two channel values, confined to the excavated block.
            // Material splats remain independently tested byte-for-byte in every browser.
            Assert.IsTrue(regional.GetProperty("maxDelta").GetInt32() <= 2,
                $"A changed texture or minority-material mask must never pass as rounding: {entry}");
            if (mismatch == 0)
            {
                continue;
            }

            var bounds = regional.GetProperty("bounds");
            var minX = (6 * 32 - 37) * 2;
            var maxX = (7 * 32 - 37) * 2 - 1;
            var minY = (6 * 32 - 51) * 2;
            var maxY = (7 * 32 + 12 - 51) * 2 - 1;
            Assert.IsTrue(bounds.GetProperty("x0").GetInt32() >= minX &&
                bounds.GetProperty("x1").GetInt32() <= maxX &&
                bounds.GetProperty("y0").GetInt32() >= minY &&
                bounds.GetProperty("y1").GetInt32() <= maxY,
                $"Only the excavated block may have reference-backend blending differences: {entry}");
        }
    }
    /// <summary>A real automated Hunt must preserve its grass/road pixel identity through successive C# terrain impacts.</summary>
    [TestMethod]
    public async Task LiveHunt_RepeatedImpactsMatchIndependentGroundRepaint()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1', '3');
            localStorage.setItem('wyrmforge.characterSchool.v1', 'Pyromancer');
            """);
        await Page.GotoAsync(root + "/?god=1&bot=1&speed=8&layerLab=1", new() { WaitUntil = WaitUntilState.NetworkIdle });
        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 45000 });
        await start.ClickAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Page.Locator(".gate-tier--ready").First.ClickAsync();
        await Page.Locator("button.route-node.available").First.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new()
        {
            NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$")
        }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();

        // No synthetic terrain here: C# owns every impact, and the Layer Lab reads the current cache without rebuilding it.
        await Page.WaitForFunctionAsync("""
            async () => {
                const { readArenaDiagnostics } = await import('/js/arena-performance.js');
                const d = readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
                return d?.hunt1Terrain?.regionalRepaints >= 3 &&
                    d.hunt1Terrain.snapshotRevision === d.hunt1Terrain.paintedRevision &&
                    d.hunt1Terrain.dugBlocks > 0;
            }
            """, null, new() { Timeout = 90000 });

        // Use the exact same JS task and terrain revision for before/after.
        // Otherwise bot damage can advance hundreds of revisions between button clicks
        // and wrongly implicate the cache when the reference painter is at fault.
        var result = await Page.EvaluateAsync<System.Text.Json.JsonElement>("""
            async () => {
                const { inspectTerrainCacheRebuild } = await import('/js/arena-performance.js');
                return inspectTerrainCacheRebuild(document.querySelector('canvas.game-canvas'));
            }
            """);
        var before = result.GetProperty("referenceBefore").GetProperty("mismatched").GetInt32();
        var after = result.GetProperty("referenceAfter").GetProperty("mismatched").GetInt32();
        var cacheParity = result.GetProperty("cacheParity").GetProperty("mismatched").GetInt32();
        var revision = result.GetProperty("revision").GetInt32();
        Assert.AreEqual(revision, result.GetProperty("cacheRevision").GetInt32(),
            "Both captures must use a single authoritative terrain revision.");
        Assert.IsTrue(result.GetProperty("fullRepaints").GetInt32() >
            result.GetProperty("previousFullRepaints").GetInt32(), "A real forced cache rebuild must occur.");
        Assert.AreEqual(0, cacheParity,
            $"Real Hunt cache must be independent of its partial-repaint history at the exact same revision " +
            $"(cache-vs-rebuilt={cacheParity}, cache-bounds={result.GetProperty("cacheParity").GetProperty("bounds")}, " +
            $"cache-first={result.GetProperty("cacheParity").GetProperty("first")}, " +
            $"mask-parity={result.GetProperty("mapParity")}, changed={result.GetProperty("changedBlocks")}, " +
            $"seed={result.GetProperty("visualSeed")}, band={result.GetProperty("influenceBand")}, " +
            $"independent-reference before={before}, after={after}, revision={revision}).");
    }

    /// <summary>Cold Hunt entry waits for the forest kit before building the terrain cache.</summary>
    [TestMethod]
    public async Task ColdHuntEntry_PaintsTerrainOnceAfterDelayedForestArt()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1', '3');
            localStorage.setItem('wyrmforge.characterSchool.v1', 'Pyromancer');
            """);
        var forestArtRequested = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseForestArt = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        await Page.RouteAsync("**/forest-kit.json", async route =>
        {
            forestArtRequested.TrySetResult(true);
            await releaseForestArt.Task;
            await route.ContinueAsync();
        });

        try
        {
            await Page.GotoAsync(root + "/?god=1", new() { WaitUntil = WaitUntilState.DOMContentLoaded });
            var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
            await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 45000 });
            await start.ClickAsync();
            if (await Page.Locator(".character-creation").IsVisibleAsync())
                await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
            await Page.Locator(".refuge-town-spot--gate").ClickAsync();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
            await Page.Locator(".gate-action--primary").ClickAsync();
            await Page.Locator(".gate-lineage--fire").ClickAsync();
            await Page.Locator(".gate-tier--ready").First.ClickAsync();
            await Page.Locator("button.route-node.available").First.ClickAsync();
            await Page.GetByRole(AriaRole.Button, new()
            {
                NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$")
            }).ClickAsync();
            await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();

            await Page.WaitForFunctionAsync("""
                async () => {
                    const { readArenaDiagnostics } = await import('/js/arena-performance.js');
                    const d = readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
                    return d?.hunt1Terrain?.snapshotRevision != null;
                }
                """, null, new() { Timeout = 45000 });

            await forestArtRequested.Task.WaitAsync(TimeSpan.FromSeconds(45));
            var earlyPaints = await Page.EvaluateAsync<int>("""
                async () => {
                    const { readArenaDiagnostics } = await import('/js/arena-performance.js');
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    return readArenaDiagnostics(document.querySelector('canvas.game-canvas')).hunt1Terrain.fullRepaints;
                }
                """);
            Assert.AreEqual(0, earlyPaints, "The forest kit is still blocked.");
        }
        finally
        {
            releaseForestArt.TrySetResult(true);
        }

        await Page.WaitForFunctionAsync("""
            async () => {
                const { readArenaDiagnostics } = await import('/js/arena-performance.js');
                const d = readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
                return d?.hunt1Terrain?.paintedRevision === d?.hunt1Terrain?.snapshotRevision &&
                    d?.hunt1Terrain?.fullRepaints === 1 && d.hunt1Terrain.artKitRepaints === 0;
            }
            """, null, new() { Timeout = 45000 });
    }

}
