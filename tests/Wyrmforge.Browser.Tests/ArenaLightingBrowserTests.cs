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
            return canvas?.dataset.lightingReady === 'true' && canvas.dataset.lightingEnabled === 'true';
        }", null, new PageWaitForFunctionOptions { Timeout = 30000 });
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-legacy-assets", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-physics-objects", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-approved-ground", "true");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-objects", "0");

        var lightingCheckbox = Page.Locator(".lighting-controls input[type='checkbox']").First;
        await Expect(canvas).ToHaveAttributeAsync("data-gothic-night", "true");
        await Expect(canvas).ToHaveAttributeAsync("data-fire-calibration", "true");
        var lit = await CanvasPixelHashAsync(canvas);
        var calibrationFire = Page.Locator(".lighting-controls input[type='checkbox']").Nth(2);
        await calibrationFire.UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-fire-calibration", "false");
        Assert.AreNotEqual(lit, await CanvasPixelHashAsync(canvas),
            "Real darkness must visibly respond when its fire source disappears.");
        // Pure 90% black over unchanged approved ground must leave near-black
        // channels across the actual pixels; no broad bright ambient remains.
        var darkMaximum = await CanvasMaximumRgbAsync(canvas);
        Assert.IsLessThanOrEqualTo(28, darkMaximum,
            "With no flame, every approved ground pixel must be genuinely near-black.");
        var nightEvidence = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(nightEvidence);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(nightEvidence, $"arena-gothic-night-no-fire-{width}.png"),
        });
        await calibrationFire.CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-fire-calibration", "true");
        Assert.AreEqual(lit, await CanvasPixelHashAsync(canvas),
            "Restoring the same physical light and ground must restore the exact original image.");
        Assert.IsGreaterThan(darkMaximum + 45, await CanvasMaximumRgbAsync(canvas),
            "Real firelight must produce bright, high-contrast light against genuine darkness.");

        var target = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(target);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(target, $"arena-gothic-night-fire-on-{width}.png"),
        });

        await lightingCheckbox.UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-enabled", "false");
        var baseline = await CanvasPixelHashAsync(canvas);
        Assert.AreNotEqual(lit, baseline, "The unlit approved material texture must differ from nighttime firelight.");
        await lightingCheckbox.CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-enabled", "true");
        Assert.AreEqual(lit, await CanvasPixelHashAsync(canvas),
            "Night light On must restore precisely the previous approved ground and fire rendering.");
        await lightingCheckbox.UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-enabled", "false");
        Assert.AreEqual(baseline, await CanvasPixelHashAsync(canvas),
            "Disabling lighting again must preserve the untouched approved ground.");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(target, $"arena-gothic-night-original-ground-{width}.png"),
        });
    }

    private static Task<int> CanvasMaximumRgbAsync(ILocator canvas) =>
        canvas.EvaluateAsync<int>(@"canvas => {
            const p = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            let max = 0;
            for (let i = 0; i < p.length; i += 4)
                max = Math.max(max, p[i], p[i + 1], p[i + 2]);
            return max;
        }");

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
