using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>Production Hunt black-screen regression for the optional diagnostic GPU switch.</summary>
[TestClass]
public sealed class HuntLayerLabBrowserTests : PageTest
{
    /// <summary>GPU on, off and on must all draw the live world without replacing the GPU renderer with a boolean.</summary>
    [TestMethod]
    public async Task LiveHunt_LayerLabGpuToggle_PreservesReadableCanvasAndRenderingState()
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);

        var pageErrors = new List<string>();
        Page.PageError += (_, error) => pageErrors.Add(error);
        await Page.GotoAsync(root + "/?layerLab=1&god=1", new() { WaitUntil = WaitUntilState.NetworkIdle });

        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 45000 });
        await start.ClickAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();

        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Page.Locator(".gate-tier--ready").First.ClickAsync();
        await Page.Locator("button.route-node.available").First.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^Enter (rare )?trail$") }).ClickAsync();

        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();
        await ArenaBrowserWait.UntilAsync(Page,
            "return state?.worldReady === true && state?.layerLab?.active === true && state?.gpuWorld?.quality === 'mobile' && !state?.renderingFailed;",
            90000, "the live Hunt with opt-in Layer Lab and an actual GPU renderer");

        await AssertVisibleHuntFrameAsync(output, "gpu-on-before");

        var gpu = Page.GetByRole(AriaRole.Checkbox, new() { NameRegex = new Regex("WebGL GPU composite") });
        await gpu.UncheckAsync();
        await ArenaBrowserWait.UntilAsync(Page,
            "return state?.layerLab?.disabled?.includes('gpu') === true && !state?.renderingFailed;",
            30000, "the Canvas2D Hunt after disabling WebGL");
        await AssertVisibleHuntFrameAsync(output, "gpu-off");

        await gpu.CheckAsync();
        await ArenaBrowserWait.UntilAsync(Page,
            "return state?.layerLab?.disabled?.includes('gpu') === false && state?.gpuWorld?.quality === 'mobile' && !state?.renderingFailed;",
            30000, "the WebGL Hunt after restoring the renderer");
        await AssertVisibleHuntFrameAsync(output, "gpu-on-after");

        Assert.AreEqual(0, pageErrors.Count, string.Join(Environment.NewLine, pageErrors));
    }

    private async Task AssertVisibleHuntFrameAsync(string output, string stage)
    {
        await Page.WaitForFunctionAsync("""
            async () => {
                const canvas = document.querySelector('canvas.game-canvas');
                if (!canvas?.width || !canvas?.height) return false;
                const { readArenaDiagnostics } = await import('/js/arena-performance.js');
                const state = readArenaDiagnostics(canvas);
                if (!state?.worldReady || state.renderingFailed || state.renderError) return false;
                const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
                let visible = 0;
                for (let i = 0; i < pixels.length; i += 4) {
                    if (pixels[i] + pixels[i + 1] + pixels[i + 2] >= 90) visible++;
                }
                return visible >= 300;
            }
            """, null, new() { Timeout = 45000 });
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"hunt-layer-lab-{stage}-390.png"),
            FullPage = false
        });
    }
}
