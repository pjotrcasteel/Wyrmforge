using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Text.RegularExpressions;

namespace Wyrmforge.Browser.Tests;

/// <summary>Production Town → Chart → Hunt, with no legacy terrain query or synthetic Arena Lab.</summary>
[TestClass]
public sealed class GreyboxHuntBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task DefaultHunt_HasFlatOneMetreGreyboxWithEnemiesAndNoTerrain(int width, int height)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.NetworkIdle });

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

        // Read the actual render module attached to the gameplay Canvas, not a duplicate simulation.
        await Page.WaitForFunctionAsync(@"async () => {
            const canvas = document.querySelector('canvas.game-canvas');
            const module = await import('/js/arena-performance.js');
            const state = module.readArenaDiagnostics(canvas);
            return state?.worldReady === true && state?.terrainPresentation === 'one-meter-greybox'
                && state?.enemies?.length > 0;
        }", null, new() { Timeout = 45000 });

        // The grey C# receiver is painted by the same shared GPU LightingEngine
        // that lights ordinary actors and projects C# shadows. A flat bypass
        // or a second renderer must not satisfy this real-Hunt check.
        await Page.WaitForFunctionAsync(@"async () => {
            const module = await import('/js/arena-performance.js');
            const state = module.readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
            const grid = state?.greybox;
            return grid?.cellSizeMeters === 1 && grid?.pixelsPerFace === 32
                && grid?.microcellsPerAxis === 8 && grid?.groundBaseMeters === 0
                && grid?.groundTopMeters === 1 && state?.wetForestGround == null
                && state?.greyboxLighting === 'shared-gpu'
                && state?.gpuWorld?.quality === 'mobile' && state.gpuWorld?.objects > 2
                && state.gpuWorld?.lights?.some(light => light.id === 'hunter:night-visibility')
                && !state?.renderingFailed;
        }", null, new() { Timeout = 45000 });

        // The source color stays untextured #808080, but lighting MUST change
        // its pixels. Require a distributed lit floor, not merely a bright VFX pixel
        // or a technically initialized GPU with a black output framebuffer.
        await Page.WaitForFunctionAsync(@"() => {
            const canvas = document.querySelector('canvas.game-canvas');
            if (!canvas?.width || !canvas?.height) return false;
            const x = Math.floor(canvas.width * .18), y = Math.floor(canvas.height * .25);
            const w = Math.floor(canvas.width * .64), h = Math.floor(canvas.height * .5);
            const pixels = canvas.getContext('2d').getImageData(x, y, w, h).data;
            let readable = 0, totalBrightness = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                const brightness = pixels[i] + pixels[i + 1] + pixels[i + 2];
                totalBrightness += brightness;
                if (brightness >= 30) readable++;
            }
            const count = pixels.length / 4;
            return readable >= count * .16 && totalBrightness >= count * 14;
        }", null, new() { Timeout = 30000 });
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"default-greybox-hunt-{width}.png"), FullPage = false });
    }

    /// <summary>Hunt 1.0 H5.1: the opt-in C# heightfield is streamed to the browser and painted under the shared GPU lighting.</summary>
    [TestMethod]
    [DataRow(320, 568, "", "hunt1-terrain")]
    [DataRow(390, 844, "", "hunt1-terrain")]
    [DataRow(390, 844, "&blockInset=1", "hunt1-block-inset")]
    [DataRow(320, 568, "&bright=1", "hunt1-terrain-bright")]
    [DataRow(390, 844, "&bright=1", "hunt1-terrain-bright")]
    [DataRow(390, 844, "&bright=1&blockInset=1", "hunt1-block-inset-bright")]
    [DataRow(390, 844, "&perf=1&bright=1", "hunt1-perf")]
    [DataRow(320, 568, "&shear=1&bright=1", "hunt1-shear-bright")]
    [DataRow(390, 844, "&shear=1&bright=1", "hunt1-shear-bright")]
    [DataRow(390, 844, "&shear=1&bright=1&blockInset=1", "hunt1-shear-inset")]
    public async Task Hunt1Terrain_StreamsTheCSharpHeightfieldAndPaintsItUnderSharedLighting(int width, int height, string extraQuery, string shot)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        var requests = new List<string>();
        Page.Request += (_, request) => requests.Add(request.Url);
        // Hosted Chromium can render the taller 390px viewport slowly under the shared GPU.
        // Advance simulation time without changing the terrain/lighting renderer; this is a paint contract, not an FPS benchmark.
        await Page.GotoAsync(root + "/?hunt1=1&speed=3&god=1" + extraQuery, new() { WaitUntil = WaitUntilState.NetworkIdle });

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

        await ArenaBrowserWait.UntilAsync(Page, @"
            const terrain = state?.hunt1Terrain;
            return terrain?.columns === 32 && terrain?.rows === 60
                && terrain.paintedRevision === terrain.snapshotRevision && terrain.repaints >= 1
                && (state?.hud?.seconds ?? 0) >= 5
                && state?.greyboxLighting === 'shared-gpu' && state?.enemies?.length > 0 && !state?.renderingFailed;", 90000,
            "the Hunt 1.0 terrain painted under shared GPU lighting five seconds into the Hunt");
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        // The painted Wet Forest ground banks must never come back through a hidden fallback.
        var legacyGround = requests.Where(url => Regex.IsMatch(url, @"art-candidates|wet-forest[^/]*\.(png|webp|jpe?g)|ground-(bank|texture)", RegexOptions.IgnoreCase)).ToList();
        Assert.AreEqual(0, legacyGround.Count, "legacy ground art requested: " + string.Join(", ", legacyGround));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"{shot}-{width}.png"), FullPage = false });
        var canvasData = await Page.EvaluateAsync<string>("() => document.querySelector('canvas.game-canvas').toDataURL('image/png')");
        await File.WriteAllBytesAsync(Path.Combine(output, $"{shot}-{width}-canvas.png"), Convert.FromBase64String(canvasData[(canvasData.IndexOf(',') + 1)..]));
        var shotState = await Page.EvaluateAsync<string>(@"async () => {
            const m = await import('/js/arena-performance.js');
            const s = m.readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
            return JSON.stringify({ seconds: s.hud?.seconds, gpu: s.greyboxLighting, ambient: s.sharedLighting?.environment?.ambient, debug: s.debug, perf: s.perfReport, projection: s.gpuWorld?.projection, gpuScene: s.gpuScene, hudSize: [document.querySelector('canvas.game-canvas').clientWidth, document.querySelector('canvas.game-canvas').clientHeight], player: s.player, world: s.world, search: location.search, gpuError: s.gpuWorld?.error, renderError: s.renderError });
        }");
        await File.WriteAllTextAsync(Path.Combine(output, $"{shot}-{width}.json"), shotState);
        if (shot.StartsWith("hunt1-shear"))
            Assert.AreEqual("metric", System.Text.Json.JsonDocument.Parse(shotState).RootElement.GetProperty("projection").GetString());
        if (shot == "hunt1-perf")
        {
            var perf = System.Text.Json.JsonDocument.Parse(shotState).RootElement.GetProperty("perf");
            Assert.IsTrue(perf.GetProperty("samples").GetInt32() > 30, "the sampler must record real render frames: " + perf);
            Assert.IsTrue(perf.GetProperty("terrainRepaints").GetInt32() >= 1, "terrain repaints are counted");
            Assert.AreEqual("gpu", perf.GetProperty("renderer").GetString());
        }
    }

    /// <summary>Review captures: the debug bot walks the arena and a screenshot is saved every few seconds, so trees, rocks and ground can be judged along the route.</summary>
    [TestMethod]
    [DataRow(0, "", "n")]
    [DataRow(0, "&bright=1", "bright")]
    [DataRow(0, "&ambient=1.4", "a14")]
    [DataRow(0, "&moonShadows=1", "moon")]
    [DataRow(2, "&ambient=1.0", "a10")]
    public async Task Hunt1Forest_ReviewTourCapturesTheArenaAlongTheRoute(int band, string lighting, string tag)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        await Page.GotoAsync(root + $"/?hunt1=1&band={band}{lighting}&god=1&bot=1&speed=3", new() { WaitUntil = WaitUntilState.NetworkIdle });
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
        await ArenaBrowserWait.UntilAsync(Page, @"return state?.hunt1Terrain?.paintedRevision === state?.hunt1Terrain?.snapshotRevision && state?.greyboxLighting === 'shared-gpu' && !state?.renderingFailed;", 60000, "the terrain painted");
        for (var shot = 0; shot < 8; shot++)
        {
            await Page.WaitForTimeoutAsync(3500);
            if (!await Page.Locator("canvas.game-canvas").IsVisibleAsync()) break;
            await Page.Locator("canvas.game-canvas").ScreenshotAsync(new() { Path = Path.Combine(output, $"forest-b{band}-{tag}-{shot}.png") });
        }
        await File.WriteAllTextAsync(Path.Combine(output, $"forest-b{band}-{tag}-diag.json"), await Page.EvaluateAsync<string>("async () => { const m = await import('/js/arena-performance.js'); const s = m.readArenaDiagnostics(document.querySelector('canvas.game-canvas')); return JSON.stringify({ performance: s.performance, gpu: s.gpuWorld, renderError: s.renderError }); }"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    /// <summary>Design review: the whole arena (terrain, trees, bushes, boulders) as one unlit image at art density, to zoom into and mark up.</summary>
    [TestMethod]
    [DataRow(0)]
    [DataRow(1)]
    [DataRow(2)]
    [DataRow(3)]
    public async Task Hunt1Forest_MapOverviewCapturesTheWholeArena(int band)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        // The band is chosen by the C# Wyrm Influence (the generator adds lava, fissures and scars from the Burning band), not just the palette.
        await Page.GotoAsync(root + $"/?hunt1=1&influence={new[] { 0.1, 0.4, 0.7, 0.95 }[band].ToString(System.Globalization.CultureInfo.InvariantCulture)}&god=1", new() { WaitUntil = WaitUntilState.NetworkIdle });
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
        await ArenaBrowserWait.UntilAsync(Page, @"return state?.hunt1Terrain?.paintedRevision === state?.hunt1Terrain?.snapshotRevision && !state?.renderingFailed;", 60000, "the terrain painted");
        await Page.WaitForTimeoutAsync(5000); // the forest kit repaints the ground cover once it has downloaded
        var json = await Page.EvaluateAsync<string>(@"async () => {
            const m = await import('/js/arena-performance.js');
            const r = m.renderArenaMapOverview(document.querySelector('canvas.game-canvas'));
            return JSON.stringify(r);
        }");
        var overview = System.Text.Json.JsonDocument.Parse(json).RootElement;
        var data = overview.GetProperty("png").GetString()!;
        await File.WriteAllBytesAsync(Path.Combine(output, $"arena-overview-b{band}.png"), Convert.FromBase64String(data[(data.IndexOf(',') + 1)..]));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    /// <summary>Hunt 1.0 H0.3: with the debug bot and accelerated time, the first trail clears and the real exit returns to the Chart.</summary>
    [TestMethod]
    [DataRow("")]
    [DataRow("&hunt1=1")]
    public async Task FirstTrail_IsClearedAndLeftThroughTheRealExitBackToTheChart(string extraQuery)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        await Page.GotoAsync(root + "/?speed=10&god=1&bot=1" + extraQuery, new() { WaitUntil = WaitUntilState.NetworkIdle });
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

        // The debug bot kites and then walks to the real exit; the Chart must come back with the trail cleared.
        try
        {
            await Page.GetByRole(AriaRole.Button, new() { Name = "Continue" }).ClickAsync(new() { Timeout = 150000 });
            await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync(new() { Timeout = 30000 });
        }
        catch
        {
            var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
            Directory.CreateDirectory(output);
            await Page.ScreenshotAsync(new() { Path = Path.Combine(output, "first-trail-stuck.png") });
            var state = await Page.EvaluateAsync<string>(@"async () => {
                const module = await import('/js/arena-performance.js');
                const s = module.readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
                return JSON.stringify({ debug: s?.debug, hud: { kills: s?.hud?.kills, hp: s?.hud?.health, t: s?.hud?.seconds },
                    paused: s?.paused, ended: s?.ended, exit: s?.exit, exitPorts: s?.exitPorts,
                    p: s?.player && [Math.round(s.player.x), Math.round(s.player.y)], enemies: s?.enemies?.length,
                    overlays: [...document.querySelectorAll('[role=dialog]')].map(e => e.getAttribute('aria-label')) });
            }");
            Assert.Fail("first trail did not return to the Chart: " + state);
        }
        await Expect(Page.Locator(".map-run-progress")).ToContainTextAsync("1 cleared");
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    /// <summary>Hunt 1.0 H0.3: the whole Fire Tier-I loop in a real browser, driven only by the URL debug switches and visible buttons.</summary>
    [TestMethod]
    [DataRow("&hunt1=1")]
    public async Task FullHunt_TownToWyrmAndBackToTown(string extraQuery)
    {
        if (Environment.GetEnvironmentVariable("WYRMFORGE_FULL_HUNT") != "1") Assert.Inconclusive("Opt-in soak test: set WYRMFORGE_FULL_HUNT=1 (it plays a whole Hunt and can take several minutes).");
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        var consoleErrors = new List<string>();
        Page.Console += (_, message) => { if (message.Type == "error") consoleErrors.Add(message.Text.Length > 300 ? message.Text[..300] : message.Text); };
        await Page.GotoAsync(root + "/?speed=12&god=1&bot=1" + extraQuery, new() { WaitUntil = WaitUntilState.NetworkIdle });
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

        var deadline = DateTime.UtcNow.AddMinutes(14);
        var lastChange = DateTime.UtcNow;
        var lastSeen = "";
        var returnedToTown = false;
        var trailsCleared = 0;
        var huntSurvived = false;
        while (DateTime.UtcNow < deadline && !returnedToTown)
        {
            var seen = "";
            if (await Page.GetByRole(AriaRole.Region, new() { Name = "Town square" }).IsVisibleAsync() && trailsCleared > 0) { returnedToTown = true; break; }
            var enter = Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^(Enter (rare )?trail|Face the wyrm|Reclaim the refuge|Take the watchtower)$") });
            if (await Page.GetByText("Choose your trail.", new() { Exact = true }).IsVisibleAsync())
            {
                seen = "chart";
                var lair = Page.Locator("button.route-node.dragon.available");
                var node = await lair.CountAsync() > 0 ? lair.First : Page.Locator("button.route-node.available").First;
                if (await enter.IsEnabledAsync().ConfigureAwait(false) && await Page.Locator("button.route-node.selected").CountAsync() > 0) await enter.ClickAsync();
                else await node.ClickAsync();
            }
            else
            {
                foreach (var label in new[] { "Continue", "Not now", "Return to Wyrmforge", "Leave the realm", "Extract", "Return to Town", "Return to the Refuge" })
                {
                    var button = Page.GetByRole(AriaRole.Button, new() { Name = label });
                    if (await button.CountAsync() > 0 && await button.First.IsVisibleAsync()) { seen = label; if (label == "Continue") trailsCleared++; if (label == "Return to Wyrmforge") huntSurvived = await Page.GetByText("EXTRACTION SUCCESSFUL").IsVisibleAsync(); await button.First.ClickAsync(); break; }
                }
            }
            if (seen != lastSeen || seen != "") { lastSeen = seen; lastChange = DateTime.UtcNow; }
            if (DateTime.UtcNow - lastChange > TimeSpan.FromSeconds(60))
            {
                await Page.ScreenshotAsync(new() { Path = Path.Combine(output, "full-hunt-stuck.png") });
                var state = await Page.EvaluateAsync<string>(@"async () => {
                    const canvas = document.querySelector('canvas.game-canvas');
                    if (!canvas) return 'no canvas; buttons: ' + [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean).slice(0, 12).join(' | ');
                    const module = await import('/js/arena-performance.js');
                    const s = module.readArenaDiagnostics(canvas);
                    return JSON.stringify({ hud: { kills: s?.hud?.kills, hp: s?.hud?.health, t: s?.hud?.seconds }, paused: s?.paused, ended: s?.ended, exit: s?.exit, extraction: s?.extraction, p: s?.player && [Math.round(s.player.x), Math.round(s.player.y)], dragon: s?.dragon && [Math.round(s.dragon.x), Math.round(s.dragon.y)], enemies: s?.enemies?.map(e => [Math.round(e.x), Math.round(e.y)]) });
                }");
                Assert.Fail($"full Hunt stalled after {trailsCleared} cleared trails: {state} | console errors: {string.Join(" || ", consoleErrors.Take(4))}");
            }
            await Page.WaitForTimeoutAsync(500);
        }
        Assert.IsTrue(huntSurvived, "the Hunt must reach its Hunt Survived summary");
        Assert.IsTrue(returnedToTown, $"the Hunt must end back in Town ({trailsCleared} trails cleared, last seen '{lastSeen}')");
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    /// <summary>Hunt 1.0 H6: Fireballs visibly dig layered craters in the live Hunt (grass cap, dirt, stone).</summary>
    [TestMethod]
    [DataRow(320, 568, -1, true)]
    [DataRow(390, 844, -1, true)]
    [DataRow(390, 844, 2, true)]
    [DataRow(390, 844, 3, true)]
    [DataRow(390, 844, 3, false)]
    public async Task Hunt1Terrain_FireballsDigCratersThatReachTheClient(int width, int height, int band, bool bright)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        await Page.GotoAsync(root + "/?hunt1=1&speed=6&god=1&bot=1" + (bright ? "&bright=1" : "") + (band >= 0 ? $"&influence={new[] { 0.1, 0.4, 0.7, 0.95 }[band].ToString(System.Globalization.CultureInfo.InvariantCulture)}" : ""), new() { WaitUntil = WaitUntilState.NetworkIdle });
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

        await ArenaBrowserWait.UntilAsync(Page, @"
            const terrain = state?.hunt1Terrain;
            if (!terrain) return false;
            window.__terrainRevisionAtStart ??= terrain.snapshotRevision;
            return (state.hud?.kills ?? 0) >= 2 && (state.hud?.seconds ?? 0) >= 5
                && terrain.snapshotRevision >= window.__terrainRevisionAtStart + 6
                && terrain.paintedRevision === terrain.snapshotRevision
                && (state.destructionFx?.craters ?? 0) >= 3 && state.destructionFx.heat > 0;", 120000,
            "Fireballs to have dug at least six terrain revisions that the client painted, with live crater heat");
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await File.WriteAllTextAsync(Path.Combine(output, $"craters-diag-{band}-{bright}-{width}.json"), await Page.EvaluateAsync<string>("async () => { const m = await import('/js/arena-performance.js'); const s = m.readArenaDiagnostics(document.querySelector('canvas.game-canvas')); return JSON.stringify({ veins: s.veinSeams, fx: s.destructionFx, debug: s.debug, corruption: s.hunt1Terrain, renderError: s.renderError }); }"));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, band >= 0 ? $"hunt1-craters-band{band}{(bright ? "" : "-night")}-{width}.png" : $"hunt1-craters-{width}.png"), FullPage = false });
    }

    /// <summary>
    /// Hunt 1.0 H6 evidence: the client painter drawing authoritative C# excavation stages (ArenaTerrainExcavationEvidenceTests exports them when
    /// WYRMFORGE_EVIDENCE_DIR is set): grass cap, soil, rock strata, a Meteor Heart bowl and a bitten cliff face. One PNG per stage.
    /// </summary>
    [TestMethod]
    public async Task Hunt1Terrain_ExcavationStagesRenderAsGrassSoilAndRock()
    {
        var evidence = Environment.GetEnvironmentVariable("WYRMFORGE_EVIDENCE_DIR");
        if (string.IsNullOrWhiteSpace(evidence) || !File.Exists(Path.Combine(evidence, "dig-stages.json"))) Assert.Inconclusive("Run ArenaTerrainExcavationEvidenceTests with WYRMFORGE_EVIDENCE_DIR first.");
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.NetworkIdle });
        var json = await File.ReadAllTextAsync(Path.Combine(evidence, "dig-stages.json"));
        var stages = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"async (json) => {
            const m = await import('/js/arena-terrain-canvas.js');
            const { sites, stages } = JSON.parse(json);
            const results = [];
            for (const stage of stages) {
                const site = stage.site === 'soil-ordinary' ? sites.soil : stage.site === 'soil-meteor' ? sites.meteor : sites.cliff;
                if (!site) continue;
                const cache = new m.TerrainCanvasCache();
                cache.update(m.mergeTerrainFrame(null, stage.frame), 0);
                const out = document.createElement('canvas');
                out.width = 448; out.height = 512;
                const g = out.getContext('2d');
                g.imageSmoothingEnabled = false;
                g.fillStyle = '#101010'; g.fillRect(0, 0, 448, 512);
                g.drawImage(cache.canvas, (site.column - 3) * 64, (m.TERRAIN_PAD_UNITS + (site.row - 5) * 32) * 2, 448, 512, 0, 0, 448, 512);
                results.push({ name: `dig-${stage.site}-${String(stage.hits).padStart(2, '0')}`, stone: stage.stoneMicrocolumns, png: out.toDataURL('image/png') });
            }
            return results;
        }", json);
        Assert.IsGreaterThanOrEqualTo(7, stages.GetArrayLength(), "every soil and Meteor Heart stage is rendered");
        foreach (var stage in stages.EnumerateArray())
        {
            var data = stage.GetProperty("png").GetString()!;
            await File.WriteAllBytesAsync(Path.Combine(output, stage.GetProperty("name").GetString() + ".png"), Convert.FromBase64String(data[(data.IndexOf(',') + 1)..]));
        }
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    /// <summary>Hunt 1.0 field ambush: walking into an open field marks the ground on every side, then a ring of enemies bursts out together.</summary>
    [TestMethod]
    public async Task Hunt1Terrain_FieldAmbushMarksTheGroundAllAroundThenBurstsOut()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        await Page.GotoAsync(root + "/?hunt1=1&god=1&bot=road", new() { WaitUntil = WaitUntilState.NetworkIdle });
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
        // The tell lasts about a second, so the frames are grabbed inside the page's own animation frame rather than by a slow screenshot call.
        await Page.EvaluateAsync("""
            async () => {
                const module = await import('/js/arena-performance.js');
                const canvas = document.querySelector('canvas.game-canvas');
                window.__ambush = { tell: null, burst: null, burstFrames: 0 };
                const tick = () => {
                    const state = module.readArenaDiagnostics(canvas), shots = window.__ambush;
                    const ambush = state?.fieldAmbush;
                    if (ambush && ambush.marks.length >= 8 && ambush.progress >= .5 && !shots.tell) shots.tell = canvas.toDataURL('image/png');
                    if (shots.tell && !ambush && !shots.burst && ++shots.burstFrames >= 6) shots.burst = canvas.toDataURL('image/png');
                    requestAnimationFrame(tick);
                };
                tick();
            }
            """);
        await ArenaBrowserWait.UntilAsync(Page, "return Boolean(window.__ambush?.burst);", 150000, "the bot to walk into a field, the ambush tell to show and the ring to burst out", 500);
        foreach (var (name, key) in new[] { ("field-ambush-tell.png", "tell"), ("field-ambush-burst.png", "burst") })
        {
            var url = await Page.EvaluateAsync<string>($"() => window.__ambush.{key}");
            await File.WriteAllBytesAsync(Path.Combine(output, name), Convert.FromBase64String(url[(url.IndexOf(',') + 1)..]));
        }
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    /// <summary>Hunt 1.0 H8: the Chart paints the authoritative Wyrm Influence, rising from a Wet entrance to a Volcanic lair.</summary>
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task HuntChart_ShowsWyrmInfluenceBandsRisingTowardTheLair(int width, int height)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.NetworkIdle });
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
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();

        var bands = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"() => [...document.querySelectorAll('button.route-node')]
            .map(node => ({ stage: Number(node.dataset.stage), dragon: node.classList.contains('dragon'), band: node.dataset.influenceBand }))");
        var order = new[] { "wet", "scorched", "burning", "volcanic" };
        var nodes = bands.EnumerateArray().Select(node => (Stage: node.GetProperty("stage").GetInt32(),
            Dragon: node.GetProperty("dragon").GetBoolean(), Band: Array.IndexOf(order, node.GetProperty("band").GetString()))).ToList();
        Assert.IsTrue(nodes.All(node => node.Band >= 0), "every node carries a known influence band");
        var lair = nodes.Single(node => node.Dragon).Band;
        Assert.AreEqual(3, lair, "the lair sits in Volcanic Devastation");
        Assert.AreEqual(0, nodes.Where(node => !node.Dragon).OrderBy(node => node.Stage).First().Band, "the first trail is Wet Forest");
        var strongestByStage = nodes.Where(node => !node.Dragon).GroupBy(node => node.Stage).OrderBy(group => group.Key).Select(group => group.Max(node => node.Band)).ToList();
        CollectionAssert.AreEqual(strongestByStage.OrderBy(band => band).ToList(), strongestByStage, "influence never falls toward the lair");
        await Expect(Page.Locator(".influence-wash")).ToBeAttachedAsync();
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"hunt1-chart-{width}.png"), FullPage = false });
        await Page.Locator(".hunt-viewport").EvaluateAsync("element => { element.scrollTop = 0; }");
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"hunt1-chart-lair-{width}.png"), FullPage = false });
    }
}
