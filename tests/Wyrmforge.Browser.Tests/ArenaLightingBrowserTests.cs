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
        // Startup ignition fades out after Blazor is ready. Element screenshots
        // taken during that fade show misleading ghost text over real terrain.
        await Page.WaitForFunctionAsync("() => !document.getElementById('wyrmforge-ignition')",
            null, new PageWaitForFunctionOptions { Timeout = 30000 });
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

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_OriginalCandidateTrees_HaveWorldFootAnchorsAndCoherentShadows(int width, int height)
    {
        // Optional exact Step-3 source PNGs are downloaded as a CI review
        // artifact. The art remains UNAPPROVED and never ships with the game.
        var assets = Environment.GetEnvironmentVariable("WYRMFORGE_STEP3_ASSETS");
        var oak = Path.Combine(assets ?? string.Empty, "ancient_oak", "ancient_oak-candidate.png");
        var elm = Path.Combine(assets ?? string.Empty, "dead_elm", "dead_elm-candidate.png");
        if (string.IsNullOrWhiteSpace(assets) || !File.Exists(oak) || !File.Exists(elm))
        {
            Console.WriteLine("No source-candidate PNGs available: optional composition review skipped.");
            return;
        }

        await Page.SetViewportSizeAsync(width, height);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/arena-lighting",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        // Startup ignition fades out after Blazor is ready. Element screenshots
        // taken during that fade show misleading ghost text over real terrain.
        await Page.WaitForFunctionAsync("() => !document.getElementById('wyrmforge-ignition')",
            null, new PageWaitForFunctionOptions { Timeout = 30000 });
        var canvas = Page.Locator(".lighting-stage canvas");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-ready", "true",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 45000 });
        await Page.Locator(".lighting-inspector input[type='file']").Nth(0).SetInputFilesAsync(oak);
        await Page.Locator(".lighting-inspector input[type='file']").Nth(1).SetInputFilesAsync(elm);
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-objects", "2");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-physics-objects", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-legacy-assets", "0");
        var baseline = await CanvasPixelHashAsync(canvas);

        await Page.Locator(".lighting-controls input[type='checkbox']").First.CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-shadows", "2");
        var lit = await CanvasPixelHashAsync(canvas);
        Assert.AreNotEqual(baseline, lit, "Tree and ground must react to shared world lighting.");
        var dir = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(dir);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(dir, $"arena-lighting-l2-trees-{width}.png"),
        });

        await Page.Locator(".lighting-controls input[type='checkbox']").Nth(2).CheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-anchors", "true");
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(dir, $"arena-lighting-l2-root-anchors-{width}.png"),
        });

        await Page.Locator(".lighting-controls input[type='checkbox']").First.UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-shadows", "0");
        // Disable anchor annotations as well, so A/B compares identical sources.
        await Page.Locator(".lighting-controls input[type='checkbox']").Nth(2).UncheckAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-lighting-anchors", "false");
        Assert.AreEqual(baseline, await CanvasPixelHashAsync(canvas),
            "Lighting Off must exactly restore the source tree and approved ground pixels.");
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
