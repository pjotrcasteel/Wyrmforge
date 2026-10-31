using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>Real Hunter's Chart and real playable Hunt, not an Arena Lab or synthetic scene.</summary>
[TestClass]
public sealed class WorldFirstArenaBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Ar0_ChartNodeAndActualHuntUseSameVersionedSiteAtMobileWidth(int width, int height)
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
        await Page.GotoAsync(root + "/?arenaTerrain=semantic", new() { WaitUntil = WaitUntilState.NetworkIdle });

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
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();

        var node = Page.Locator("button.route-node.available").First;
        var siteId = await node.GetAttributeAsync("data-site-id");
        Assert.IsFalse(string.IsNullOrWhiteSpace(siteId), "Chart nodes must expose the authoritative C# site identity.");
        Assert.AreEqual("1", await node.GetAttributeAsync("data-site-version"));
        Assert.IsGreaterThan(0, int.Parse((await node.GetAttributeAsync("data-site-ports"))!));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"ar0-chart-{width}.png"), FullPage = false });

        // The query parameter is a development-only presentation toggle, never a new gameplay mode.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('arenaTerrain', 'semantic');
            history.replaceState(null, '', url);
        }");
        await node.ClickAsync();
        await Page.GetByRole(AriaRole.Button,
            new() { NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();
        await Page.WaitForFunctionAsync("expected => window.__wyrmforgeAr0Geography?.siteId === expected",
            siteId, new() { Timeout = 45000 });
        Assert.AreEqual("fire", await Page.EvaluateAsync<string>("() => window.__wyrmforgeAr0Geography.regionId"));
        Assert.AreEqual(1, await Page.EvaluateAsync<int>("() => window.__wyrmforgeAr0Geography.version"));
        Assert.IsGreaterThan(0, await Page.EvaluateAsync<int>("() => window.__wyrmforgeAr0Geography.edges.length"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"ar0-live-hunt-{width}.png"), FullPage = false });
    }
    [TestMethod]
    [DataRow(320, 568, "forest-fork")]
    [DataRow(390, 844, "forest-fork")]
    [DataRow(320, 568, "mountain-pass")]
    [DataRow(390, 844, "mountain-pass")]
    [DataRow(390, 844, "mountain-monastery")]
    public async Task Ar1_ForestAndMountain_AuthoritativeSiteShapesAppearInActualPlayableHunts(int width, int height, string kind)
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
        await Page.GotoAsync(root + "/?ar1Geography=1&arenaTerrain=semantic&ar1SiteKind=" + kind,
            new() { WaitUntil = WaitUntilState.NetworkIdle });
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
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        var node = Page.Locator("button.route-node.available").First;
        var monasteryReview = kind == "mountain-monastery";
        Assert.AreEqual(monasteryReview ? "mountain-pass" : kind, await node.GetAttributeAsync("data-site-kind"));
        Assert.IsGreaterThan(0, int.Parse((await node.GetAttributeAsync("data-site-obstacles"))!));
        var siteId = (await node.GetAttributeAsync("data-site-id"))!;
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"ar1-{kind}-chart-{width}.png"), FullPage = false });

        // The game's route transitions may replace the query; keep the diagnostic
        // palette explicit while the C# whole-run geometry authority stays fixed.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('arenaTerrain', 'semantic');
            history.replaceState(null, '', url);
        }");
        await node.ClickAsync();
        await Page.GetByRole(AriaRole.Button,
            new() { NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();
        if (monasteryReview)
        {
            await Page.WaitForFunctionAsync("() => window.__wyrmforgeAr0Geography?.kind !== undefined",
                null, new() { Timeout = 15000 });
            await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"ar1-{kind}-diagnostic-{width}.png"),
                FullPage = false });
        }
        await Page.WaitForFunctionAsync("expected => window.__wyrmforgeAr0Geography?.kind === expected", kind,
            new() { Timeout = 45000 });
        Assert.AreEqual(true, await Page.EvaluateAsync<bool>("() => window.__wyrmforgeAr0Geography.geographyActive"));
        Assert.AreEqual(kind, await Page.EvaluateAsync<string>("() => window.__wyrmforgeAr0Geography.kind"));
        Assert.IsGreaterThan(0, await Page.EvaluateAsync<int>("() => window.__wyrmforgeAr0Geography.obstacleCount"));
        var renderedSiteId = await Page.EvaluateAsync<string>("() => window.__wyrmforgeAr0Geography.siteId");
        if (monasteryReview)
        {
            Assert.AreNotEqual(siteId, renderedSiteId, "Review must display the real generated Elder monastery site, not an opening-trail repaint.");
            Assert.IsGreaterThanOrEqualTo(9, await Page.EvaluateAsync<int>("() => window.__wyrmforgeAr0Geography.monasteryStructureCount"));
            Assert.IsGreaterThan(20, await Page.EvaluateAsync<int>("() => window.__wyrmforgeAr0Geography.terrainPatchCount"));
        }
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"ar1-{kind}-live-hunt-{width}.png"), FullPage = false });

        // Review-only geography inset: same live Hunt canvas, same C# polygons,
        // with an explicit viewport rectangle and player position for context.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('ar1Review', '1');
            history.replaceState(null, '', url);
        }");
        await Page.WaitForFunctionAsync("expected => window.__wyrmforgeAr1Review?.siteId === expected",
            renderedSiteId, new() { Timeout = 45000 });
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"ar1-{kind}-geography-review-{width}.png"),
            FullPage = false });
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.delete('ar1Review');
            history.replaceState(null, '', url);
        }");

        // Move the real C# hunter through the actual Hunt simulation and camera.
        // This must never be a fabricated overview or a still from a separate lab.
        await Page.Keyboard.DownAsync("w");
        await Page.WaitForTimeoutAsync(1000);
        await Page.Keyboard.UpAsync("w");
        await Page.Keyboard.DownAsync("d");
        await Page.WaitForTimeoutAsync(800);
        await Page.Keyboard.UpAsync("d");
        Assert.AreEqual(renderedSiteId, await Page.EvaluateAsync<string>("() => window.__wyrmforgeAr0Geography.siteId"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"ar1-{kind}-traversal-{width}.png"), FullPage = false });
    }

}
