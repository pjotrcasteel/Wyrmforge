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
    public async Task Mobile_Startup_ShowsIgnitionUntilGameIsReady()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);

        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.Commit });
        await Expect(Page.Locator("#wyrmforge-ignition")).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "IGNITING WYRMFORGE" })).ToBeVisibleAsync();
        await ScreenshotAsync("mobile-igniting-wyrmforge.png");

        await Expect(Page.Locator("main.game-shell")).ToBeVisibleAsync(new() { Timeout = 30000 });
        await Expect(Page.Locator("#wyrmforge-ignition")).ToHaveCountAsync(0, new() { Timeout = 30000 });
    }

    [TestMethod]
    public async Task Desktop_BootstrapFailure_ShowsRetryInsteadOfHanging()
    {
        await Page.SetViewportSizeAsync(1440, 900);
        await Page.RouteAsync("**/_framework/blazor.webassembly.js*", route => route.AbortAsync());

        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "TRY AGAIN" })).ToBeVisibleAsync(new() { Timeout = 15000 });
        await Expect(Page.Locator("#ignition-status")).ToHaveTextAsync("THE FORGE COULD NOT IGNITE");
    }

    [TestMethod]
    public async Task Mobile_ArcaneAtlas_RendersPlanningSurfaceWithoutPageOverflow()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);
        await StartTraceAsync();

        try
        {
            await OpenAsync();
            await Expect(Page.GetByText("Your next three pursuits", new() { Exact = true })).ToBeVisibleAsync();
            var mobileForge = Page.Locator("nav.mobile-nav button").Filter(new LocatorFilterOptions { HasText = "Forge" });
            await mobileForge.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByRole(AriaRole.Navigation, new() { Name = "Choose a Wyrm lineage" })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("Rimeclaw") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Rimeclaw" })).ToBeVisibleAsync();
            await ScreenshotAsync("mobile-forge-sanctum.png");
            await Page.Locator("details.sanctum-ledger > summary").ClickAsync();
            await Expect(Page.GetByText("Your next three pursuits", new() { Exact = true })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("PREPARE NEXT HUNT") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "ENTER WYRMREALM" })).ToBeVisibleAsync();
            var mobileCodex = Page.Locator("nav.mobile-nav button").Filter(new LocatorFilterOptions { HasText = "Codex" });
            await mobileCodex.ClickAsync();
            await Expect(Page.GetByText("WYRMFORGED SPELL LINEAGES", new() { Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("mobile-mastery-codex.png");
            var mobileBuild = Page.Locator("nav.mobile-nav button").Filter(new LocatorFilterOptions { HasText = "Build" });
            await mobileBuild.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByText("ARCANE ATLAS", new() { Exact = true })).ToBeVisibleAsync();

            var overflow = await Page.EvaluateAsync<double>("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth");
            Assert.IsLessThanOrEqualTo(1, overflow, $"Mobile page overflows horizontally by {overflow:0.#}px.");

            await ScreenshotAsync("mobile-atlas.png");

            var inferno = Page.Locator("button[aria-label^=\"Dragon's Inferno.\"]");
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
            await Expect(Page.GetByText("SPELL MASTERY", new() { Exact = false }).First).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-home.png");
            await Expect(Page.GetByText("Your next three pursuits", new() { Exact = true })).ToBeVisibleAsync();
            var desktopForge = Page.Locator("aside.shell-rail button").Filter(new LocatorFilterOptions { HasText = "Forge" });
            await desktopForge.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByRole(AriaRole.Navigation, new() { Name = "Choose a Wyrm lineage" })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("Stormcoil") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Stormcoil" })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-forge-sanctum.png");
            await Page.Locator("details.sanctum-ledger > summary").ClickAsync();
            await Expect(Page.GetByText("Your next three pursuits", new() { Exact = true })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("PREPARE NEXT HUNT") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "ENTER WYRMREALM" })).ToBeVisibleAsync();

            var codexButton = Page.Locator("aside.shell-rail button").Filter(new LocatorFilterOptions { HasText = "Codex" });
            await codexButton.ClickAsync();
            await Expect(Page.GetByText("WYRMFORGED SPELL LINEAGES", new() { Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-mastery-codex.png");

            var desktopBuild = Page.Locator("aside.shell-rail button").Filter(new LocatorFilterOptions { HasText = "Build" });
            await desktopBuild.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByText("ARCANE ATLAS", new() { Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-atlas.png");
        }
        finally
        {
            await StopTraceAsync("desktop-shell-trace.zip");
        }
    }

    [TestMethod]
    public async Task Mobile_FirstTrail_RendersActiveCombatWithoutPageOverflow()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);
        await StartTraceAsync();

        try
        {
            await OpenAsync();
            await EnterFirstTrailAsync();
            await Expect(Page.GetByLabel("Current encounter objective")).ToBeVisibleAsync();
            await Page.WaitForTimeoutAsync(1200);

            var overflow = await Page.EvaluateAsync<double>("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth");
            Assert.IsLessThanOrEqualTo(1, overflow, $"Mobile combat overflows horizontally by {overflow:0.#}px.");
            await ScreenshotAsync("mobile-combat.png");
        }
        finally
        {
            await StopTraceAsync("mobile-combat-trace.zip");
        }
    }

    [TestMethod]
    public async Task Desktop_FirstTrail_RendersActiveCombat()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(1440, 900);
        await StartTraceAsync();

        try
        {
            await OpenAsync();
            await EnterFirstTrailAsync();
            await Expect(Page.GetByLabel("Current encounter objective")).ToBeVisibleAsync();
            await Page.WaitForTimeoutAsync(1200);
            await ScreenshotAsync("desktop-combat.png");
        }
        finally
        {
            await StopTraceAsync("desktop-combat-trace.zip");
        }
    }

    private async Task EnterFirstTrailAsync()
    {
        await Page.GetByRole(AriaRole.Button, new() { Name = "ENTER WYRMREALM" }).ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();

        var route = Page.Locator("button.route-node.available").First;
        await route.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();
    }

    private async Task OpenAsync()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.Locator("main.game-shell")).ToBeVisibleAsync();
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
