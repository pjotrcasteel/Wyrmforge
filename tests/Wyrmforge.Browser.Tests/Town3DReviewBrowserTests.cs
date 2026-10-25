using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>T1/T2 fixed-camera art-faithful 3D acceptance. No T3 agent/navigation code.</summary>
[TestClass]
public sealed class Town3DReviewBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(390, 844)]
    [DataRow(320, 568)]
    public async Task TownT2_CanonicalArt_UsesRealDepthAndStaysBlackWhenAllLightsAreOff(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root))
        {
            Assert.Inconclusive("Requires the running WyrmForge app.");
            return;
        }

        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/town3d-review.html?clean=1&district=center&mode=night",
            new() { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.WaitForFunctionAsync("() => window.__town3dReview?.getState().ready === true");

        Assert.IsGreaterThan(
            await Page.EvaluateAsync<int>("() => window.__town3dReview.getState().triangles"), 50000,
            "Town must use a dense nonplanar 3D scene, not a painted cube");
        Assert.AreEqual(23, await Page.EvaluateAsync<int>(
            "() => window.__town3dReview.getState().volumeCount"));
        Assert.IsGreaterThan(await Page.EvaluateAsync<double>(
            "() => window.__town3dReview.getState().depthMax - window.__town3dReview.getState().depthMin"), 6d);
        Assert.IsGreaterThan(await Page.EvaluateAsync<int>(
            "() => window.__town3dReview.getState().peakRgb"), 150);
        await CaptureAsync($"t2-canonical-night-center-{width}x{height}.png", artifacts);

        await Page.EvaluateAsync("() => window.__town3dReview.setMode('day')");
        await CaptureAsync($"t2-canonical-day-center-{width}x{height}.png", artifacts);

        foreach (var district in new[] { "west", "east" })
        {
            await Page.EvaluateAsync("(district) => window.__town3dReview.setDistrict(district)", district);
            await CaptureAsync($"t2-canonical-day-{district}-{width}x{height}.png", artifacts);
            await Page.EvaluateAsync("() => window.__town3dReview.setMode('night')");
            await CaptureAsync($"t2-canonical-night-{district}-{width}x{height}.png", artifacts);
            await Page.EvaluateAsync("() => window.__town3dReview.setMode('day')");
        }

        await Page.EvaluateAsync("() => window.__town3dReview.setDistrict('center')");
        await Page.EvaluateAsync("() => window.__town3dReview.setMode('zero')");
        Assert.AreEqual(0, await Page.EvaluateAsync<int>(
            "() => window.__town3dReview.getState().peakRgb"),
            "Every Town world pixel must be black without any illumination or emission");
        await CaptureAsync($"t2-canonical-zero-{width}x{height}.png", artifacts);

        await Page.EvaluateAsync("() => window.__town3dReview.setMode('night')");
        await Page.EvaluateAsync("() => window.__town3dReview.setView('geometry')");
        await CaptureAsync($"t2-canonical-3d-wireframe-{width}x{height}.png", artifacts);
    }

    private Task CaptureAsync(string filename, string folder) => Page.ScreenshotAsync(new()
    {
        Path = Path.Combine(folder, filename),
        FullPage = true
    });
}
