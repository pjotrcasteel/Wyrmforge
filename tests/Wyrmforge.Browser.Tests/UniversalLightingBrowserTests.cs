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
        await ConfigureAsync(canvas, new { reflections = true, frame = 8 });
        var posed = await PixelHashAsync(canvas);
        Assert.AreNotEqual(lit, posed, "A pose change must affect rendering independently of source movement.");
        await CaptureAsync(width, "left-pose8");
        await ConfigureAsync(canvas, new { progress = .85 });
        Assert.AreNotEqual(posed, await PixelHashAsync(canvas), "Moving only the light must change illumination.");
        await CaptureAsync(width, "right-pose8");
        await ConfigureAsync(canvas, new { profile = "day" });
        await CaptureAsync(width, "day");
        await ConfigureAsync(canvas, new { profile = "night", progress = .25, frame = 0 });
        foreach (var view in new[] { "albedo", "normals", "geometry", "shadow-visibility", "light-depth", "light-bounds" })
        {
            await ConfigureAsync(canvas, new { view });
            Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
            Assert.AreNotEqual(lit, await PixelHashAsync(canvas), $"{view} must be a real diagnostic pass.");
            Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).some((v,i) => i%4!==3 && v>0)"),
                $"{view} must render; blank output can conceal shader errors or a light trapped inside its caster.");
            await CaptureAsync(width, view);
        }
        await ConfigureAsync(canvas, new { view = "lit" });
        Assert.AreEqual(lit, await PixelHashAsync(canvas), "Inspection must not mutate the lit scene.");
        foreach (var focus in new[] { "actors", "oak", "town", "water" })
        {
            await ConfigureAsync(canvas, new { focus, profile = "night", view = "lit" });
            var focused = await PixelHashAsync(canvas);
            await CaptureAsync(width, $"close-{focus}");
            await ConfigureAsync(canvas, new { profile = "zero", view = "normals" });
            Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).every((v,i) => i%4===3 || v===0)"),
                $"Every RGB channel must be black in the {focus} camera, even when an inspection pass was selected.");
            await CaptureAsync(width, $"close-{focus}-zero");
            await ConfigureAsync(canvas, new { profile = "night", view = "lit" });
            Assert.AreEqual(focused, await PixelHashAsync(canvas));
        }
        await ConfigureAsync(canvas, new { focus = "actors" });
        var actors = await PixelHashAsync(canvas);
        await ConfigureAsync(canvas, new { normals = false });
        Assert.AreNotEqual(actors, await PixelHashAsync(canvas), "Authored pose normals must affect actual actor shading.");
        await CaptureAsync(width, "actors-without-normals");
        await ConfigureAsync(canvas, new { normals = true, inspectObject = "hollowed", receivesLight = false });
        Assert.AreNotEqual(actors, await PixelHashAsync(canvas), "Light receipt must be independently configurable.");
        await CaptureAsync(width, "hollowed-no-receive-light");
        await ConfigureAsync(canvas, new { receivesLight = true, castsShadow = false });
        await CaptureAsync(width, "hollowed-no-cast");
        await ConfigureAsync(canvas, new { castsShadow = true, receivesShadow = false });
        await CaptureAsync(width, "hollowed-no-receive-shadow");
        await ConfigureAsync(canvas, new { receivesShadow = true });
        Assert.AreEqual(actors, await PixelHashAsync(canvas));
        await ConfigureAsync(canvas, new { focus = "oak", progress = .85, view = "shadow-visibility" });
        await CaptureAsync(width, "oak-point-visibility-right");
        await ConfigureAsync(canvas, new { progress = .15 });
        await CaptureAsync(width, "oak-point-visibility-left");
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    private async Task ConfigureAsync(ILocator canvas, object options)
    {
        var labels = new Dictionary<string, string>
        {
            ["profile"] = "Environment", ["view"] = "Diagnostic", ["focus"] = "Camera",
            ["fireball"] = "Fireball", ["torch"] = "Torch", ["spot"] = "Spot", ["rune"] = "Register rune",
            ["shadows"] = "Shadows", ["reflections"] = "Direct specular", ["normals"] = "Authored normals",
            ["progress"] = "Light position", ["frame"] = "Walk frame", ["animate"] = "Animate walk",
            ["inspectObject"] = "Inspect object", ["castsShadow"] = "Casts shadow",
            ["receivesShadow"] = "Receives shadow", ["receivesLight"] = "Receives light"
        };
        var values = System.Text.Json.JsonSerializer.SerializeToElement(options);
        foreach (var property in values.EnumerateObject())
        {
            var control = Page.GetByLabel(labels[property.Name], new() { Exact = true });
            if (property.Value.ValueKind is System.Text.Json.JsonValueKind.True or System.Text.Json.JsonValueKind.False)
                await control.SetCheckedAsync(property.Value.GetBoolean());
            else if (property.Value.ValueKind == System.Text.Json.JsonValueKind.Number)
                await control.EvaluateAsync("(input,value) => { input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); }",
                    property.Value.GetDouble() * (property.Name == "progress" ? 100 : 1));
            else await control.SelectOptionAsync(property.Value.GetString()!);
            object expected = property.Value.ValueKind switch
            {
                System.Text.Json.JsonValueKind.True or System.Text.Json.JsonValueKind.False => property.Value.GetBoolean(),
                System.Text.Json.JsonValueKind.Number => property.Value.GetDouble(),
                _ => property.Value.GetString()!
            };
            await Page.WaitForFunctionAsync("([key,value]) => { const c=document.querySelector('.gpu-proof canvas'); return gpuProof.proofOptions(c)[key]===value; }",
                new object[] { property.Name, expected });
        }
    }

    private static Task<string> PixelHashAsync(ILocator canvas) => canvas.EvaluateAsync<string>(
        "c => { let hash=2166136261; for(const x of gpuProof.proofPixels(c)) hash=Math.imul(hash^x,16777619); return String(hash>>>0); }");

    private async Task CaptureAsync(int width, string name)
    {
        var directory = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-gpu-proof");
        Directory.CreateDirectory(directory);
        var measurements = await Page.Locator(".gpu-proof canvas").EvaluateAsync<string>(
            """
            c => {
                const pixels = gpuProof.proofPixels(c); let maxRgb=0, nonzeroPixels=0, hash=2166136261;
                for(let i=0;i<pixels.length;i++) hash=Math.imul(hash^pixels[i],16777619);
                for(let i=0;i<pixels.length;i+=4) {
                    const maximum=Math.max(pixels[i],pixels[i+1],pixels[i+2]);
                    maxRgb=Math.max(maxRgb,maximum); if(maximum>0) nonzeroPixels++;
                }
                return JSON.stringify({ framebuffer:[c.width,c.height], rgbChannels:pixels.length/4*3,
                    maxRgb,nonzeroPixels,hash:hash>>>0,options:gpuProof.proofOptions(c),diagnostics:gpuProof.proofDiagnostics(c) },null,2);
            }
            """);
        await File.WriteAllTextAsync(Path.Combine(directory, $"gpu-{width}-{name}.json"), measurements);
        await Page.ScreenshotAsync(new() { Path = Path.Combine(directory, $"gpu-{width}-{name}.png"), FullPage = true });
    }
}
