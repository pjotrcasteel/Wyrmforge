using System.Text.Json;
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
        await CaptureReferencePixelsAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail Off" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.fineDetail === 'on'");
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail On" }))
            .ToHaveAttributeAsync("aria-pressed", "true");
        var enhanced = await ReadPixelHashAsync();
        Assert.AreNotEqual(baseline, enhanced,
            "Fine detail ON must change real ground pixels, not just the button state.");
        var samplerDifference = await ReadVisibleDifferenceAsync();
        Assert.IsGreaterThan(0.3, samplerDifference.GetProperty("changedPercent").GetDouble(),
            "The existing material texture should gain real detail without broad recolouring.");
        Assert.IsLessThan(19.0, samplerDifference.GetProperty("maximumRgbDelta").GetDouble(),
            "Fine Detail must not introduce colour blocks or replace blended material pixels.");

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

        // Natural preview is optional, but a plain-grass view is the simplest
        // repro of the owner's almost-identical On/Off iPhone screenshots.
        var previousFrame = await canvas.GetAttributeAsync("data-material-render");
        await Page.GetByRole(AriaRole.Button, new() { Name = "All grass" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"frame =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.materialRender !== frame",
            previousFrame);
        await CaptureReferencePixelsAsync();
        var plainGrass = await ReadPixelHashAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail Off" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.fineDetail === 'on'");
        var wornGrass = await ReadPixelHashAsync();
        Assert.AreNotEqual(plainGrass, wornGrass);
        var grassDifference = await ReadVisibleDifferenceAsync();
        Console.WriteLine($"Fine detail visibility: sampler {samplerDifference}, grass {grassDifference}");
        Assert.IsGreaterThan(0.3, grassDifference.GetProperty("changedPercent").GetDouble(),
            "All-grass detail should be enhanced locally, without foreign-colour patches.");
        Assert.IsLessThan(19.0, grassDifference.GetProperty("maximumRgbDelta").GetDouble(),
            "Fine Detail must not create unrelated soil or water rectangles on grass.");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifactDir, "material-lab-fine-on-grass-390.png"),
        });
        await Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail On" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.fineDetail === 'off'");
        Assert.AreEqual(plainGrass, await ReadPixelHashAsync(),
            "The approved plain-grass preview must return byte-for-byte when Fine Detail is off.");

        // Regression from 12:04 owner screenshots: natural mixed ground suffered
        // rectangular colour bleed when Fine Detail painted foreign swatches.
        var naturalFrame = await canvas.GetAttributeAsync("data-material-render");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Natural ground" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"frame =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.materialRender !== frame",
            naturalFrame);
        await CaptureReferencePixelsAsync();
        var naturalBaseline = await ReadPixelHashAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail Off" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.fineDetail === 'on'");
        var mixedDifference = await ReadVisibleDifferenceAsync();
        Assert.IsLessThan(19.0, mixedDifference.GetProperty("maximumRgbDelta").GetDouble(),
            "Natural ground transitions must never acquire blocks from unrelated materials.");
        Assert.IsGreaterThan(0.3, mixedDifference.GetProperty("changedPercent").GetDouble(),
            "Fine Detail still sharpens the original mixed ground locally.");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(artifactDir, "material-lab-natural-blends-on-390.png"),
        });
        await Page.GetByRole(AriaRole.Button, new() { Name = "Fine detail On" }).ClickAsync();
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelector('.materials-lab .material-workspace canvas')?.dataset.fineDetail === 'off'");
        Assert.AreEqual(naturalBaseline, await ReadPixelHashAsync(),
            "Fine Detail Off restores the original blended grass/mud/marsh boundaries.");
    }

    private async Task CaptureReferencePixelsAsync() =>
        await Page.Locator(CanvasSelector).EvaluateAsync(@"canvas => {
            canvas.__fineDetailBaseline = new Uint8Array(canvas.getContext('2d')
                .getImageData(0, 0, canvas.width, canvas.height).data);
        }");

    private async Task<JsonElement> ReadVisibleDifferenceAsync() =>
        await Page.Locator(CanvasSelector).EvaluateAsync<JsonElement>(@"canvas => {
            const old = canvas.__fineDetailBaseline;
            const current = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            if (!old || old.length !== current.length) throw new Error('Missing reference ground pixels');
            let changed = 0, rgbDelta = 0, maximumRgbDelta = 0;
            for (let i = 0; i < current.length; i += 4) {
                const red = Math.abs(current[i] - old[i]);
                const green = Math.abs(current[i + 1] - old[i + 1]);
                const blue = Math.abs(current[i + 2] - old[i + 2]);
                const maximum = Math.max(red, green, blue);
                if (maximum >= 4) changed++;
                maximumRgbDelta = Math.max(maximumRgbDelta, maximum);
                rgbDelta += red + green + blue;
            }
            return {
                changedPercent: 100 * changed / (canvas.width * canvas.height),
                averageRgbDelta: rgbDelta / (canvas.width * canvas.height * 3),
                maximumRgbDelta,
            };
        }");

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
