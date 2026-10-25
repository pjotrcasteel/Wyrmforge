using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>Non-destructive T0 screenshots of the production Town, not the GPU proof scene.</summary>
[TestClass]
public sealed class TownT0BaselineBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    [DataRow(1280, 800)]
    public async Task TownT0_CanonicalDistricts_CaptureRuntimeBaseline(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires the running WyrmForge app."); return; }
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');");
        await Page.GotoAsync(root.TrimEnd('/') + "/?townNpcCount=14", new() { WaitUntil = WaitUntilState.NetworkIdle });
        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 30000 });
        await start.ClickAsync();
        await Expect(Page.Locator(".character-creation, .town-square")).ToBeVisibleAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
        await Expect(Page.Locator(".refuge-canonical-scene .refuge-town-night-base")).ToBeVisibleAsync();
        await Page.Locator(".refuge-town-night-base").EvaluateAsync("img => img.decode()");
        var view = Page.Locator(".refuge-canonical-viewport");
        foreach (var (district, index) in new[] { ("west", 0), ("center", 1), ("east", 2) })
        {
            await view.EvaluateAsync("(el, district) => window.wyrmforgeTown.show(district, false)", index);
            await Page.WaitForTimeoutAsync(150);\n            await Page.ScreenshotAsync(new()
            {
                Path = Path.Combine(artifacts, $"t0-town-{district}-{width}x{height}.png"),
                FullPage = true
            });
        }
        Assert.AreEqual(5, await Page.Locator(".refuge-town-spot").CountAsync(),
            "Four building hotspots and the World Gate must remain available.");
    }
}
