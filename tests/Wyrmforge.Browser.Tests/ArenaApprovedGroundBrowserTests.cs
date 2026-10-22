using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class ArenaApprovedGroundBrowserTests : PageTest
{
    [TestMethod]
    public async Task Mobile_WetForest_ApprovedGroundIsOptionalAndPreservesPlayableArena()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/arena-lab?habitat=WetForest&seed=1204",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        var canvas = Page.Locator(".arena-stage canvas");
        await Expect(canvas).ToBeVisibleAsync();
        var toggle = Page.GetByRole(AriaRole.Checkbox, new() { Name = "Approved ground preview" });
        await Expect(toggle).Not.ToBeCheckedAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-ground-preview", "canonical",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 30000 });

        await toggle.CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-ground-preview", "approved",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 30000 });
        await Expect(canvas).ToHaveAttributeAsync("data-ground-preview-seed", "1204");
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifacts, "arena-approved-ground-wetforest-390.png"),
        });
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Walk" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Hit prop" })).ToBeVisibleAsync();

        await toggle.UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-ground-preview", "canonical");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifacts, "arena-canonical-ground-wetforest-390.png"),
        });
    }
}
