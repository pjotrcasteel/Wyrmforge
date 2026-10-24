using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class ArenaGroundLightReviewBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task GroundReview_SingleMaterialAndSharedLighting_RemainIsolated(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root))
        {
            Assert.Inconclusive("Requires the published Blazor application.");
            return;
        }

        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/arena-ground-light-review");
        var canvas = Page.Locator(".ground-review canvas");
        await Expect(canvas).ToHaveAttributeAsync("data-ready", "true", new() { Timeout = 90000 });
        // Canvas can be GPU-ready before the global WASM ignition overlay has finished fading.
        // Never publish "in-game" evidence while the startup screen is still over the world.
        await Page.Locator("#wyrmforge-ignition").WaitForAsync(new()
        {
            State = WaitForSelectorState.Detached,
            Timeout = 90000,
        });
        Assert.AreEqual("1", await canvas.GetAttributeAsync("data-objects"), "No old trees or props in this scene.");
        Assert.AreEqual("grass", await canvas.GetAttributeAsync("data-material"));

        await Page.EvaluateAsync("async () => { window.groundProof = await import('./js/lighting/ground-only-review.js'); }");
        Assert.IsTrue(await canvas.EvaluateAsync<bool>(
            "c => groundProof.groundReviewPixels(c).some((v,i) => i%4!==3 && v>0)"),
            "Actual shared GPU renderer must light the original ground albedo.");
        await CaptureAsync(canvas, width, "grass-fire");

        await Page.GetByLabel("Ground", new() { Exact = true }).SelectOptionAsync("mud");
        await Expect(canvas).ToHaveAttributeAsync("data-material", "mud");
        Assert.AreEqual("1", await canvas.GetAttributeAsync("data-objects"));
        await CaptureAsync(canvas, width, "mud-fire");

        await Page.GetByLabel("Ground", new() { Exact = true }).SelectOptionAsync("grass");
        await Page.GetByLabel("Light", new() { Exact = true }).SelectOptionAsync("moon");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting", "moon");
        await CaptureAsync(canvas, width, "grass-moon");

        await Page.GetByLabel("Light", new() { Exact = true }).SelectOptionAsync("neutral");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting", "neutral");
        await CaptureAsync(canvas, width, "grass-neutral");

        await Page.GetByLabel("Light", new() { Exact = true }).SelectOptionAsync("zero");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting", "zero");
        Assert.AreEqual("0", await canvas.GetAttributeAsync("data-lights"));
        Assert.IsTrue(await canvas.EvaluateAsync<bool>(
            "c => groundProof.groundReviewPixels(c).every((v,i) => i%4===3 || v===0)"),
            "Every world RGB pixel must be black when ambient, lights and emission are off.");
        await CaptureAsync(canvas, width, "grass-zero");
        Assert.AreEqual(0, await Page.Locator(".ground-review [role=alert]").CountAsync());
    }

    private static async Task CaptureAsync(ILocator canvas, int width, string name)
    {
        var dir = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS");
        if (string.IsNullOrWhiteSpace(dir)) return;
        Directory.CreateDirectory(dir);
        await canvas.ScreenshotAsync(new() { Path = Path.Combine(dir, $"ground-{width}-{name}.png") });
    }
}
