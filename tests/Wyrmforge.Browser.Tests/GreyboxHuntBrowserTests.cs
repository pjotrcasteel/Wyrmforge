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
        await Page.GotoAsync(root + "/?hunt1=1" + extraQuery, new() { WaitUntil = WaitUntilState.NetworkIdle });

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

        await Page.WaitForFunctionAsync(@"async () => {
            const module = await import('/js/arena-performance.js');
            const state = module.readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
            const terrain = state?.hunt1Terrain;
            return terrain?.columns === 32 && terrain?.rows === 60
                && terrain.paintedRevision === terrain.snapshotRevision && terrain.repaints >= 1
                && state?.greyboxLighting === 'shared-gpu' && state?.enemies?.length > 0 && !state?.renderingFailed;
        }", null, new() { Timeout = 60000 });
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"{shot}-{width}.png"), FullPage = false });
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
    }
}
