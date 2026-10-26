using System.Globalization;
using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>
/// T0/T1/T2 acceptance capture. A successful screenshot alone never means
/// approved art: the owner reviews these source-identical, real-browser PNGs.
/// </summary>
[TestClass]
public sealed class TownGpuAcceptanceTests : PageTest
{
    private string BaseUrl => Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
    private string Artifacts => Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ??
        Path.Combine(Path.GetTempPath(), "wyrmforge-town-acceptance");

    private async Task StartTownAsync(bool gpu)
    {
        Directory.CreateDirectory(Artifacts);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','3');");
        var uri = BaseUrl.TrimEnd('/') + (gpu ? "/?townGpuPreview=1" : "/");
        await Page.GotoAsync(uri, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        var start = Page.GetByRole(AriaRole.Button, new()
        {
            NameRegex = new System.Text.RegularExpressions.Regex("^START GAME")
        });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 30000 });
        await start.ClickAsync();
        await Expect(Page.Locator(".character-creation, .town-square")).ToBeVisibleAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
    }

    private Task CaptureAsync(string filename) => Page.ScreenshotAsync(new PageScreenshotOptions
    {
        Path = Path.Combine(Artifacts, filename),
        FullPage = true,
    });

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    [DataRow(1120, 720)]
    public async Task TownT0_CanonicalOriginal_CapturesAllThreeDistricts(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await StartTownAsync(gpu: false);
        var scene = Page.Locator(".refuge-canonical-scene");
        await Expect(scene.Locator(".refuge-town-night-base")).ToHaveCountAsync(1);
        await Expect(scene.Locator(".refuge-town-gpu-canvas")).ToHaveCountAsync(0);
        await Expect(scene.Locator("[data-town-building]")).ToHaveCountAsync(4);

        // The same original panorama is panned by existing production controls.
        // Explicitly preserve the exact 3 slices before comparing GPU output.
        foreach (var district in new[] { (Index: 0, Name: "west"), (Index: 1, Name: "centre"),
                                         (Index: 2, Name: "east") })
        {
            await Page.EvaluateAsync("index => window.wyrmforgeTown.show(index, false)", district.Index);
            await CaptureAsync($"town-t0-original-{district.Name}-{width}.png");
        }
    }

    private async Task ConfigureAsync(string mode, string paving, string view, double npcProgress)
    {
        var valid = await Page.EvaluateAsync<bool>(@"async options => {
            const canvas = document.querySelector('.refuge-town-gpu-canvas');
            const module = await import(new URL('./js/town-relighting-preview.js', document.baseURI).href);
            module.configureTownPreview(canvas, options);
            return canvas.dataset.pavingAlbedo === options.paving &&
                canvas.dataset.profile === options.mode &&
                canvas.dataset.inspection === (options.mode === 'zero' ? 'lit' : options.view) &&
                Number(canvas.dataset.projectionErrorPx) <= 2;
        }", new { mode, paving, view, npcProgress, npcEnabled = true, lamps = true, offset = 0 });
        Assert.IsTrue(valid, "Screenshot rejected: GPU mode, material selection or pixel alignment did not match.");
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    [DataRow(1120, 720)]
    public async Task TownT2_GpuCentralSquare_CapturesPavingShadowsAndActorDepth(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await StartTownAsync(gpu: true);
        await Page.WaitForFunctionAsync(@"() =>
            ['ready', 'failed'].includes(document.querySelector('.refuge-canonical-scene')
                ?.dataset.townGpuPreview)", new() { Timeout = 25000 });

        var scene = Page.Locator(".refuge-canonical-scene");
        var state = await scene.GetAttributeAsync("data-town-gpu-preview");
        Assert.AreEqual("ready", state, "Gated GPU acceptance requires real WebGL, not painted fallback.");

        var canvas = scene.Locator(".refuge-town-gpu-canvas");
        var errorString = await canvas.GetAttributeAsync("data-projection-error-px");
        Assert.IsTrue(double.TryParse(errorString, NumberStyles.Float, CultureInfo.InvariantCulture,
            out var error), "GPU camera calibration must be reported.");
        Assert.IsTrue(error <= 2.0, $"T1 camera must align to source pixels; got {error:0.000}px.");
        Assert.IsNotNull(await canvas.GetAttributeAsync("data-authoritative-citizen-count"));
        await Expect(scene.Locator("[data-town-building]")).ToHaveCountAsync(4);

        // We deliberately compare identical town/gameplay state in this one
        // browser session; only GPU materials/lighting inspector modes change.
        await ConfigureAsync("night", "source", "lit", 0);
        await CaptureAsync($"town-t2-source-night-{width}.png");

        await ConfigureAsync("night", "neutral", "lit", 0);
        await CaptureAsync($"town-t2-neutral-night-{width}.png");

        await ConfigureAsync("day", "neutral", "lit", 0);
        await CaptureAsync($"town-t2-neutral-day-{width}.png");

        // This opt-in REAL Town uses C# citizen feet; npcProgress only moves
        // the isolated lab's scripted proxy, so never claim the following
        // screenshots are scripted behind/front positions. The lab workflow
        // separately captures approved well silhouettes at both test poses.
        await ConfigureAsync("night", "neutral", "shadow-visibility", 0);
        await CaptureAsync($"town-t2-shadows-live-crowd-{width}.png");

        await ConfigureAsync("night", "neutral", "lit", 0);
        await CaptureAsync($"town-t2-npc-live-crowd-{width}.png");

        await ConfigureAsync("zero", "neutral", "lit", 1);
        Assert.AreEqual("true", await canvas.GetAttributeAsync("data-zero-black"));
        await CaptureAsync($"town-t2-zero-light-{width}.png");
    }
}
