using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class LitActorBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task ActorClips_MovingLightsAndZeroWorld_FollowSharedGpuContract(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root))
        {
            Assert.Inconclusive("Requires locally published WyrmForge.");
            return;
        }

        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/actor-lit-review/");
        var canvas = Page.Locator("#actor-scene");
        await Expect(canvas).ToHaveAttributeAsync("data-ready", "true", new() { Timeout = 90000 });
        await CaptureAsync(width, height, "entry");

        foreach (var clip in new[] { "walk", "attack", "death" })
        {
            var last = clip == "walk" ? 15 : clip == "attack" ? 21 : 27;
            await SetAsync(new { hollowed = clip, ashling = clip, frame = 0, lightX = -1.0, zero = false });
            var start = await HashAsync();
            await CaptureAsync(width, height, clip + "-start-left");
            await SetAsync(new { frame = last / 2, lightX = 1.0 });
            Assert.AreNotEqual(start, await HashAsync(), clip + " must react to the moving source and posed frame.");
            await CaptureAsync(width, height, clip + "-middle-right");
            await SetAsync(new { frame = last, lightX = -1.0 });
            await CaptureAsync(width, height, clip + "-last-left");
            await SetAsync(new { zero = true });
            var maximum = await Page.EvaluateAsync<int>(
                "() => { const p=actorLitReview.pixels(); let m=0; for(let i=0;i<p.length;i++) if(i%4!==3) m=Math.max(m,p[i]); return m; }");
            Assert.AreEqual(0, maximum, clip + " must contain no undeclared full-bright world pixels.");
            await CaptureAsync(width, height, clip + "-zero");
            await SetAsync(new { zero = false, frame = 0, lightX = -1.0 });
            Assert.AreEqual(start, await HashAsync(), "Restoring a static pose and source must produce identical pixels.");
            // Same real GPU source/frame sampling in ALL compass rows, not mirrored
            // or inferred from whichever 3/4 view happened to be visible.
            foreach (var direction in new[] { "N", "NE", "E", "SE", "S", "SW", "W", "NW" })
            {
                await SetAsync(new { direction, frame = last / 2, lightX = .2 });
                await CaptureAsync(width, height, $"{clip}-{direction}-direction");
            }
            await SetAsync(new { direction = "S", frame = 0, lightX = -1.0 });
        }

        await SetAsync(new { hollowed = "attack", ashling = "attack", frame = 9, shadows = true });
        var shadowsOn = await HashAsync();
        await SetAsync(new { shadows = false });
        Assert.AreNotEqual(shadowsOn, await HashAsync(), "Authored actor silhouette planes must participate in dynamic shadows.");
        await CaptureAsync(width, height, "cast-shadows-off");
    }

    private Task SetAsync(object options) => Page.EvaluateAsync("(x) => actorLitReview.redraw(x)", options);

    private Task<string> HashAsync() => Page.EvaluateAsync<string>(
        "() => { let hash=2166136261; for(const p of actorLitReview.pixels()) hash=Math.imul(hash^p,16777619); return String(hash>>>0); }");

    private async Task CaptureAsync(int width, int height, string name)
    {
        var folder = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-lit-actor-review");
        Directory.CreateDirectory(folder);
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(folder, $"actors-{width}x{height}-{name}.png"),
            FullPage = true
        });
    }
}
