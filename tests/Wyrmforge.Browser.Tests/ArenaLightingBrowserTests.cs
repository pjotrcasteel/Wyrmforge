using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class ArenaLightingBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_OriginalGround_SharedLightChangesPixelsAndOffRestoresBaseline(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/arena-lighting",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        var canvas = Page.Locator(".lighting-stage canvas");
        await Expect(canvas).ToBeVisibleAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const canvas = document.querySelector('.lighting-stage canvas');
            return canvas?.dataset.lightingReady === 'true' && canvas.dataset.lightingEnabled === 'false';
        }", null, new PageWaitForFunctionOptions { Timeout = 30000 });
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-legacy-assets", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-physics-objects", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-approved-ground", "true");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-objects", "0");

        var baseline = await CanvasPixelHashAsync(canvas);
        var lightingCheckbox = Page.Locator(".lighting-controls input[type='checkbox']").First;
        await lightingCheckbox.CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-enabled", "true");
        var lit = await CanvasPixelHashAsync(canvas);
        Assert.AreNotEqual(baseline, lit, "Lighting On must change actual approved ground pixels.");

        var target = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(target);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(target, $"arena-lighting-l1-on-{width}.png"),
        });

        await lightingCheckbox.UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-enabled", "false");
        // The source ground atlas, color and material masks must be untouched by the renderer.
        Assert.AreEqual(baseline, await CanvasPixelHashAsync(canvas),
            "Lighting Off must restore precisely the original approved ground rendering.");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(target, $"arena-lighting-l1-off-{width}.png"),
        });
    }

    private static Task<uint> CanvasPixelHashAsync(ILocator canvas) =>
        canvas.EvaluateAsync<uint>(@"canvas => {
            const pixels = canvas.getContext('2d')
                .getImageData(0, 0, canvas.width, canvas.height).data;
            let hash = 2166136261;
            for (let i = 0; i < pixels.length; i++)
                hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
            return hash >>> 0;
        }");
}
