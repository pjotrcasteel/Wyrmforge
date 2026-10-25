using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class WetForestMaterialKitBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task MaterialKit_CsharpRecipeAndSharedGpu_RenderThreeMaterialsAndBlackWorld(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root))
        {
            Assert.Inconclusive("Requires published WyrmForge and browser GPU.");
            return;
        }

        var errors = new System.Collections.Concurrent.ConcurrentQueue<string>();
        Page.PageError += (_, exception) => errors.Enqueue(exception);
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/arena-material-kit?seed=1204",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        var canvas = Page.Locator(".kit-stage canvas");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Three materials. One real terrain recipe." }))
            .ToBeVisibleAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-material-review-ready", "true",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 90000 });
        await Expect(canvas).ToHaveAttributeAsync("data-material-review-seed", "1204");
        await Expect(canvas).ToHaveAttributeAsync("data-material-review-profile", "night");
        Assert.IsGreaterThan(0, (await CanvasPixelsAsync(canvas)).Count(pixel => pixel > 0),
            "Registered world lights must reveal real material pixels.");

        await SaveAsync(canvas, $"wet-forest-material-kit-night-{width}.png");
        await Page.GetByLabel("GPU lighting").SelectOptionAsync("neutral");
        await Expect(canvas).ToHaveAttributeAsync("data-material-review-profile", "neutral");
        await SaveAsync(canvas, $"wet-forest-material-kit-neutral-{width}.png");

        var neutral = await CanvasPixelsAsync(canvas);
        await Page.GetByLabel("GPU lighting").SelectOptionAsync("zero");
        await Expect(canvas).ToHaveAttributeAsync("data-material-review-profile", "zero");
        var zero = await CanvasPixelsAsync(canvas);
        Assert.IsTrue(zero.All(pixel => pixel == 0),
            "With all sources and ambient disabled, the world framebuffer must be exactly black.");
        await SaveAsync(canvas, $"wet-forest-material-kit-zero-{width}.png");

        await Page.GetByLabel("GPU lighting").SelectOptionAsync("neutral");
        await Expect(canvas).ToHaveAttributeAsync("data-material-review-profile", "neutral");
        CollectionAssert.AreEqual(neutral, await CanvasPixelsAsync(canvas),
            "Same seed and inspection lighting must restore identical material pixels.");

        await Page.GetByRole(AriaRole.Button, new() { Name = "Another seed" }).ClickAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-material-review-seed", "1205");
        await SaveAsync(canvas, $"wet-forest-material-kit-seed1205-{width}.png");
        CollectionAssert.AreNotEqual(neutral, await CanvasPixelsAsync(canvas),
            "A new C# world seed must regenerate ground appearance, not just change a label.");

        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    private static async Task<byte[]> CanvasPixelsAsync(ILocator canvas)
    {
        var rgba = await canvas.EvaluateAsync<int[]>(@"c => {
            const gl = c.getContext('webgl2');
            if (!gl) throw new Error('G1 WebGL2 framebuffer unavailable');
            const data = new Uint8Array(c.width * c.height * 4);
            gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
            const rgb = [];
            for (let i = 0; i < data.length; i += 4) rgb.push(data[i], data[i+1], data[i+2]);
            return rgb;
        }");
        return rgba.Select(x => checked((byte)x)).ToArray();
    }

    private static Task SaveAsync(ILocator canvas, string file)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(root);
        return canvas.ScreenshotAsync(new LocatorScreenshotOptions { Path = Path.Combine(root, file) });
    }
}
