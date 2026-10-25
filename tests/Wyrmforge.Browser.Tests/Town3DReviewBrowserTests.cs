using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>T2 opt-in production-engine proof. Does NOT replace the original Town.</summary>
[TestClass]
public sealed class Town3DReviewBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task TownT2_RealGeometry_SharedGpuLightingAndZeroLightAreValid(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires a running WyrmForge app."); return; }
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/town3d-review.html",
            new() { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.WaitForFunctionAsync("() => window.__town3dReview?.getState().ready === true");

        var count = await Page.EvaluateAsync<int>("() => window.__town3dReview.getState().triangles");
        Assert.AreEqual(3250, count, "The reviewer must render the real authored OBJ, including Gothic architectural details, not 2D scenery");
        var nightPeak = await PeakRgbAsync();
        Assert.IsGreaterThan(nightPeak, 8, "Night must show illuminated geometry and working fixtures");
        await CaptureAsync($"t2-town-night-{width}x{height}.png", artifacts);

        await Page.Locator("#town3d-actor").SelectOptionAsync("behind-noticeboard");
        await CaptureAsync($"t2-town-behind-noticeboard-{width}x{height}.png", artifacts);
        await Page.Locator("#town3d-actor").SelectOptionAsync("in-front");
        await CaptureAsync($"t2-town-front-noticeboard-{width}x{height}.png", artifacts);

        await Page.Locator("#town3d-mode").SelectOptionAsync("day");
        await CaptureAsync($"t2-town-day-{width}x{height}.png", artifacts);

        await Page.Locator("#town3d-mode").SelectOptionAsync("zero");
        var zeroPeak = await PeakRgbAsync();
        Assert.IsLessThanOrEqualTo(zeroPeak, 1, "Zero-light must render world pixels black");
        await CaptureAsync($"t2-town-zero-{width}x{height}.png", artifacts);
        await Page.Locator("#town3d-view").SelectOptionAsync("geometry");
        await CaptureAsync($"t2-town-wireframe-{width}x{height}.png", artifacts);
    }

    private Task<int> PeakRgbAsync() => Page.EvaluateAsync<int>(@"() => {
        const bytes = window.__town3dReview.pixelSample();
        let max = 0;
        for (let i = 0; i < bytes.length; i += 4)
            max = Math.max(max, bytes[i], bytes[i+1], bytes[i+2]);
        return max;
    }");

    private Task CaptureAsync(string name, string artifacts) => Page.ScreenshotAsync(new()
    {
        Path = Path.Combine(artifacts, name),
        FullPage = true
    });
}
