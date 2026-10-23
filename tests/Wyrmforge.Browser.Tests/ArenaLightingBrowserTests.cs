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
    public async Task Mobile_FireballTorchAndNight_BothContrastAndOriginalGroundArePreserved(int width, int height)
    {
        var canvas = await OpenLightingLabAsync(width, height);
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-approved-ground", "true");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-legacy-assets", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-physics-objects", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-gothic-night", "true");

        // Freeze the flying projectile halfway through its actual world-space
        // flight for reproducible captures, without stopping the firelight.
        await Page.Locator("#toggle-animate").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-fireball-progress", "0.500");
        await Expect(canvas).ToHaveAttributeAsync("data-fireball-calibration", "true");
        await Page.Locator("#toggle-torch").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-torch-calibration", "false");
        var fireball = await CanvasPixelHashAsync(canvas);
        var fireballMax = await CanvasMaximumRgbAsync(canvas);
        await SaveScreenshotAsync(canvas, $"arena-l3-mid-air-fireball-{width}.png");

        // The secondary torch is a separate, smaller light source, not
        // just a duplicate fireball shape.
        await Page.Locator("#toggle-torch").CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-torch-calibration", "true");
        Assert.AreNotEqual(fireball, await CanvasPixelHashAsync(canvas));
        await SaveScreenshotAsync(canvas, $"arena-l3-fireball-and-torch-{width}.png");

        await Page.Locator("#toggle-fireball").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-fireball-calibration", "false");
        var torch = await CanvasPixelHashAsync(canvas);
        Assert.AreNotEqual(fireball, torch);
        await SaveScreenshotAsync(canvas, $"arena-l3-torch-alone-{width}.png");

        await Page.Locator("#toggle-torch").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-torch-calibration", "false");
        var darkness = await CanvasPixelHashAsync(canvas);
        var nightMax = await CanvasMaximumRgbAsync(canvas);
        Assert.IsLessThanOrEqualTo(28, nightMax, "Without any real light, approved ground must remain near-black.");
        Assert.IsGreaterThan(nightMax + 45, fireballMax, "Airborne fire must brighten the same environment.");
        await SaveScreenshotAsync(canvas, $"arena-l3-night-no-light-{width}.png");

        await Page.Locator("#toggle-night").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-gothic-night", "false");
        var original = await CanvasPixelHashAsync(canvas);
        Assert.AreNotEqual(darkness, original);
        await SaveScreenshotAsync(canvas, $"arena-l3-original-approved-ground-{width}.png");

        await Page.Locator("#toggle-night").CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-gothic-night", "true");
        Assert.AreEqual(darkness, await CanvasPixelHashAsync(canvas),
            "Restoring night with no emitters must preserve original ground and deterministic darkness.");

        await Page.Locator("#toggle-fireball").CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-fireball-calibration", "true");
        Assert.AreEqual(fireball, await CanvasPixelHashAsync(canvas),
            "Reinstating the same frozen Fireball must reproduce exact material, mist and glow pixels.");
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_OriginalCandidateTrees_L2FeetAndL3FirePreserveIndependentArt(int width, int height)
    {
        var assets = Environment.GetEnvironmentVariable("WYRMFORGE_STEP3_ASSETS");
        var oak = Path.Combine(assets ?? string.Empty, "ancient_oak", "ancient_oak-candidate.png");
        var elm = Path.Combine(assets ?? string.Empty, "dead_elm", "dead_elm-candidate.png");
        if (string.IsNullOrWhiteSpace(assets) || !File.Exists(oak) || !File.Exists(elm))
        {
            Console.WriteLine("Original Step-3 PNG artifact unavailable: only optional unapproved tree composition skipped.");
            return;
        }

        var canvas = await OpenLightingLabAsync(width, height);
        await Page.Locator("#toggle-animate").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-fireball-progress", "0.500");
        await Page.Locator(".lighting-inspector input[type='file']").Nth(0).SetInputFilesAsync(oak);
        await Page.Locator(".lighting-inspector input[type='file']").Nth(1).SetInputFilesAsync(elm);
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-objects", "2");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-physics-objects", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-tree-self-lighting", "2");
        await Expect(canvas).ToHaveAttributeAsync("data-tree-cast-shadows", "2");
        var lit = await CanvasPixelHashAsync(canvas);
        await canvas.EvaluateAsync(@"canvas => {
            canvas.__shadowReference = canvas.getContext('2d')
                .getImageData(0, 0, canvas.width, canvas.height).data.slice();
        }");
        await SaveScreenshotAsync(canvas, $"arena-l4-source-tree-lit-shadows-{width}.png");

        await Page.Locator("#toggle-shadows").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-tree-cast-shadows", "0");
        Assert.AreNotEqual(lit, await CanvasPixelHashAsync(canvas),
            "Removing the actual tree silhouette cast must change ground pixels beneath the firelight.");
        var shadowContrast = await canvas.EvaluateAsync<int>(@"canvas => {
            const before = canvas.__shadowReference;
            const after = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            let contrast = 0;
            for (let index = 0; index < before.length; index += 4)
                contrast = Math.max(contrast, Math.abs(before[index] - after[index]),
                    Math.abs(before[index + 1] - after[index + 1]),
                    Math.abs(before[index + 2] - after[index + 2]));
            return contrast;
        }");
        Assert.IsGreaterThan(32, shadowContrast,
            "A practically invisible shadow is not enough; the silhouette must create clear local contrast.");
        await SaveScreenshotAsync(canvas, $"arena-l4-source-tree-no-shadows-{width}.png");
        await Page.Locator("#toggle-shadows").CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-tree-cast-shadows", "2");
        Assert.AreEqual(lit, await CanvasPixelHashAsync(canvas),
            "Reinstating the exact original tree masks must restore the frozen lit scene.");

        // Light moves in WORLD SPACE, so a tree's projected silhouette moves
        // opposite the Fireball while the lit tree face also changes direction.
        await Page.Locator("#fireball-progress").EvaluateAsync(
            @"(input, value) => { input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); }", 15);
        await Expect(canvas).ToHaveAttributeAsync("data-fireball-progress", "0.150");
        await SaveScreenshotAsync(canvas, $"arena-l4-shadow-fireball-left-{width}.png");
        await Page.Locator("#fireball-progress").EvaluateAsync(
            @"(input, value) => { input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); }", 85);
        await Expect(canvas).ToHaveAttributeAsync("data-fireball-progress", "0.850");
        await SaveScreenshotAsync(canvas, $"arena-l4-shadow-fireball-right-{width}.png");
        await Page.Locator("#fireball-progress").EvaluateAsync(
            @"(input, value) => { input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); }", 50);
        await Expect(canvas).ToHaveAttributeAsync("data-fireball-progress", "0.500");
        Assert.AreEqual(lit, await CanvasPixelHashAsync(canvas));
        await SaveScreenshotAsync(canvas, $"arena-l3-original-trees-airborne-fire-{width}.png");

        await Page.Locator("#toggle-anchors").CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-anchors", "true");
        await SaveScreenshotAsync(canvas, $"arena-l3-original-tree-foot-anchors-{width}.png");
        await Page.Locator("#toggle-anchors").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-anchors", "false");
        Assert.AreEqual(lit, await CanvasPixelHashAsync(canvas));

        await Page.Locator("#toggle-night").UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-shadows", "0");
        var baseline = await CanvasPixelHashAsync(canvas);
        Assert.AreNotEqual(lit, baseline);
        await Page.Locator("#toggle-night").CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-gothic-night", "true");
        Assert.AreEqual(lit, await CanvasPixelHashAsync(canvas));
    }

    private async Task<ILocator> OpenLightingLabAsync(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/arena-lighting",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.WaitForFunctionAsync("() => !document.getElementById('wyrmforge-ignition')",
            null, new PageWaitForFunctionOptions { Timeout = 30000 });
        var canvas = Page.Locator(".lighting-stage canvas");
        await Expect(canvas).ToBeVisibleAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-ready", "true",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 45000 });
        return canvas;
    }

    private async Task SaveScreenshotAsync(ILocator canvas, string fileName)
    {
        var dir = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(dir);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions { Path = Path.Combine(dir, fileName) });
    }

    private static Task<int> CanvasMaximumRgbAsync(ILocator canvas) =>
        canvas.EvaluateAsync<int>(@"canvas => {
            const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            let max = 0;
            for (let i = 0; i < pixels.length; i += 4)
                max = Math.max(max, pixels[i], pixels[i + 1], pixels[i + 2]);
            return max;
        }");

    private static Task<uint> CanvasPixelHashAsync(ILocator canvas) =>
        canvas.EvaluateAsync<uint>(@"canvas => {
            const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            let hash = 2166136261;
            for (let i = 0; i < pixels.length; i++)
                hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
            return hash >>> 0;
        }");
}
