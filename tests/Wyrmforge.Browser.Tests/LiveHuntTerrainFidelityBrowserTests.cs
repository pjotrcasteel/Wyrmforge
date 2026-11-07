using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>
/// Runs the actual C# Hunt with authored terrain and enemies, then checks source pixels rather than
/// trusting a synthetic crater. The static road, grass splats and normal-looking world ground
/// must survive combat outside the physical damage and shadow neighbourhood.
/// </summary>
[TestClass]
public sealed class LiveHuntTerrainFidelityBrowserTests : PageTest
{
    /// <summary>
    /// Repeat the owner's iPhone sequence: enter Trail 1, observe combat, then compare source
    /// terrain before and after the first and third additional kill.
    /// </summary>
    [TestMethod]
    public async Task LiveTrail_ThreeKillsDoNotRetextureUnaffectedRoadOrForest()
    {
        const int width = 390, height = 844;
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var pageErrors = new List<string>();
        Page.PageError += (_, error) => pageErrors.Add(error);
        await Page.GotoAsync(root + "/?hunt1=1&god=1&bot=road&testSeed=1204&speed=3&bright=1&perf=1",
            new() { WaitUntil = WaitUntilState.NetworkIdle });

        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^START GAME") });
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
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();

        // Wait for the real late-loaded forest art, otherwise the legitimate initial art transition
        // would be misclassified as a combat repaint.
        await ArenaBrowserWait.UntilAsync(Page, """
            const kit = (await import('/js/forest-kit.js')).forestKit();
            return Boolean(kit && state?.worldReady && state?.hunt1Terrain?.paintedRevision ===
                state?.hunt1Terrain?.snapshotRevision && state?.greyboxLighting === 'shared-gpu');
            """, 90000, "the real Hunt has painted terrain and decoded forest art");

        var baseline = await CaptureAsync("start", output);
        var initialKills = baseline.GetProperty("kills").GetInt32();
        await ArenaBrowserWait.UntilAsync(Page,
            $"return (state?.hud?.kills ?? 0) >= {initialKills + 1} && " +
            "state?.hunt1Terrain?.paintedRevision === state?.hunt1Terrain?.snapshotRevision;",
            120000, "an actual Fireball kill with the updated C# voxel frame");
        var firstKill = await CaptureAsync("first-kill", output);

        await ArenaBrowserWait.UntilAsync(Page,
            $"return (state?.hud?.kills ?? 0) >= {initialKills + 3} && " +
            "state?.hunt1Terrain?.paintedRevision === state?.hunt1Terrain?.snapshotRevision;",
            150000, "three real kills with C# voxel and road updates");
        var thirdKill = await CaptureAsync("third-kill", output);
        Assert.IsEmpty(pageErrors, string.Join(Environment.NewLine, pageErrors));

        CompareUnexcavatedSourcePixels(baseline, firstKill);
        CompareUnexcavatedSourcePixels(baseline, thirdKill);
        Assert.AreEqual(baseline.GetProperty("band").GetInt32(), thirdKill.GetProperty("band").GetInt32(),
            "the real Trail must keep its original regional Wyrm influence, not silently change palettes");
        Assert.AreEqual(baseline.GetProperty("seed").GetInt32(), thirdKill.GetProperty("seed").GetInt32(),
            "combat must not regenerate a different forest or road seed");
        Assert.AreEqual(baseline.GetProperty("road").GetRawText(), thirdKill.GetProperty("road").GetRawText(),
            "the C# authored road geometry must remain unchanged through enemy deaths and terrain damage");
        Assert.IsGreaterThan(8, baseline.GetProperty("road").GetArrayLength(),
            "the real first Trail must have the authored curving road, not a simplified replacement");
    }

    private async Task<JsonElement> CaptureAsync(string label, string directory)
    {
        var json = await Page.EvaluateAsync<string>("""
            async () => {
                const module = await import('/js/arena-performance.js');
                const element = document.querySelector('canvas.game-canvas');
                const state = module.readArenaDiagnostics(element);
                const map = module.renderArenaMapOverview(element);
                if (!map || !state?.hunt1Terrain) throw new Error('No authoritative terrain overview');
                const image = new Image();
                image.src = map.png;
                await image.decode();
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                context.drawImage(image, 0, 0);
                const pixelWidth = map.face * map.scale;
                const pixelPad = map.pad * map.scale;
                const hashes = [];
                for (let row = 0; row < map.rows; row++)
                    for (let column = 0; column < map.columns; column++) {
                        const pixels = context.getImageData(column * pixelWidth,
                            pixelPad + row * pixelWidth, pixelWidth, pixelWidth).data;
                        let hash = 2166136261 >>> 0;
                        for (let index = 0; index < pixels.length; index++) {
                            hash ^= pixels[index];
                            hash = Math.imul(hash, 16777619) >>> 0;
                        }
                        hashes.push(hash);
                    }
                return JSON.stringify({ png: map.png, hashes, columns: map.columns, rows: map.rows,
                    kills: state.hud?.kills ?? 0, seconds: state.hud?.seconds ?? 0,
                    seed: map.visualSeed, band: map.band, road: map.road,
                    dug: map.dug, terrain: state.hunt1Terrain });
            }
            """);
        using var parsed = JsonDocument.Parse(json);
        var sample = parsed.RootElement.Clone();
        var dataUrl = sample.GetProperty("png").GetString()!;
        await File.WriteAllBytesAsync(Path.Combine(directory, $"live-ground-{label}.png"),
            Convert.FromBase64String(dataUrl[(dataUrl.IndexOf(',') + 1)..]));
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(directory, $"live-hunt-{label}.png"),
            FullPage = false,
        });
        return sample;
    }

    private static void CompareUnexcavatedSourcePixels(JsonElement before, JsonElement after)
    {
        var columns = before.GetProperty("columns").GetInt32();
        var rows = before.GetProperty("rows").GetInt32();
        Assert.AreEqual(columns, after.GetProperty("columns").GetInt32());
        Assert.AreEqual(rows, after.GetProperty("rows").GetInt32());

        var dug = new HashSet<int>(before.GetProperty("dug").EnumerateArray().Select(x => x.GetInt32()));
        dug.UnionWith(after.GetProperty("dug").EnumerateArray().Select(x => x.GetInt32()));
        var excluded = new HashSet<int>();
        // Five-block halo includes cliff overdraw, microcolumn fronts, cast shadows and decals.
        foreach (var changed in dug)
            for (var dy = -5; dy <= 5; dy++)
                for (var dx = -5; dx <= 5; dx++)
                {
                    var row = changed / columns + dy;
                    var column = changed % columns + dx;
                    if (row >= 0 && row < rows && column >= 0 && column < columns)
                        excluded.Add(row * columns + column);
                }

        var earlier = before.GetProperty("hashes").EnumerateArray().Select(x => x.GetUInt32()).ToArray();
        var later = after.GetProperty("hashes").EnumerateArray().Select(x => x.GetUInt32()).ToArray();
        Assert.HasCount(columns * rows, earlier);
        Assert.HasCount(columns * rows, later);
        var mismatches = new List<int>();
        var examined = 0;
        for (var index = 0; index < earlier.Length; index++)
        {
            if (excluded.Contains(index)) continue;
            examined++;
            if (earlier[index] != later[index]) mismatches.Add(index);
        }
        Assert.IsGreaterThan(150, examined, "need enough unexcavated ground to verify visual stability");
        Assert.IsEmpty(mismatches,
            $"The real Hunt restyled {mismatches.Count} undamaged 1m cells after " +
            $"{after.GetProperty("kills").GetInt32()} kills. First cells: {string.Join(",", mismatches.Take(20))}. " +
            $"Terrain: {after.GetProperty("terrain")}");
    }
}
