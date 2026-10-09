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
    public async Task Mobile_FirstHunt_OnlyRunUnlockedAndGoalIsClear()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "WYRMFORGE", Exact = true })).ToBeVisibleAsync();
        var nav = Page.Locator("nav.menu-actions button");
        await Expect(nav.Filter(new() { HasText = "Arcane Atlas" })).ToBeDisabledAsync();
        await Expect(nav.Filter(new() { HasText = "Forge" })).ToBeDisabledAsync();
        await Expect(nav.Filter(new() { HasText = "Codex" })).ToBeDisabledAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" })).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.firstHunt.v1')"));
    }

    [TestMethod]
    public async Task Mobile_FirstHuntComplete_UnlocksOnePointCodexAndPersistsLocally()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','1'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:1, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Allocate unspent Arcane points" })).ToBeVisibleAsync();
        await Expect(Page.Locator("nav.menu-actions button").Filter(new() { HasText = "Arcane Atlas" })).ToBeEnabledAsync();
        await Expect(Page.Locator("nav.menu-actions button").Filter(new() { HasText = "Codex" })).ToBeEnabledAsync();
        await Expect(Page.Locator("nav.menu-actions button").Filter(new() { HasText = "Forge" })).ToBeDisabledAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Allocate unspent Arcane points" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Atlas", Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".build-points strong")).ToHaveTextAsync("1");
    }

    [TestMethod]
    public async Task Mobile_HallOfFame_SeparatesFictionalLegendsAndOptInEntries()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:2, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.GetByRole(AriaRole.Button, new() { Name = "Open Hall of Fame" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Hall of Fame high scores" })).ToBeVisibleAsync();
        await Expect(Page.GetByText("LEGEND · DEMO").First).ToBeVisibleAsync();
        await Expect(Page.GetByText("YOU · THIS RUN", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "PUBLISH SCORE" })).ToBeDisabledAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Close Hall of Fame" }).ClickAsync();
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.hall-of-fame.local.v1')"));
    }

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
            var mobileForge = Page.Locator("nav.menu-actions button").Filter(new LocatorFilterOptions { HasText = "Forge" });
            await mobileForge.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByRole(AriaRole.Navigation, new() { Name = "Choose a Wyrm lineage" })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("Rimeclaw") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Rimeclaw" })).ToBeVisibleAsync();
            await ScreenshotAsync("mobile-forge-sanctum.png");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Great Hunt", Exact = true }).ClickAsync();
            var oaths = Page.GetByRole(AriaRole.Navigation, new() { Name = "Inspect a Great Hunt oath" });
            await Expect(oaths).ToBeVisibleAsync();
            await oaths.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("Voidweaver") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Oath Beyond the Veil" })).ToBeVisibleAsync();
            await ScreenshotAsync("great-hunt-altar.png");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Goals", Exact = true }).ClickAsync();
            await Expect(Page.GetByText("Your next three pursuits", new() { Exact = true })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Mastery", Exact = true }).ClickAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("PREPARE NEXT HUNT") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true })).ToBeVisibleAsync();
            var mobileCodex = Page.Locator("nav.menu-actions button").Filter(new LocatorFilterOptions { HasText = "Codex" });
            await mobileCodex.ClickAsync();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Lineages", Exact = true }).ClickAsync();
            await Expect(Page.GetByText("WYRMFORGED SPELL LINEAGES", new() { Exact = true })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Great Hunt", Exact = true }).ClickAsync();
            await Expect(Page.Locator(".codex-view .great-hunt-altar")).ToBeVisibleAsync();
            await ScreenshotAsync("mobile-mastery-codex.png");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
            var mobileBuild = Page.Locator("nav.menu-actions button").Filter(new LocatorFilterOptions { HasText = "Arcane Atlas" });
            await mobileBuild.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Atlas", Exact = true })).ToBeVisibleAsync();

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
            await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-home.png");
            var desktopForge = Page.Locator("nav.menu-actions button").Filter(new LocatorFilterOptions { HasText = "Forge" });
            await desktopForge.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByRole(AriaRole.Navigation, new() { Name = "Choose a Wyrm lineage" })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("Stormcoil") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Stormcoil" })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-forge-sanctum.png");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Great Hunt", Exact = true }).ClickAsync();
            var oaths = Page.GetByRole(AriaRole.Navigation, new() { Name = "Inspect a Great Hunt oath" });
            await Expect(oaths).ToBeVisibleAsync();
            await oaths.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("Voidweaver") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Oath Beyond the Veil" })).ToBeVisibleAsync();
            await ScreenshotAsync("great-hunt-altar.png");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Goals", Exact = true }).ClickAsync();
            await Expect(Page.GetByText("Your next three pursuits", new() { Exact = true })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Mastery", Exact = true }).ClickAsync();
            await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("PREPARE NEXT HUNT") }).ClickAsync();
            await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true })).ToBeVisibleAsync();

            var codexButton = Page.Locator("nav.menu-actions button").Filter(new LocatorFilterOptions { HasText = "Codex" });
            await codexButton.ClickAsync();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Lineages", Exact = true }).ClickAsync();
            await Expect(Page.GetByText("WYRMFORGED SPELL LINEAGES", new() { Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-mastery-codex.png");

            await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
            var desktopBuild = Page.Locator("nav.menu-actions button").Filter(new LocatorFilterOptions { HasText = "Arcane Atlas" });
            await desktopBuild.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Atlas", Exact = true })).ToBeVisibleAsync();
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
            Assert.IsLessThanOrEqualTo(2, Math.Abs(vitals.Y + vitals.Height - objective.Y), "Trail status must sit directly beneath vitals.");
            Assert.IsLessThanOrEqualTo(2, Math.Abs(vitals.X - objective.X), "HUD sections must align on the phone.");
            Assert.IsLessThanOrEqualTo(140, vitals.Height + objective.Height, "HUD must leave room for combat.");
            await Expect(Page.GetByRole(AriaRole.Progressbar, new() { Name = "Trail progress" })).ToHaveAttributeAsync("aria-valuenow", new System.Text.RegularExpressions.Regex("^\\d+$"));
            await Expect(Page.Locator("[data-trail='phase-time']")).ToHaveTextAsync(new System.Text.RegularExpressions.Regex("^\\d+s$"));

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
        await Page.GetByRole(AriaRole.Button, new() { Name = "Hunt preparation", Exact = true }).ClickAsync();
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
        await Page.GetByRole(AriaRole.Button, new() { Name = "Hunt preparation", Exact = true }).ClickAsync();
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

        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Feedback", Exact = true }).ClickAsync();
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
        Assert.AreEqual("0.0.88", root.GetProperty("gameVersion").GetString());
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
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Feedback", Exact = true }).ClickAsync();
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

    [TestMethod]
    public async Task Mobile_MainMenu_ShortPortraitAndLandscapeFitWithoutScrolling()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await OpenAsync();
        foreach (var size in new[] { (320, 568), (360, 640), (390, 844), (844, 390) })
        {
            await Page.SetViewportSizeAsync(size.Item1, size.Item2);
            var overflow = await Page.EvaluateAsync<double>("() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight");
            Assert.IsLessThanOrEqualTo(1, overflow, $"Home requires scrolling at {size.Item1}x{size.Item2}.");
            var horizontal = await Page.EvaluateAsync<double>("() => document.documentElement.scrollWidth - window.innerWidth");
            Assert.IsLessThanOrEqualTo(1, horizontal);
            var start = Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true });
            var bounds = await start.BoundingBoxAsync();
            Assert.IsNotNull(bounds);
            Assert.IsGreaterThanOrEqualTo(44, bounds.Height);
            await ScreenshotAsync($"menu-{size.Item1}-{size.Item2}.png");
        }
    }

    [TestMethod]
    public async Task Mobile_Atlas_CompleteWebAndBackNavigationArePreserved()
    {
        await Page.SetViewportSizeAsync(320, 568);
        await OpenAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Allocate unspent Arcane points" }).ClickAsync();
        Assert.IsGreaterThan(40, await Page.Locator(".web-node").CountAsync());
        Assert.IsGreaterThan(40, await Page.Locator(".web-connections line").CountAsync());
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Zoom in", Exact = true })).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true })).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_Quests_ClaimsPersistAndRewardCacheOpensAtNextHunt()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(320, 568);
        await Page.AddInitScriptAsync(@"if (!localStorage.getItem('firstQuestTestSeeded')) {
            localStorage.setItem('firstQuestTestSeeded','1');
            localStorage.setItem('wyrmforge.firstHunt.v1','2');
            localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({Budget:2,Nodes:[],Quests:{
                Trails:4,RareTrails:1,Depth:1,Wyrms:[],Essences:[],Synergy:false,Evolution:false,Claimed:[],Caches:0}})); }");
        await Page.GotoAsync(BaseUrl, new() { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^Quests") }).ClickAsync();
        var dialog = Page.GetByRole(AriaRole.Dialog, new() { Name = "Hunt quests" });
        await Expect(dialog).ToBeVisibleAsync();
        await dialog.Locator(".quest-entry").Filter(new() { HasText = "First path" }).GetByRole(AriaRole.Button, new() { Name = "CLAIM", Exact = true }).ClickAsync();
        await dialog.Locator(".quest-entry").Filter(new() { HasText = "A path to the Wyrm" }).GetByRole(AriaRole.Button, new() { Name = "CLAIM", Exact = true }).ClickAsync();
        await ScreenshotAsync("mobile-quests.png");
        var overflow = await Page.EvaluateAsync<double>("() => document.documentElement.scrollWidth - innerWidth");
        Assert.IsLessThanOrEqualTo(1, overflow);
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        var save = await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.arcaneBuild.v1')");
        using var json = JsonDocument.Parse(save);
        Assert.AreEqual(2, json.RootElement.GetProperty("Budget").GetInt32());
        Assert.AreEqual(60, json.RootElement.GetProperty("HunterExperience").GetInt32());
        Assert.AreEqual(2, json.RootElement.GetProperty("Quests").GetProperty("Claimed").GetArrayLength());
        Assert.AreEqual(1, json.RootElement.GetProperty("Quests").GetProperty("Caches").GetInt32());
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Choose a relic", Exact = true })).ToBeVisibleAsync();
        await ScreenshotAsync("mobile-quest-relic-cache.png");
        var lastChoice = await Page.Locator("button.relic-choice").Last.BoundingBoxAsync();
        Assert.IsNotNull(lastChoice);
        Assert.IsLessThanOrEqualTo(568, lastChoice.Y + lastChoice.Height, "All relic choices should fit on a small phone.");
        await Page.Locator("button.relic-choice").First.ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        Assert.AreEqual(0, await Page.EvaluateAsync<int>("() => JSON.parse(localStorage.getItem('wyrmforge.arcaneBuild.v1')).Quests.Caches"));
    }

    [TestMethod]
    public async Task Mobile_TrailClearDecoration_ContinueReceivesClickAfterAnimation()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await EnterFirstTrailAsync();
        // Exercise the shipped scoped CSS without depending on combat RNG or exposing a gameplay test endpoint.
        await Page.EvaluateAsync(@"() => {
            const screen = document.querySelector('main.game-screen');
            const scope = screen.getAttributeNames().find(name => name.startsWith('b-'));
            const overlay = document.createElement('div');
            overlay.className = 'trail-clear-transition';
            overlay.innerHTML = '<div class=""trail-power-burst"" aria-hidden=""true""></div><strong>TRAIL CLEARED</strong><p>XP collected</p><button>CONTINUE</button>';
            for (const element of [overlay, ...overlay.querySelectorAll('*')]) element.setAttribute(scope, '');
            overlay.querySelector('button').addEventListener('click', () => overlay.remove());
            screen.appendChild(overlay);
            overlay.querySelector('.trail-power-burst').getAnimations().forEach(animation => animation.finish());
        }");
        var burst = Page.Locator(".trail-power-burst");
        await Expect(burst).ToHaveCSSAsync("opacity", "0");
        await Page.Locator(".trail-clear-transition button").ClickAsync(new() { Timeout = 5000 });
        await Expect(Page.Locator(".trail-clear-transition")).ToHaveCountAsync(0);
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_RouteMap_ShowsFullPathAndConcreteRewardBeforeEntering(int width, int height)
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(width, height);
        await OpenAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true }).ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        var wyrm = await Page.Locator("button.route-node.dragon").BoundingBoxAsync();
        Assert.IsNotNull(wyrm);
        Assert.IsLessThanOrEqualTo(height, wyrm.Y + wyrm.Height, "The complete route must fit on a portrait phone.");
        var node = Page.Locator("button.route-node.available").First;
        var seal = await node.Locator(".node-core").BoundingBoxAsync();
        Assert.IsNotNull(seal);
        Assert.IsGreaterThanOrEqualTo(44, seal.Width);
        await ScreenshotAsync($"mobile-route-map-{width}.png");
        await node.ClickAsync();
        await Expect(Page.GetByLabel("Selected trail details")).ToBeVisibleAsync();
        await Expect(Page.Locator(".sheet-guarantee")).ToContainTextAsync("upgrade · guaranteed");
        await Expect(Page.Locator(".route-link.selected").First).ToBeVisibleAsync();
        var enter = Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$") });
        var action = await enter.BoundingBoxAsync();
        Assert.IsNotNull(action);
        Assert.IsLessThanOrEqualTo(height, action.Y + action.Height);
        await ScreenshotAsync($"mobile-route-preview-{width}.png");
        await enter.ClickAsync();
        await Expect(Page.GetByLabel("Current encounter objective")).ToBeVisibleAsync();
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_UpgradeConfirmation_FitsBelowHudAndCannotInterceptTouches(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await OpenAsync();
        await EnterFirstTrailAsync();
        // Isolate the shipped scoped presentation from combat RNG; readout correctness is covered separately.
        await Page.EvaluateAsync(@"() => {
            const rules = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules]; } catch { return []; } });
            const rule = rules.find(rule => rule.selectorText?.includes('.run-moment.upgrade-moment'));
            const scope = rule.selectorText.match(/\[(b-[^\]]+)\]/)[1];
            const moment = document.createElement('div');
            moment.className = 'run-moment upgrade-moment tone-standard';
            moment.innerHTML = '<strong>◈ Arcane Orb</strong><small>Pierce +1 • 18 → 23 damage • 0.65 → 0.61s</small>';
            for (const element of [moment, ...moment.children]) element.setAttribute(scope, '');
            document.querySelector('main.game-screen').appendChild(moment);
        }");
        var moment = Page.Locator(".upgrade-moment").Last;
        await Expect(moment).ToBeVisibleAsync();
        await Expect(moment).ToHaveCSSAsync("pointer-events", "none");
        var box = await moment.BoundingBoxAsync();
        var hud = await Page.Locator(".arena-top-hud").BoundingBoxAsync();
        Assert.IsNotNull(box);
        Assert.IsNotNull(hud);
        Assert.IsGreaterThanOrEqualTo(hud.Y + hud.Height, box.Y);
        Assert.IsLessThanOrEqualTo(width, box.X + box.Width);
        Assert.IsLessThanOrEqualTo(height, box.Y + box.Height);
        Assert.IsFalse(await moment.EvaluateAsync<bool>(@"node => {
            const box = node.getBoundingClientRect();
            return !!document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('.upgrade-moment');
        }"));
        await ScreenshotAsync($"mobile-upgrade-confirmation-{width}.png");
    }

    private async Task EnterFirstTrailAsync()
    {
        var back = Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" });
        if (await back.IsVisibleAsync()) await back.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true }).ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();

        var route = Page.Locator("button.route-node.available").First;
        await route.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();
    }

    private async Task OpenAsync()
    {
        // Existing gameplay tests represent established accounts, not the new First Hunt tutorial.
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:24, Nodes:[] })); localStorage.setItem('wyrmforge.essenceVault', JSON.stringify(['CinderHeart']));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.Locator("main.game-shell")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_CriticalHealthCue_UsesShippedRendererAndPreservesPointerInput()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await Page.EvaluateAsync(@"async () => {
            const arena = await import(new URL('js/arena.js', document.baseURI).href);
            document.body.innerHTML = '<canvas id=""danger-test"" style=""position:fixed;inset:0;width:100vw;height:100vh;touch-action:none""></canvas>';
            window.__dangerHealth = 100;
            window.__dangerMovement = 0;
            arena.initializeArena(document.querySelector('canvas'), {
                invokeMethodAsync: async (method, delta, width, height, x, y) => {
                    window.__dangerMovement = Math.max(window.__dangerMovement, Math.abs(x) + Math.abs(y));
                    return { player: { x:195, y:400, radius:12, barrier:false }, hud: { health:window.__dangerHealth, maxHealth:100 },
                        enemies:[], splashPulses:[], elementalImpacts:[], deathBursts:[], essenceBursts:[], essenceBolts:[], projectiles:[], lightning:[], paused:false, ended:false };
                }
            });
        }");
        await Page.WaitForFunctionAsync("() => document.querySelector('canvas').width > 0");
        await Page.EvaluateAsync("() => window.__dangerHealth = 12");
        await Page.WaitForFunctionAsync(@"() => {
            const canvas = document.querySelector('canvas');
            const pixel = canvas.getContext('2d').getImageData(2, Math.floor(canvas.height / 2), 1, 1).data;
            return pixel[0] > 30 && pixel[0] > pixel[1] * 1.5;
        }");
        await ScreenshotAsync("mobile-critical-health.png");
        await Page.Mouse.MoveAsync(190, 600);
        await Page.Mouse.DownAsync();
        await Page.Mouse.MoveAsync(250, 600);
        await Page.WaitForFunctionAsync("() => window.__dangerMovement > .5");
        await Page.Mouse.UpAsync();
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
