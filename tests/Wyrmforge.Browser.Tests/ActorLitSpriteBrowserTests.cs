using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class ActorLitSpriteBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task SharedGpu_HollowedAndAshling_AllClipsRespondToLight(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root))
        {
            Assert.Inconclusive("Requires published web app for real shared-GPU browser evidence.");
            return;
        }

        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/arena-light-engine");
        await Expect(Page.Locator(".gpu-proof canvas")).ToHaveAttributeAsync("data-ready", "true", new() { Timeout = 90000 });
        await Page.EvaluateAsync(
            """
            async () => {
                const overlay = document.createElement('canvas');
                overlay.id = 'actor-lit-review';
                Object.assign(overlay.style, {
                    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
                    background: 'black', zIndex: '10000', pointerEvents: 'none'
                });
                document.body.appendChild(overlay);
                const module = await import(new URL('js/lighting/actor-review-scene.js', document.baseURI));
                window.actorLitReview = await module.createActorMaterialReview(overlay);
            }
            """);

        // The same authored frame drives color, normal and shadow UVs. This
        // iterates the actual G1 GPU snapshot over all 976 cells, including
        // attack launches, falls and held corpse frames.
        var totals = await Page.EvaluateAsync<int[]>(
            """
            () => {
                const result = window.actorLitReview.verifyAllFrames();
                return [result.checked, result.illuminated, result.zeroMaximum];
            }
            """);
        Assert.AreEqual(976, totals[0]);
        Assert.AreEqual(976, totals[1], "Every existing source frame must be visibly illuminated.");
        Assert.AreEqual(0, totals[2], "With all lights and emissions OFF, ordinary world pixels must be black.");

        foreach (var clip in new[] { "walk", "attack", "death" })
        {
            await Page.EvaluateAsync(
                """
                clip => window.actorLitReview.render({
                    clips: { hollowed: clip, ashling: clip },
                    frames: { hollowed: clip === 'death' ? 15 : 7, ashling: clip === 'death' ? 19 : 10 },
                    directions: { hollowed: 'SE', ashling: 'NW' },
                    zero: false, scale: 1
                })
                """, clip);
            await CaptureAsync(width, height, clip + "-hunt-scale");

            await Page.EvaluateAsync("() => window.actorLitReview.render({scale: 1.6})");
            await CaptureAsync(width, height, clip + "-magnified");
            await Page.EvaluateAsync("() => window.actorLitReview.render({scale: 1})");
        }

        var before = await HashAsync();
        await Page.EvaluateAsync("() => window.actorLitReview.render({lightX: -4})");
        var movedLight = await HashAsync();
        Assert.AreNotEqual(before, movedLight, "Moving light must change posed actor illumination and shadows.");
        await CaptureAsync(width, height, "light-moved");

        await Page.EvaluateAsync("() => window.actorLitReview.render({shadows: false})");
        Assert.AreNotEqual(movedLight, await HashAsync(), "Disabling shadow casters must change illumination at a fixed light position.");
        await CaptureAsync(width, height, "shadow-disabled");

        await Page.EvaluateAsync("() => window.actorLitReview.render({zero: true})");
        await CaptureAsync(width, height, "zero-light");
        Assert.AreEqual(0, await Page.EvaluateAsync<int>(
            "() => window.actorLitReview.pixels().reduce((m,x,i) => i%4===3 ? m : Math.max(m,x),0)"));
        await Page.EvaluateAsync("() => window.actorLitReview.dispose()");
    }

    private Task<string> HashAsync() => Page.EvaluateAsync<string>(
        """
        () => {
            let hash=2166136261;
            for(const x of window.actorLitReview.pixels()) hash=Math.imul(hash^x,16777619);
            return String(hash>>>0);
        }
        """);

    private async Task CaptureAsync(int width, int height, string name)
    {
        var directory = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
                        ?? Path.Combine(Path.GetTempPath(), "wyrmforge-lit-actors");
        Directory.CreateDirectory(directory);
        await Page.Locator("#actor-lit-review").ScreenshotAsync(new()
        {
            Path = Path.Combine(directory, $"actors-{width}x{height}-{name}.png")
        });
    }
}
