using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class MaterialLabBrowserTests : PageTest
{
    private const string CanvasSelector = ".materials-lab .material-workspace canvas";

    [TestMethod]
    public async Task Mobile_MaterialLab_FineDetailActuallyChangesCanvasPixelsAndRestoresBaseline()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/arena-materials",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        var canvas = Page.Locator(CanvasSelector);
        await Expect(canvas).ToBeVisibleAsync();

        // Checking the button label alone missed the failure reported on iPhone:
        // the button switched while the canvas was byte-for-byte unchanged.
        await Page.WaitForFunctionAsync(@"() => {
            const canvas = document.querySelector('.materials-lab .material-workspace canvas');
            return canvas?.dataset.materialReady === 'true' && canvas.dataset.fineDetail === 'off';
        }", null, new PageWaitForFunctionOptions { Timeout = 30000 });
        var baseline = await ReadPixelHashAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail Off" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.fineDetail === 'on'");
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail On" }))
            .ToHaveAttributeAsync("aria-pressed", "true");
        var enhanced = await ReadPixelHashAsync();
        Assert.AreNotEqual(baseline, enhanced,
            "Fine detail ON must change real ground pixels, not just the button state.");

        var artifactDir = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifactDir);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifactDir, "material-lab-fine-on-390.png"),
        });

        await Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail On" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.fineDetail === 'off'");
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail Off" }))
            .ToHaveAttributeAsync("aria-pressed", "false");
        var restored = await ReadPixelHashAsync();
        Assert.AreEqual(baseline, restored, "Fine detail OFF must restore the original approved ground.");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifactDir, "material-lab-fine-off-390.png"),
        });
        await Expect(Page.Locator(".material-detail-error")).ToHaveCountAsync(0);
    }

    private async Task<uint> ReadPixelHashAsync() =>
        await Page.Locator(CanvasSelector).EvaluateAsync<uint>(@"canvas => {
            const ctx = canvas.getContext('2d');
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let hash = 2166136261;
            for (let i = 0; i < pixels.length; i++)
                hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
            return hash >>> 0;
        }");
}
