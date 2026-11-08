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

        await Page.GetByRole(AriaRole.Button, new() { Name = "CAPTURE GLITCH EVIDENCE" }).ClickAsync();
        var download = Page.Locator("a[download^='wyrmforge-terrain-']");
        await Expect(download).ToBeVisibleAsync(new() { Timeout = 30000 });
        var report = await Page.EvaluateAsync<System.Text.Json.JsonElement>("""
            async () => {
                const link = document.querySelector("a[download^='wyrmforge-terrain-']");
                return await (await fetch(link.href)).json();
            }
            """);
        var before = report.GetProperty("pixelComparison").GetProperty("mismatched").GetInt32();
        var beforeRevision = report.GetProperty("frame").GetProperty("revision").GetInt32();
        var beforeFullRepaints = report.GetProperty("diagnostics").GetProperty("fullRepaints").GetInt32();
        var firstEvidenceUrl = await download.GetAttributeAsync("href");

        // Differential proof from the *same live Hunt*: this click repairs the iPhone glitch.
        // Compare after a real forced full cache rebuild to distinguish faulty regional state
        // from any systematic difference in the reference painter.
        await Page.GetByRole(AriaRole.Button, new() { Name = "REBUILD GROUND NOW" }).ClickAsync();
        await Page.WaitForFunctionAsync("""
            async previous => {
                const { readArenaDiagnostics } = await import('/js/arena-performance.js');
                const d = readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
                return d?.hunt1Terrain?.fullRepaints > previous;
            }
            """, beforeFullRepaints, new() { Timeout = 30000 });
        await Page.GetByRole(AriaRole.Button, new() { Name = "CAPTURE GLITCH EVIDENCE" }).ClickAsync();
        await Page.WaitForFunctionAsync("""
            oldUrl => {
                const link = document.querySelector("a[download^='wyrmforge-terrain-']");
                return link && link.getAttribute('href') !== oldUrl && link.style.display !== 'none';
            }
            """, firstEvidenceUrl, new() { Timeout = 30000 });
        var rebuilt = await Page.EvaluateAsync<System.Text.Json.JsonElement>("""
            async () => {
                const link = document.querySelector("a[download^='wyrmforge-terrain-']");
                return await (await fetch(link.href)).json();
            }
            """);
        var after = rebuilt.GetProperty("pixelComparison").GetProperty("mismatched").GetInt32();
        var afterRevision = rebuilt.GetProperty("frame").GetProperty("revision").GetInt32();
        Assert.AreEqual(0, after,
            $"Manual full rebuild must match the independent reference (before={before}, after={after}, revisions={beforeRevision}/{afterRevision}).");
        Assert.AreEqual(0, before,
            $"Regional impacts must match an independent full repaint (before={before}, after full rebuild={after}).");
    }

}
