using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class WyrmforgeBrowserTests : PageTest
{
    private string BaseUrl => Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
    private string ArtifactDirectory => Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");

    [TestMethod]
    public async Task Mobile_ArcaneAtlas_RendersPlanningSurfaceWithoutPageOverflow()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);
        await StartTraceAsync();

        try
        {
            await OpenAsync();
            await Page.Locator("nav.mobile-nav").GetByRole(AriaRole.Button, new() { Name = "Build", Exact = true }).ClickAsync();
            await Expect(Page.GetByText("ARCANE ATLAS", new() { Exact = true })).ToBeVisibleAsync();

            var overflow = await Page.EvaluateAsync<double>("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth");
            Assert.IsLessThanOrEqualTo(1, overflow, $"Mobile page overflows horizontally by {overflow:0.#}px.");

            await ScreenshotAsync("mobile-atlas.png");

            var inferno = Page.Locator("button[aria-label^="Dragon's Inferno."]");
            await inferno.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByText("ROUTE PREVIEW", new() { Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("mobile-atlas-inferno-route.png");
        }
        finally
        {
            await StopTraceAsync("mobile-atlas-trace.zip");
        }
    }

    [TestMethod]
    public async Task Desktop_HomeAndAtlas_RenderAtWideViewport()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(1440, 900);
        await StartTraceAsync();

        try
        {
            await OpenAsync();
            await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "ENTER WYRMREALM" })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-home.png");

            await Page.Locator("aside.shell-rail").GetByRole(AriaRole.Button, new() { Name = "Build", Exact = true }).ClickAsync();
            await Expect(Page.GetByText("ARCANE ATLAS", new() { Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-atlas.png");
        }
        finally
        {
            await StopTraceAsync("desktop-shell-trace.zip");
        }
    }

    private async Task OpenAsync()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.GetByText("WYRMFORGE", new() { Exact = true }).First).ToBeVisibleAsync();
    }

    private Task ScreenshotAsync(string name) => Page.ScreenshotAsync(new PageScreenshotOptions
    {
        Path = Path.Combine(ArtifactDirectory, name),
        FullPage = true,
    });

    private Task StartTraceAsync() => Context.Tracing.StartAsync(new TracingStartOptions
    {
        Screenshots = true,
        Snapshots = true,
        Sources = true,
    });

    private Task StopTraceAsync(string name) => Context.Tracing.StopAsync(new TracingStopOptions
    {
        Path = Path.Combine(ArtifactDirectory, name),
    });
}
