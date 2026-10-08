using System.Text.Json;
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
            await Page.Locator("details.sanctum-great-hunt > summary").ClickAsync();
            var oaths = Page.GetByRole(AriaRole.Navigation, new() { Name = "Inspect a Great Hunt oath" });
            await Expect(oaths).ToBeVisibleAsync();
            await oaths.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("Voidweaver") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Oath Beyond the Veil" })).ToBeVisibleAsync();
            await ScreenshotAsync("great-hunt-altar.png");
            await Page.Locator("details.sanctum-ledger > summary").ClickAsync();
            await Expect(Page.GetByText("Your next three pursuits", new() { Exact = true })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("PREPARE NEXT HUNT") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "ENTER WYRMREALM" })).ToBeVisibleAsync();
            var mobileCodex = Page.Locator("nav.mobile-nav button").Filter(new LocatorFilterOptions { HasText = "Codex" });
            await mobileCodex.ClickAsync();
            await Expect(Page.GetByText("WYRMFORGED SPELL LINEAGES", new() { Exact = true })).ToBeVisibleAsync();
            await Expect(Page.Locator(".codex-view .great-hunt-altar")).ToBeVisibleAsync();
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
            await Page.Locator("details.sanctum-great-hunt > summary").ClickAsync();
            var oaths = Page.GetByRole(AriaRole.Navigation, new() { Name = "Inspect a Great Hunt oath" });
            await Expect(oaths).ToBeVisibleAsync();
            await oaths.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("Voidweaver") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Oath Beyond the Veil" })).ToBeVisibleAsync();
            await ScreenshotAsync("great-hunt-altar.png");
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
            await Expect(Page.Locator(".combat-vitals")).ToBeVisibleAsync();
            await Expect(Page.Locator("button.leave-run svg")).ToBeVisibleAsync();
            await Page.WaitForTimeoutAsync(1200);
            var vitals = await Page.Locator(".combat-vitals").BoundingBoxAsync();
            var objective = await Page.GetByLabel("Current encounter objective").BoundingBoxAsync();
            Assert.IsNotNull(vitals);
            Assert.IsNotNull(objective);
            Assert.IsLessThanOrEqualTo(2, Math.Abs(vitals.Y - objective.Y), "Vitals and trail must share one aligned HUD row.");
            Assert.IsLessThanOrEqualTo(2, Math.Abs(vitals.X + vitals.Width - objective.X), "No gap between HUD sections.");

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
    public async Task Mobile_RunResults_ShowActionsWithoutScrollingAndExpandDetailsOnDemand()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await EnterFirstTrailAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Abandon run" }).ClickAsync();

        var report = Page.Locator(".run-report-card");
        await Expect(report).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Return to Wyrmforge" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "↻ Replay seed" })).ToBeVisibleAsync();
        Assert.IsFalse(await Page.Locator("details.run-report-details").EvaluateAsync<bool>("node => node.open"));
        Assert.IsFalse(await Page.Locator("details.run-report-next").EvaluateAsync<bool>("node => node.open"));

        var actionBox = await Page.Locator(".run-report-actions").BoundingBoxAsync();
        Assert.IsNotNull(actionBox);
        Assert.IsLessThanOrEqualTo(844, actionBox.Y + actionBox.Height, "Replay and Return must be visible without scrolling on a phone.");
        await ScreenshotAsync("mobile-run-results-compact.png");

        await Page.Locator("details.run-report-details > summary").ClickAsync();
        await Expect(Page.Locator(".run-report-expanded .run-report-section").First).ToBeVisibleAsync();
        await Page.Locator("details.run-report-next > summary").ClickAsync();
        await Expect(Page.GetByText("Your next three pursuits", new() { Exact = true })).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Return to Wyrmforge" }).ClickAsync();
        await Expect(Page.Locator("main.game-shell")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_AscendantRite_SealedOathCanBeInvokedBeforeStartingRun()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.greatHunt.v1',
            JSON.stringify([{Wyrm:0,Slain:true,EssenceSecured:true,DeepEvolvedDuel:true,AscendantDefeated:false}]));
            localStorage.setItem('wyrmforge.spellMastery.v1',
            JSON.stringify([{Spell:1,MeaningfulRuns:4,BestDepth:2,WyrmFeat:true}]));");

        await OpenAsync();
        var rite = Page.GetByRole(AriaRole.Button, new() { Name = "INVOKE ASCENDANT RITE" });
        await Expect(rite).ToBeVisibleAsync();
        await rite.ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "✓ RITE INVOKED" })).ToHaveAttributeAsync("aria-pressed", "true");
        await ScreenshotAsync("mobile-ascendant-rite-ready.png");
        var overflow = await Page.EvaluateAsync<double>("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth");
        Assert.IsLessThanOrEqualTo(1, overflow, "Ascendant rite should not overflow portrait width.");

        await EnterFirstTrailAsync();
        await Expect(Page.GetByLabel("Current encounter objective")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_TwoAscendantRites_SelectionIsExclusiveAndRunStartsWithoutOverflow()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.greatHunt.v1',
            JSON.stringify([{Wyrm:0,Slain:true,EssenceSecured:true,DeepEvolvedDuel:true,AscendantDefeated:true},
                {Wyrm:1,Slain:true,EssenceSecured:true,DeepEvolvedDuel:true,AscendantDefeated:false}]));
            localStorage.setItem('wyrmforge.spellMastery.v1',
            JSON.stringify([{Spell:1,MeaningfulRuns:4,BestDepth:2,WyrmFeat:true},
                {Spell:3,MeaningfulRuns:4,BestDepth:2,WyrmFeat:true}]));");

        await OpenAsync();
        var fire = Page.Locator("section.ascendant-rite-card:not(.storm) button.ascendant-rite-action");
        var storm = Page.Locator("section.ascendant-rite-card.storm button.ascendant-rite-action");
        await Expect(fire).ToBeVisibleAsync();
        await Expect(storm).ToBeVisibleAsync();
        await storm.ClickAsync();
        await Expect(storm).ToHaveAttributeAsync("aria-pressed", "true");
        await Expect(fire).ToHaveAttributeAsync("aria-pressed", "false");
        await fire.ClickAsync();
        await Expect(fire).ToHaveAttributeAsync("aria-pressed", "true");
        await Expect(storm).ToHaveAttributeAsync("aria-pressed", "false");
        await storm.ClickAsync();
        await Expect(storm).ToHaveAttributeAsync("aria-pressed", "true");
        await ScreenshotAsync("mobile-two-ascendant-rites.png");
        var overflow = await Page.EvaluateAsync<double>("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth");
        Assert.IsLessThanOrEqualTo(1, overflow);
        await EnterFirstTrailAsync();
        await Expect(Page.GetByLabel("Current encounter objective")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_DeveloperHuntTrials_ShowsPortraitWarningGeometryAndIsolatedHuntControls()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/balance-lab");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Skip the grind. Stress-test the Wyrm." })).ToBeVisibleAsync();
        await Expect(Page.GetByLabel("Test Wyrm")).ToHaveValueAsync("Stormcoil");
        await Expect(Page.GetByLabel("Encounter variant")).ToHaveValueAsync("ascendant");
        await Expect(Page.GetByRole(AriaRole.Img, new() { Name = "Planned boss warning positions with player centered" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "RUN PORTRAIT + LANDSCAPE TRIALS" })).ToBeVisibleAsync();
        var overflow = await Page.EvaluateAsync<double>("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth");
        Assert.IsLessThanOrEqualTo(1, overflow, "Developer trial controls must fit on iPhone width.");
    }

    [TestMethod]
    public async Task Mobile_HuntLab_AutopilotDisplaysActualBossWithoutWritingGreatHuntSave()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/hunt-lab?wyrm=Stormcoil&ascendant=true&phase=2&seed=1337");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Watch the Great Hunt fight itself." })).ToBeVisibleAsync();
        await Expect(Page.GetByLabel("Automated live Wyrm arena")).ToBeVisibleAsync();
        await Expect(Page.Locator(".hunt-lab-stage strong")).ToContainTextAsync("Stormcoil", new() { Timeout = 30000 });
        var save = await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.greatHunt.v1')");
        Assert.IsNull(save, "Cinematic sandbox must not award or persist player trophies.");
        var overflow = await Page.EvaluateAsync<double>("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth");
        Assert.IsLessThanOrEqualTo(1, overflow);
    }

    [TestMethod]
    public async Task Mobile_CommunityPlaytest_ReportsAreOptInAndIncludeReproducibleRunData()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });");
        await OpenAsync();

        await Page.Locator("button.playtest-invite").ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Help shape the Wyrmrealm" })).ToBeVisibleAsync();
        await Expect(Page.GetByText("Your report stays on this device until you choose to send or share it.", new() { Exact = false })).ToBeVisibleAsync();
        var shareAction = Page.GetByRole(AriaRole.Button, new() { Name = "SHARE / DOWNLOAD JSON" });
        var bounds = await shareAction.BoundingBoxAsync();
        Assert.IsNotNull(bounds);
        Assert.IsLessThanOrEqualTo(844, bounds.Y + bounds.Height, "Share action must be visible even when the optional form scrolls.");
        await ScreenshotAsync("mobile-playtest-dialog.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Close playtest feedback" }).ClickAsync();

        await EnterFirstTrailAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Abandon run" }).ClickAsync();
        await Page.Locator("button.run-playtest-feedback").ClickAsync();
        await Page.Locator("#playtest-fun").SelectOptionAsync("4");
        await Page.Locator("#playtest-clarity").SelectOptionAsync("3");
        await Page.Locator("#playtest-replay").SelectOptionAsync("yes");
        await Page.Locator("#playtest-area").SelectOptionAsync("movement");
        await Page.Locator("#playtest-improve").FillAsync("Touch movement was confusing.");
        var download = await Page.RunAndWaitForDownloadAsync(async () =>
            await Page.GetByRole(AriaRole.Button, new() { Name = "SHARE / DOWNLOAD JSON" }).ClickAsync());
        Assert.IsTrue(download.SuggestedFilename.StartsWith("wyrmforge-playtest-", StringComparison.Ordinal));
        var file = Path.Combine(ArtifactDirectory, "playtest-test-export.json");
        await download.SaveAsAsync(file);
        using var report = JsonDocument.Parse(await File.ReadAllTextAsync(file));
        var root = report.RootElement;
        Assert.AreEqual("wyrmforge.playtest.report.v1", root.GetProperty("schema").GetString());
        Assert.AreEqual("0.0.83", root.GetProperty("gameVersion").GetString());
        Assert.AreEqual(4, root.GetProperty("feedback").GetProperty("enjoyment").GetInt32());
        Assert.AreEqual("movement", root.GetProperty("feedback").GetProperty("troubleArea").GetString());
        Assert.AreEqual(1, root.GetProperty("stats").GetProperty("completedRuns").GetInt32());
        Assert.AreEqual("Abandoned", root.GetProperty("recentRuns")[0].GetProperty("outcome").GetString());
        Assert.IsGreaterThanOrEqualTo(1, root.GetProperty("stats").GetProperty("trailsEntered").GetInt32());

        await Page.Locator("label.playtest-include input").UncheckAsync();
        var emptyDownload = await Page.RunAndWaitForDownloadAsync(async () =>
            await Page.GetByRole(AriaRole.Button, new() { Name = "SHARE / DOWNLOAD JSON" }).ClickAsync());
        var optedOutPath = Path.Combine(ArtifactDirectory, "playtest-opted-out.json");
        await emptyDownload.SaveAsAsync(optedOutPath);
        using var optedOut = JsonDocument.Parse(await File.ReadAllTextAsync(optedOutPath));
        Assert.AreEqual(0, optedOut.RootElement.GetProperty("recentRuns").GetArrayLength());

        await Page.GetByRole(AriaRole.Button, new() { Name = "Erase my local playtest history" }).ClickAsync();
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.playtest.v1')"));
    }

    [TestMethod]
    public async Task Mobile_CollectorConsent_IsRequiredAndAcknowledgedBeforeSuccess()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("""
            (() => {
                const originalFetch = window.fetch.bind(window);
                window.__collectorPayload = null;
                window.fetch = (resource, options) => {
                    const url = String(resource instanceof Request ? resource.url : resource);
                    if (url.endsWith('/playtest-collector-config.json')) {
                        return Promise.resolve(new Response(JSON.stringify({
                            endpoint: 'https://collector.example.test/v1/reports'
                        }), {status: 200, headers: {'Content-Type': 'application/json'}}));
                    }
                    if (url === 'https://collector.example.test/v1/reports') {
                        window.__collectorPayload = JSON.parse(options.body);
                        return Promise.resolve(new Response(JSON.stringify({
                            accepted: true, id: window.__collectorPayload.report.id
                        }), {status: 202, headers: {'Content-Type': 'application/json'}}));
                    }
                    return originalFetch(resource, options);
                };
            })();
            """);
        await OpenAsync();
        await Page.Locator("button.playtest-invite").ClickAsync();
        var send = Page.GetByRole(AriaRole.Button, new() { Name = "SEND FEEDBACK PRIVATELY" });
        await Expect(send).ToBeVisibleAsync();
        await Expect(send).ToBeDisabledAsync();
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => window.__collectorPayload"));

        await Page.Locator("#playtest-fun").SelectOptionAsync("5");
        await Page.Locator("#playtest-area").SelectOptionAsync("onboarding");
        await Page.Locator("label.playtest-include input").UncheckAsync();
        await Page.Locator("label.playtest-consent input").CheckAsync();
        await Expect(send).ToBeEnabledAsync();
        await send.ClickAsync();
        await Expect(Page.GetByText("Received. Thank you!", new() { Exact = false })).ToBeVisibleAsync();
        var payload = await Page.EvaluateAsync<JsonElement>("() => window.__collectorPayload");
        Assert.IsTrue(payload.GetProperty("consent").GetBoolean());
        Assert.AreEqual(5, payload.GetProperty("report").GetProperty("feedback").GetProperty("enjoyment").GetInt32());
        Assert.AreEqual(0, payload.GetProperty("report").GetProperty("recentRuns").GetArrayLength());
        Assert.AreEqual("wyrmforge.playtest.report.v1", payload.GetProperty("report").GetProperty("schema").GetString());
        await ScreenshotAsync("mobile-collector-consent-success.png");
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
        // Existing gameplay tests represent established accounts, not the new First Hunt tutorial.
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:24, Nodes:[] }));");
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
