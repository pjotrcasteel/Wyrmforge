using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class ArenaApprovedGroundBrowserTests : PageTest
{
    [TestMethod]
    public async Task Mobile_ArenaGroundFoundation_OnlyApprovedGroundIsRendered()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/arena-lab?seed=1204",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Natural Terrain & Forest Trails" }))
            .ToBeVisibleAsync();
        var canvas = Page.Locator(".arena-stage canvas");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-ready", "true",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 45000 });
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-mode", "trails");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-trails", "2");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-seed", "1204");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-assets", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-roads", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-collision", "0");
        await Expect(Page.Locator(".arena-lab .arena-tools input[type='checkbox']")).ToHaveCountAsync(0);
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Hit prop" })).ToHaveCountAsync(0);

        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifacts, "arena-ground-foundation-natural-390.png"),
        });

        await Page.GetByRole(AriaRole.Button, new() { Name = "Natural ground" }).ClickAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-mode", "natural");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifacts, "arena-step2-reference-natural-390.png"),
        });
        await Page.GetByRole(AriaRole.Button, new() { Name = "Forest trails" }).ClickAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-mode", "trails");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifacts, "arena-step2-trails-390.png"),
        });
        await Page.GetByRole(AriaRole.Button, new() { Name = "All grass" }).ClickAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-mode", "grass");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-ready", "true",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 45000 });
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifacts, "arena-ground-foundation-grass-390.png"),
        });
    }
}
