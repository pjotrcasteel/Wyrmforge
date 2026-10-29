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
}
