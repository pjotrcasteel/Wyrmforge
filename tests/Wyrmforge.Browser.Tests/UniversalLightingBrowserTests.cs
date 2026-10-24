using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class UniversalLightingBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task SharedGpu_SourcesAndEmissionDisabled_AllWorldPixelsBlack(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires the published Blazor application."); return; }
        var errors = new System.Collections.Concurrent.ConcurrentQueue<string>();
        Page.PageError += (_, error) => errors.Enqueue(error);
        Page.Console += (_, message) => { if (message.Type == "error") errors.Enqueue(message.Text); };
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/arena-light-engine");
        var canvas = Page.Locator(".gpu-proof canvas");
        await Expect(canvas).ToHaveAttributeAsync("data-ready", "true", new() { Timeout = 90000 });
        await Page.EvaluateAsync("async () => { window.gpuProof = await import('./js/lighting/proof-scene.js'); }");
        var lit = await PixelHashAsync(canvas);
        Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => c.width > 0 && c.height > 0 && gpuProof.proofPixels(c).some((v,i) => i%4!==3 && v>0)"),
            "A nonempty illuminated framebuffer is required before testing darkness.");
        await CaptureAsync(width, "overlap");
        await ConfigureAsync(canvas, new { profile = "zero", rune = true });
        var maximum = await canvas.EvaluateAsync<int>(
            "c => { const p=gpuProof.proofPixels(c); let m=0; for(let i=0;i<p.length;i++) if(i%4!==3) m=Math.max(m,p[i]); return m; }");
        Assert.AreEqual(0, maximum, "Every world framebuffer RGB channel must be exactly black, including source surfaces.");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Shared light engine" })).ToBeVisibleAsync();
        await CaptureAsync(width, "zero");
        await ConfigureAsync(canvas, new { profile = "night", rune = false });
        Assert.AreEqual(lit, await PixelHashAsync(canvas), "Restoring a frozen snapshot must restore the exact output.");
        await ConfigureAsync(canvas, new { rune = true });
        Assert.AreNotEqual(lit, await PixelHashAsync(canvas));
        await CaptureAsync(width, "new-rune");
        await ConfigureAsync(canvas, new { rune = false });
        Assert.AreEqual(lit, await PixelHashAsync(canvas), "Removed emitters must leave no ghost illumination.");
        await ConfigureAsync(canvas, new { shadows = false });
        Assert.AreNotEqual(lit, await PixelHashAsync(canvas));
        await CaptureAsync(width, "shadows-off");
        await ConfigureAsync(canvas, new { shadows = true, reflections = false });
        Assert.AreNotEqual(lit, await PixelHashAsync(canvas));
        await CaptureAsync(width, "specular-off");
        await ConfigureAsync(canvas, new { reflections = true, progress = .85, frame = 8 });
        Assert.AreNotEqual(lit, await PixelHashAsync(canvas));
        await CaptureAsync(width, "right-pose8");
        await ConfigureAsync(canvas, new { profile = "day" });
        await CaptureAsync(width, "day");
        await ConfigureAsync(canvas, new { profile = "night", progress = .25, frame = 0 });
        foreach (var view in new[] { "albedo", "normals", "geometry", "shadow-visibility" })
        {
            await ConfigureAsync(canvas, new { view });
            Assert.AreNotEqual(lit, await PixelHashAsync(canvas), $"{view} must be a real diagnostic pass.");
            Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).some((v,i) => i%4!==3 && v>0)"),
                $"{view} must render; blank output can conceal shader errors or a light trapped inside its caster.");
            await CaptureAsync(width, view);
        }
        await ConfigureAsync(canvas, new { view = "lit" });
        Assert.AreEqual(lit, await PixelHashAsync(canvas), "Inspection must not mutate the lit scene.");
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    private static Task ConfigureAsync(ILocator canvas, object options) =>
        canvas.EvaluateAsync("(c, options) => gpuProof.configureProof(c, options)", options);

    private static Task<string> PixelHashAsync(ILocator canvas) => canvas.EvaluateAsync<string>(
        "c => { let hash=2166136261; for(const x of gpuProof.proofPixels(c)) hash=Math.imul(hash^x,16777619); return String(hash>>>0); }");

    private async Task CaptureAsync(int width, string name)
    {
        var directory = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-gpu-proof");
        Directory.CreateDirectory(directory);
        await Page.ScreenshotAsync(new() { Path = Path.Combine(directory, $"gpu-{width}-{name}.png"), FullPage = true });
    }
}
