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
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_BuildingLab_CanAuthorAndLockIndependentStages_WithoutChangingGame(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/sprite-lab/buildings/",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Building Lab v0.1" })).ToBeVisibleAsync();
        await Expect(Page.Locator("#buildingCanvas")).ToBeVisibleAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const c = document.querySelector('#buildingCanvas');
            if (!c || c.width !== 724 || c.height !== 440) return false;
            const g = c.getContext('2d');
            const points = [[30,30],[140,90],[270,160],[450,240],[550,390]];
            return new Set(points.map(([x,y]) => {
                const p = g.getImageData(x,y,1,1).data;
                return [p[0],p[1],p[2]].join(',');
            })).size >= 4;
        }");

        await Page.Locator("#slotList button[data-slot='lamp']").ClickAsync();
        await Page.Locator("#slotVariant").SelectOptionAsync("reference");
        await Expect(Page.Locator("#slotVariant")).ToHaveValueAsync("reference");
        await Page.Locator("#lockStage").ClickAsync();
        await Expect(Page.Locator("#slotVariant")).ToBeDisabledAsync();

        await Page.Locator("#stageList button[data-stage='active']").ClickAsync();
        await Expect(Page.Locator("#slotVariant")).ToBeEnabledAsync();
        await Expect(Page.Locator("#slotVariant")).ToHaveValueAsync("reference");
        var saved = await Page.EvaluateAsync<string>(@"() =>
            localStorage.getItem('wyrmforge-building-lab-v1:wyrmforge')");
        Assert.IsNotNull(saved);
        using var document = JsonDocument.Parse(saved);
        Assert.IsTrue(document.RootElement.GetProperty("stages").GetProperty("vacant").GetProperty("locked").GetBoolean());
        Assert.IsFalse(document.RootElement.GetProperty("visualAccepted").GetBoolean());

        await Page.Locator("#buildingSelect").SelectOptionAsync("nexus");
        await Expect(Page.Locator("#previewTitle")).ToContainTextAsync("Arcane Nexus");
        await Page.Locator("#buildingSelect").SelectOptionAsync("wyrmforge");
        await Page.Locator("#stageList button[data-stage='vacant']").ClickAsync();
        await Expect(Page.Locator("#slotVariant")).ToBeDisabledAsync();
        Assert.IsFalse(await Page.EvaluateAsync<bool>(@"() =>
            localStorage.getItem('wyrmforge.firstHunt.v1') !== null"));
    }

    [TestMethod]
    public async Task Mobile_CombatLab_SelectedMonsterOpensInRealEnemyLab_AndSwitchesImmediately()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/combat-lab", new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.Locator(".combat-lab")).ToBeVisibleAsync();
        await Page.Locator(".dummy-toolbar select").SelectOptionAsync("MireHound");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Inspect live monster ↗" }).ClickAsync();

        await Expect(Page.Locator(".enemy-lab")).ToBeVisibleAsync();
        await Expect(Page.Locator(".enemy-lab .status")).ToContainTextAsync("MireHound");
        await Expect(Page.Locator(".enemy-lab canvas")).ToBeVisibleAsync();

        // The chooser must reload the encounter, not just rename a static test dummy.
        await Page.GetByRole(AriaRole.Combobox, new() { Name = "Monster to inspect" })
            .SelectOptionAsync("WhitefangStalker");
        await Expect(Page.Locator(".enemy-lab .status")).ToContainTextAsync("WhitefangStalker");
        StringAssert.Contains(Page.Url, "kind=WhitefangStalker");
        await Page.GetByRole(AriaRole.Combobox, new() { Name = "Monster to inspect" })
            .SelectOptionAsync("MireHound");
        await Expect(Page.Locator(".enemy-lab .status")).ToContainTextAsync("MireHound");
        StringAssert.Contains(Page.Url, "kind=MireHound");
    }

    [TestMethod]
    public async Task Mobile_MireHound_RealLabCanCompareNativePixelsAgainstPublishedArt()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var baseUrl = BaseUrl.TrimEnd('/');
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=MireHound&seed=42&autoplay=false&cast=false&mireStyle=pixel",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.Locator(".enemy-lab")).ToBeVisibleAsync();
        await Expect(Page.Locator(".enemy-lab .status")).ToContainTextAsync("PIXEL ART PREVIEW");
        await Expect(Page.GetByRole(AriaRole.Combobox, new() { Name = "Mire Hound art style" })).ToHaveValueAsync("pixel");
        await Expect(Page.Locator("#wyrmforge-ignition")).ToBeHiddenAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const canvas = document.querySelector('.enemy-lab canvas');
            return canvas && canvas.width > 0 && canvas.height > 0
                && canvas.getContext('2d') != null;
        }");
        // Await a real render tick after hydration so screenshots cannot be
        // taken of the startup veil with an allocated but still-empty canvas.
        await Page.WaitForTimeoutAsync(600);
        await ScreenshotAsync("mire-hound-pixel-in-real-lab-390.png");

        await Page.GetByRole(AriaRole.Combobox, new() { Name = "Mire Hound art style" }).SelectOptionAsync("painted");
        await Expect(Page.Locator(".enemy-lab .status")).ToContainTextAsync("PUBLISHED ART");
        StringAssert.Contains(Page.Url, "mireStyle=painted");
        StringAssert.Contains(Page.Url, "seed=42");
        await Expect(Page.Locator("#wyrmforge-ignition")).ToBeHiddenAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const canvas = document.querySelector('.enemy-lab canvas');
            return canvas && canvas.width > 0 && canvas.height > 0
                && canvas.getContext('2d') != null;
        }");
        // Await a real render tick after hydration so screenshots cannot be
        // taken of the startup veil with an allocated but still-empty canvas.
        await Page.WaitForTimeoutAsync(600);
        await ScreenshotAsync("mire-hound-published-in-real-lab-390.png");
    }

    [TestMethod]
    public async Task Mobile_Welcome_HasFullArtworkAndAudioOnlyInsideSettings()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        var title = Page.Locator(".title-scene");
        await Expect(title).ToBeVisibleAsync();
        await Expect(Page.Locator("#wyrmforge-ignition")).ToBeHiddenAsync();
        await ScreenshotAsync("welcome-full-art.png");
        var image = Page.Locator(".arrival-reference-art");
        await Expect(image).ToBeVisibleAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const image = document.querySelector('.arrival-reference-art');
            return image && image.complete && image.naturalWidth === 864 && image.naturalHeight === 1222;
        }");
        var approvedPoster = await image.GetAttributeAsync("src");
        Assert.IsTrue(approvedPoster?.EndsWith("wyrmforge-welcome-reference.webp", StringComparison.Ordinal) == true,
            "Arrival must use the supplied approved portrait artwork, not the old landscape asset.");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "WYRMFORGE" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".wyrmforge-sound-controls")).ToBeHiddenAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Settings", Exact = true }).ClickAsync();
        await Expect(Page.Locator(".settings-audio-slot .wyrmforge-sound-controls")).ToBeVisibleAsync();
        await ScreenshotAsync("settings-audio.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await Expect(Page.Locator(".wyrmforge-sound-controls")).ToBeHiddenAsync();
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(375, 667)]
    [DataRow(390, 640)] // Realistic Safari content height with browser chrome visible.
    [DataRow(390, 844)]
    public async Task Mobile_Welcome_StartButtonIsPlayableAndFitsOnScreen(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.Locator("#wyrmforge-ignition")).ToBeHiddenAsync();

        var fits = await Page.EvaluateAsync<bool>(@"() => {
            const scene = document.querySelector('.arrival-home .title-scene');
            const frame = document.querySelector('.arrival-reference-frame');
            const image = document.querySelector('.arrival-reference-art');
            const start = document.querySelector('.arrival-hitbox--start');
            const settings = document.querySelector('.arrival-hitbox--settings');
            const bounds = scene.getBoundingClientRect();
            const poster = frame.getBoundingClientRect();
            const art = image.getBoundingClientRect();
            const button = start.getBoundingClientRect();
            const controls = settings.getBoundingClientRect();
            const centerWithinScreen = rect =>
                rect.left + rect.width / 2 > 0 && rect.left + rect.width / 2 < innerWidth
                && rect.top + rect.height / 2 > 0 && rect.top + rect.height / 2 < innerHeight;
            return bounds.top >= -1 && Math.abs(bounds.bottom - innerHeight) <= 2
                && poster.width >= innerWidth - 2 && poster.height >= innerHeight - 2
                && Math.abs(art.width / art.height - (864 / 1222)) < .005
                && centerWithinScreen(button) && centerWithinScreen(controls)
                && button.width >= 160 && button.height >= 48
                && document.documentElement.scrollWidth <= innerWidth + 1;
        }");
        Assert.IsTrue(fits, "Approved portrait scene must fully cover the screen with correctly aligned clickable targets.");
        await ScreenshotAsync($"welcome-exact-art-{width}x{height}.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "START GAME" }).ClickAsync();
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_Refuge_HasThreeScrollableSlicesAndClickableBuildings(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await OpenAsync();

        await Expect(Page.GetByLabel("Refuge town square")).ToBeVisibleAsync();
        await Expect(Page.Locator(".town-hotspot")).ToHaveCountAsync(5);
        var scene = Page.Locator(".town-panorama-art");
        await Expect(scene).ToBeVisibleAsync();
        Assert.IsTrue((await scene.GetAttributeAsync("src"))?.Contains("refuge-town-vacant.webp", StringComparison.Ordinal) == true,
            "The town must load the corrected vacant blacksmith asset.");

        await Page.WaitForFunctionAsync(@"() => {
            const image = document.querySelector('.town-panorama-art');
            return image && image.complete && image.naturalWidth === 2172 && image.naturalHeight === 724;
        }");
        var viewport = Page.Locator(".town-panorama-viewport");
        var proportionsCorrect = await viewport.EvaluateAsync<bool>(@"element => {
            const img = element.querySelector('.town-panorama-art');
            const rect = img.getBoundingClientRect();
            const track = element.querySelector('.town-panorama');
            return Math.abs(rect.width / rect.height - img.naturalWidth / img.naturalHeight) < .005
                && Math.abs(track.clientWidth / 3 - rect.height) < 2
                && Math.abs(rect.height - element.clientHeight) < 2
                && element.scrollWidth > element.clientWidth * 2;
        }");
        Assert.IsTrue(proportionsCorrect, "Portrait screens must crop the naturally proportioned scene, never stretch it.");

        await Page.WaitForFunctionAsync(@"() => {
            const view = document.querySelector('.town-panorama-viewport');
            const expected = view.scrollWidth / 2 - view.clientWidth / 2;
            return Math.abs(view.scrollLeft - expected) < 4;
        }");
        await ScreenshotAsync($"refuge-town-center-{width}.png");
        await viewport.EvaluateAsync("element => window.wyrmforgeTown.show(0, false)");
        await Page.WaitForFunctionAsync(@"() => {
            const view = document.querySelector('.town-panorama-viewport');
            return Math.abs(view.scrollLeft - (view.scrollWidth / 6 - view.clientWidth / 2)) < 4;
        }");
        await Expect(Page.Locator(".town-hotspot--build")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".town-hotspot--forge")).ToHaveCountAsync(1);
        await ScreenshotAsync($"refuge-town-left-{width}.png");

        await viewport.EvaluateAsync("element => window.wyrmforgeTown.show(2, false)");
        await Page.WaitForFunctionAsync(@"() => {
            const view = document.querySelector('.town-panorama-viewport');
            return Math.abs(view.scrollLeft - (view.scrollWidth * 5 / 6 - view.clientWidth / 2)) < 4;
        }");
        await Expect(Page.Locator(".town-hotspot--codex")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".town-hotspot--legends")).ToHaveCountAsync(1);
        await ScreenshotAsync($"refuge-town-right-{width}.png");

        var fullscreen = await viewport.EvaluateAsync<bool>(@"element => {
            const rect = element.getBoundingClientRect();
            return Math.abs(rect.width - innerWidth) <= 2 && Math.abs(rect.height - innerHeight) <= 2;
        }");
        Assert.IsTrue(fullscreen, "The town must occupy the full browser viewport rather than a square card.");
        await Expect(Page.Locator(".town-action-dock")).ToHaveCountAsync(0);
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_ArcaneNexus_SocketsWrapAndInspectorLeavesWebVisible(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','3'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:24, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator("button.town-door--build").ClickAsync();

        var rack = Page.Locator(".nexus-rack-details");
        await Expect(rack).ToBeVisibleAsync();
        await rack.Locator("summary").ClickAsync();
        await Expect(Page.Locator(".nexus-rack-socket")).ToHaveCountAsync(4);

        var socketsFit = await Page.Locator(".nexus-socket-rack").EvaluateAsync<bool>(@"rack => {
            return [...rack.querySelectorAll('button')].every(button => {
                const box = button.getBoundingClientRect();
                const parent = rack.getBoundingClientRect();
                return button.scrollWidth <= button.clientWidth + 2 &&
                    box.left >= parent.left - 1 && box.right <= parent.right + 1;
            });
        }");
        Assert.IsTrue(socketsFit, "Crafted spell socket names must wrap without clipping.");

        await Page.Locator(".nexus-rack-socket").First.ClickAsync();
        var inspector = Page.Locator(".node-inspector.open");
        await Expect(inspector).ToBeVisibleAsync();

        var webNotOccluded = await Page.EvaluateAsync<bool>(@"() => {
            const web = document.querySelector('.atlas-stage').getBoundingClientRect();
            const details = document.querySelector('.node-inspector.open').getBoundingClientRect();
            return details.top >= web.bottom - 1;
        }");
        Assert.IsTrue(webNotOccluded, "The node inspector must sit beneath the Web, not over the skill nodes.");
        await ScreenshotAsync($"nexus-sockets-{width}.png");
    }

    [TestMethod]
    public async Task Mobile_RecoveryTrail_OffscreenOpenedCacheHasVisibleButOptionalDiegeticGuide()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        var result = await Page.EvaluateAsync<JsonElement>(@"async () => {
            const recovery = await import('./js/arena-recovery.js');
            const camera = { x: 250, y: 240, width: 950, height: 1550 };
            const base = { player: { x: 500, y: 700 }, hud: { health: 45, maxHealth: 100 },
                environment: { supplies: [{ kind: 'health', x: .5, y: .82, open: true }] } };
            const canvas = document.createElement('canvas');
            canvas.width = 950;
            canvas.height = 1550;
            const ctx = canvas.getContext('2d');
            const image = render => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const drawn = render();
                return { drawn, data: ctx.getImageData(370, 580, 255, 250).data };
            };
            const empty = image(() => recovery.drawRecoveryGuide(ctx, { ...base,
                hud: { health: 95, maxHealth: 100 } }, camera, 390, 700, 0, true));
            const full = image(() => recovery.drawRecoveryGuide(ctx, base, camera, 390, 700, 0, true));
            const sealed = image(() => recovery.drawRecoveryGuide(ctx,
                { ...base, environment: { supplies: [{ kind: 'health', x: .5, y: .82, open: false }] } },
                camera, 390, 700, 0, true));
            let painted = 0;
            for (let i = 3; i < full.data.length; i += 4) if (full.data[i] !== empty.data[i]) painted++;
            let leaked = 0;
            for (let i = 3; i < sealed.data.length; i += 4) if (sealed.data[i] !== empty.data[i]) leaked++;
            return { visible: full.drawn, healthyHidden: !empty.drawn, sealedHidden: !sealed.drawn, painted, leaked };
        }");
        Assert.IsTrue(result.GetProperty("visible").GetBoolean());
        Assert.IsTrue(result.GetProperty("healthyHidden").GetBoolean());
        Assert.IsTrue(result.GetProperty("sealedHidden").GetBoolean());
        Assert.IsGreaterThan(35, result.GetProperty("painted").GetInt32(), "Ground marks must have visible actual canvas pixels.");
        Assert.AreEqual(0, result.GetProperty("leaked").GetInt32(), "Sealed caches must not leak even one guidance pixel.");
    }

    [TestMethod]
    public async Task Mobile_FirstHunt_OnlyRunUnlockedAndGoalIsClear()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "REFUGE", Exact = true })).ToBeVisibleAsync();
        var nav = Page.Locator("nav.menu-actions button");
        await Expect(nav.Filter(new() { HasText = "Arcane Nexus" })).ToHaveAttributeAsync("data-town-state", "vacant");
        await Expect(nav.Filter(new() { HasText = "Forge" })).ToHaveAttributeAsync("data-town-state", "vacant");
        await Expect(nav.Filter(new() { HasText = "Codex" })).ToHaveAttributeAsync("data-town-state", "vacant");
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" })).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();
        await Expect(Page.Locator(".wyrmforge-sound-controls")).ToBeHiddenAsync();
        await Page.WaitForFunctionAsync("() => { const audio = window.wyrmforgeAudio.diagnostics(); return audio.music === 'hunt' && audio.musicPlaying; }");

        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.firstHunt.v1')"));
    }

    [TestMethod]
    public async Task Mobile_SoundTest_ActivatesAudioAndPersistsMutePreference()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Play sound test" })).ToBeHiddenAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Expect(Page.Locator(".settings-screen")).ToBeVisibleAsync();
        var test = Page.GetByRole(AriaRole.Button, new() { Name = "Play sound test" });
        var toggle = Page.GetByRole(AriaRole.Button, new() { Name = "Mute game sound effects" });
        await Expect(test).ToBeVisibleAsync();
        await Expect(toggle).ToBeVisibleAsync();

        await test.ClickAsync();
        await Expect(Page.Locator(".wyrmforge-sound-status")).ToContainTextAsync("AUDIO");
        var status = await Page.EvaluateAsync<string>("() => window.wyrmforgeAudio.diagnostics().state");
        Assert.AreNotEqual("uninitialized", status, "Sound test must create a real Web Audio context from a click.");

        await toggle.ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Enable game sound effects" })).ToBeVisibleAsync();
        await Expect(test).ToBeDisabledAsync();
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Enable game sound effects" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Play sound test" })).ToBeDisabledAsync();
    }

    [TestMethod]
    public async Task Mobile_SoundAtelier_PreviewsPaletteAndRemembersMix()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        var open = Page.GetByRole(AriaRole.Button, new() { Name = "Open Sound Atelier" });
        await open.ClickAsync();

        var atelier = Page.GetByRole(AriaRole.Dialog, new() { Name = "Sound Atelier" });
        await Expect(atelier).ToBeVisibleAsync();
        await atelier.GetByRole(AriaRole.Button, new() { Name = "Start and preview soundtrack" }).ClickAsync();
        await Page.WaitForFunctionAsync("() => window.wyrmforgeAudio.diagnostics().musicPlaying === true");
        var musicDetails = await Page.EvaluateAsync<int>("() => window.wyrmforgeAudio.diagnostics().musicTracks.length");
        Assert.AreEqual(2, musicDetails, "Both menu and hunt tracks must be primed during the trusted tap.");

        await Expect(atelier.GetByRole(AriaRole.Button, new() { Name = "Preview upgrade-open sound" })).ToBeVisibleAsync();
        await Expect(atelier.GetByRole(AriaRole.Button, new() { Name = "Preview upgrade-choice sound" })).ToBeVisibleAsync();
        await atelier.GetByRole(AriaRole.Button, new() { Name = "Preview upgrade-open sound" }).ClickAsync();
        await atelier.GetByRole(AriaRole.Button, new() { Name = "Preview upgrade-choice sound" }).ClickAsync();
        await Expect(atelier.GetByRole(AriaRole.Button, new() { Name = "Preview arcane sound" })).ToBeVisibleAsync();
        await atelier.GetByRole(AriaRole.Button, new() { Name = "Preview arcane sound" }).ClickAsync();
        Assert.AreEqual("Recorded Dark Fantasy", await Page.EvaluateAsync<string>("() => window.wyrmforgeAudio.diagnostics().identity"));

        var combat = atelier.GetByRole(AriaRole.Slider, new() { Name = "Combat volume" });
        await combat.FocusAsync();
        await combat.PressAsync("Home");
        for (var i = 0; i < 6; i++) await combat.PressAsync("ArrowRight");
        Assert.AreEqual("0.3", await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.audio.combat.v1')"));
        await atelier.GetByRole(AriaRole.Button, new() { Name = "Close Sound Atelier" }).ClickAsync();
        await Expect(atelier).ToBeHiddenAsync();

        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Open Sound Atelier" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Slider, new() { Name = "Combat volume" })).ToHaveValueAsync("30");
    }

    [TestMethod]
    public async Task Mobile_FirstHuntComplete_UnlocksOnePointCodexAndPersistsLocally()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','1'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:1, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Allocate unspent Arcane points" })).ToBeVisibleAsync();
        await Expect(Page.Locator("nav.menu-actions button").Filter(new() { HasText = "Arcane Nexus" })).ToBeEnabledAsync();
        await Expect(Page.Locator("nav.menu-actions button").Filter(new() { HasText = "Codex" })).ToBeEnabledAsync();
        await Expect(Page.Locator("nav.menu-actions button").Filter(new() { HasText = "Forge" })).ToHaveAttributeAsync("data-town-state", "vacant");
        await Expect(Page.Locator(".town-building-layer[data-town-building='build']")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".town-building-layer[data-town-building='codex']")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".town-building-layer[data-town-building='legends'][data-building-state='vacant']")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".town-panorama-open-forge")).ToHaveCountAsync(0);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Allocate unspent Arcane points" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Nexus", Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".build-points strong")).ToHaveTextAsync("1");
    }

    [TestMethod]
    public async Task Mobile_Spellcraft_ResearchesAndBindsRimeInfusionWithConsent()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','3'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:8, Nodes:[] })); localStorage.setItem('wyrmforge.essenceVault', JSON.stringify(['RimeHeart']));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator("nav.menu-actions button").Filter(new() { HasText = "Arcane Nexus" }).ClickAsync();
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Spellcraft" }).ClickAsync();

        await Expect(Page.Locator(".resonance-title h2")).ToHaveTextAsync("Frostfire");
        await Expect(Page.Locator(".grimoire-count b")).ToHaveTextAsync("0");
        Assert.IsTrue(await Page.Locator(".ritual-canvas").EvaluateAsync<bool>("canvas => canvas.width > 0 && canvas.height === canvas.width"), "The ritual circle renders on a square canvas.");

        var primary = Page.Locator(".rite-primary");
        for (var entries = 1; entries <= 6 && !(await Page.Locator(".resonance-stage").InnerTextAsync()).Contains("READY", StringComparison.OrdinalIgnoreCase); entries++)
        {
            await primary.ClickAsync();
            await Expect(Page.Locator(".research-log summary")).ToContainTextAsync($"{entries} entr");
        }
        await Expect(Page.Locator(".resonance-stage")).ToHaveTextAsync("Ready to bind");

        await primary.ClickAsync();
        var consent = Page.GetByRole(AriaRole.Alertdialog, new() { Name = "Bind the resonance" });
        await Expect(consent).ToBeVisibleAsync();
        Assert.AreEqual("[\"RimeHeart\"]", await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.essenceVault')"), "Nothing is consumed before consent.");
        await consent.GetByRole(AriaRole.Button, new() { Name = "CONSUME & BIND" }).ClickAsync();

        await Expect(Page.Locator(".resonance-title h2")).ToHaveTextAsync("Rime Infusion");
        await Expect(Page.Locator(".grimoire-count b")).ToHaveTextAsync("1");
        Assert.IsFalse((await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.essenceVault') ?? '[]'")).Contains("RimeHeart"), "Binding consumes the Rime Heart.");

        await Page.Locator(".element-token").Filter(new() { HasText = "Storm" }).ClickAsync();
        await Page.Locator(".seat-infusion").ClickAsync();
        await Page.Locator(".element-token").Filter(new() { HasText = "Storm" }).ClickAsync();
        await Expect(Page.Locator(".resonance-title h2")).ToHaveTextAsync("Flashpoint");
        await Expect(primary).ToContainTextAsync("SEALED");
    }

    [TestMethod]
    public async Task Mobile_HallOfFame_SeparatesFictionalLegendsAndAutomaticScores()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:2, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Open Hall of Fame" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Hall of Fame high scores" })).ToBeVisibleAsync();
        await Expect(Page.GetByText("LEGEND · DEMO").First).ToBeVisibleAsync();
        await Expect(Page.GetByText("YOU · THIS RUN", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "PUBLISH SCORE" })).ToHaveCountAsync(0);
        await Expect(Page.GetByText("Scores sync automatically using your player name.")).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Close Hall of Fame" }).ClickAsync();
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.hall-of-fame.local.v1')"));
    }

    [TestMethod]
    public async Task Mobile_PlayerName_PersistsAndArenaStatusCanvasStaysInsideGame()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(320, 568);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        var edit = Page.GetByRole(AriaRole.Button, new() { Name = "Edit player name", Exact = true });
        await Expect(Page.GetByRole(AriaRole.Textbox, new() { Name = "Player name", Exact = true })).ToHaveCountAsync(0);
        await edit.ClickAsync();
        var name = Page.GetByRole(AriaRole.Textbox, new() { Name = "Player name", Exact = true });
        await name.FillAsync("Test Hunter");
        await Page.GetByRole(AriaRole.Button, new() { Name = "SAVE", Exact = true }).ClickAsync();
        await Expect(edit).ToContainTextAsync("Test Hunter");
        var cookie = (await Context.CookiesAsync()).Single(cookie => cookie.Name == "wyrmforge_player_name");
        Assert.AreEqual("Test Hunter", Uri.UnescapeDataString(cookie.Value));
        await edit.ClickAsync();
        await name.FillAsync("f_u_c_k");
        await Page.GetByRole(AriaRole.Button, new() { Name = "SAVE", Exact = true }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Alert)).ToHaveTextAsync("Choose a different name.");
        await Page.GetByRole(AriaRole.Button, new() { Name = "CANCEL", Exact = true }).ClickAsync();
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(edit).ToContainTextAsync("Test Hunter");
        await Page.Locator("#wyrmforge-ignition").WaitForAsync(new() { State = WaitForSelectorState.Hidden });
        await ScreenshotAsync("mobile-player-name-320.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        await Page.Locator(".primary-arcane").ClickAsync();
        await Expect(Page.Locator(".game-screen canvas[aria-hidden='true']")).ToHaveCountAsync(1);
        await Expect(Page.Locator("body > canvas")).ToHaveCountAsync(0);
        await Page.Locator("button.route-node.available").First.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator(".combat-spell-badge svg").First).ToBeVisibleAsync();
        await Page.EvaluateAsync(@"async () => {
            const {createSpellBadge} = await import(new URL('js/spell-hud.js',document.baseURI).href);
            const names = ['Arcane Orb','Fire Bolt','Frost Shard','Chain Lightning','Cinder Needle','Ice Lance','Ball Lightning','Aether Dart'];
            const row = document.querySelector('[data-hud=spells]');
            row.replaceChildren(...names.map(name => createSpellBadge({name,rank:3})));
            // Measure the full loadout synchronously before the next combat HUD update.
            row.dataset.loadout = 'sample';
            window.__fullLoadoutFits = () => {
                const box = row.getBoundingClientRect();
                return [...row.children].every(item => item.getBoundingClientRect().right <= box.right);
            };
            window.__fullLoadoutFitsResult = window.__fullLoadoutFits();
        }");
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => window.__fullLoadoutFitsResult"));
        await ScreenshotAsync("mobile-spell-badges-320.png");
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
            var mobileBuild = Page.Locator("nav.menu-actions button").Filter(new LocatorFilterOptions { HasText = "Arcane Nexus" });
            await mobileBuild.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Nexus", Exact = true })).ToBeVisibleAsync();

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
            var desktopBuild = Page.Locator("nav.menu-actions button").Filter(new LocatorFilterOptions { HasText = "Arcane Nexus" });
            await desktopBuild.EvaluateAsync("element => element.click()");
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Nexus", Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-atlas.png");
        }
        finally
        {
            await StopTraceAsync("desktop-shell-trace.zip");
        }
    }

    [TestMethod]
    public async Task Mobile_HealthStatus_IsImmediateAndDoesNotRequireHelpButton()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await EnterFirstTrailAsync();

        await Expect(Page.Locator(".combat-health-help")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".health-help-panel")).ToHaveCountAsync(0);
        await Expect(Page.GetByRole(AriaRole.Progressbar, new() { Name = "Health" })).ToBeVisibleAsync();
        await Expect(Page.Locator("[data-hud='health']")).ToContainTextAsync("HP");
        var state = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"() => {
            const value = document.querySelector('[data-hud=health]').textContent;
            const bar = document.querySelector('.combat-health-track');
            return { text: value, value: bar.getAttribute('aria-valuenow'),
                state: document.querySelector('.combat-vitals').dataset.healthState };
        }");
        Assert.IsTrue(state.GetProperty("text").GetString()!.Contains("♥"));
        Assert.IsTrue(int.TryParse(state.GetProperty("value").GetString(), out _));
        Assert.IsNotNull(state.GetProperty("state").GetString());
    }

    [TestMethod]
    public async Task Mobile_SpellLighting_ActuallyIlluminatesGroundAndMageBySchoolAndSurge()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        var pixels = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"async () => {
            const lights = await import('./js/arena-spell-lighting.js');
            const mage = await import('./js/arena-mage.js');
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 240;
            const ctx = canvas.getContext('2d');
            const player = { x: 115, y: 115, radius: 12 };
            const camera = { x: 0, y: 0, width: 240, height: 240 };
            const sample = (spell, surge, includeMage) => {
                ctx.clearRect(0, 0, 240, 240);
                ctx.fillStyle = '#292a30';
                ctx.fillRect(0, 0, 240, 240);
                const snapshot = { projectiles: [], elementalImpacts: [{
                    x: 125, y: 108, spell, rank: 3, progress: .16, surge }] };
                const sources = lights.buildSpellLights(snapshot, 0, true);
                lights.drawSpellLightSpill(ctx, sources, camera);
                if (includeMage) mage.drawMage(ctx, player, null, false, true,
                    lights.sampleSpellLight(sources, player.x, player.y));
                return {
                    ground: [...ctx.getImageData(126, 104, 24, 24).data],
                    mage: [...ctx.getImageData(118, 103, 5, 8).data],
                    pixels: [...ctx.getImageData(0, 0, 240, 240).data]
                };
            };
            const fire = sample(1, false, true);
            const frost = sample(2, false, true);
            const arcane = sample(0, false, true);
            const surge = sample(1, true, true);
            const normalGround = sample(1, false, false);
            const base = [...Array(240 * 240 * 4)].fill(0);
            const differ = (a, b) => a.reduce((n, value, index) => n + (Math.abs(value - b[index]) > 12 ? 1 : 0), 0);
            return { groundSchoolDifference: differ(fire.ground, frost.ground),
                mageSchoolDifference: differ(fire.mage, arcane.mage),
                surgeGroundDifference: differ(surge.pixels, fire.pixels),
                magePresent: differ(fire.pixels, normalGround.pixels) };
        }");
        Assert.IsGreaterThan(35, pixels.GetProperty("groundSchoolDifference").GetInt32(), "A visible terrain patch must reflect different magic colors.");
        Assert.IsGreaterThan(5, pixels.GetProperty("mageSchoolDifference").GetInt32(), "The lit side of the hood must reflect the spell color.");
        Assert.IsGreaterThan(180, pixels.GetProperty("surgeGroundDifference").GetInt32(), "Surge must illuminate a visibly larger patch.");
        Assert.IsGreaterThan(50, pixels.GetProperty("magePresent").GetInt32(), "The lighted mage must still be drawn over terrain.");
    }

    [TestMethod]
    public async Task Mobile_MageAuthoredFrames_DifferentCastPhasesProduceVisiblePixelsAndStaffLighting()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();

        var pixels = await Page.EvaluateAsync<JsonElement>(@"async () => {
            const mage = await import('./js/arena-mage.js');
            const light = await import('./js/arena-spell-lighting.js');
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 180;
            const ctx = canvas.getContext('2d');
            const player = { x: 90, y: 92, radius: 12, focusCharge: 3 };
            const sample = (progress, surge = false) => {
                const cast = { x: 90, y: 92, angle: 0, spell: 1, rank: 3, progress, surge };
                const sources = light.buildSpellLights({ castMotion: cast }, 0, true);
                const illumination = light.sampleSpellLight(sources, player.x, player.y);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                mage.drawMage(ctx, player, cast, false, true, illumination);
                return [...ctx.getImageData(0, 0, canvas.width, canvas.height).data];
            };
            const windup = sample(.12);
            const release = sample(.32);
            const followThrough = sample(.75);
            const surged = sample(.32, true);
            const difference = (a, b) => a.reduce((total, v, i) => total + (Math.abs(v - b[i]) > 16 ? 1 : 0), 0);
            const visible = image => image.filter((v, i) => i % 4 === 3 && v > 32).length;
            return { visible: visible(release), windupToRelease: difference(windup, release),
                releaseToFollowThrough: difference(release, followThrough), releaseToSurge: difference(release, surged) };
        }");

        Assert.IsGreaterThan(175, pixels.GetProperty("visible").GetInt32());
        Assert.IsGreaterThan(50, pixels.GetProperty("windupToRelease").GetInt32());
        Assert.IsGreaterThan(45, pixels.GetProperty("releaseToFollowThrough").GetInt32());
        Assert.IsGreaterThan(40, pixels.GetProperty("releaseToSurge").GetInt32());
    }

    [TestMethod]
    public async Task Mobile_FocusedMagic_MageAndRankedImpactsProduceDifferentActualPixels()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();

        var pixels = await Page.EvaluateAsync<JsonElement>(@"async () => {
            const mage = await import('./js/arena-mage.js');
            const spells = await import('./js/arena-spell-vfx.js');
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 160;
            const ctx = canvas.getContext('2d');
            const sample = draw => {
                ctx.clearRect(0, 0, 160, 160);
                draw();
                return [...ctx.getImageData(0, 0, 160, 160).data];
            };
            const difference = (a, b) => a.reduce((n, value, i) =>
                n + (Math.abs(value - b[i]) > 20 ? 1 : 0), 0);
            const visible = a => a.filter((value, i) => i % 4 === 3 && value > 32).length;
            const player = { x: 80, y: 80, radius: 12, barrier: false };
            const idle = sample(() => mage.drawMage(ctx, player, null));
            const charging = sample(() => mage.drawMage(ctx, { ...player, focusCharge: 3 }, null));
            const casting = sample(() => mage.drawMage(ctx, player,
                { spell: 1, rank: 3, progress: .36, angle: 0 }));
            const basic = sample(() => spells.drawSpellImpact(ctx,
                { x: 80, y: 80, spell: 1, rank: 1, progress: .35 }));
            const mastered = sample(() => spells.drawSpellImpact(ctx,
                { x: 80, y: 80, spell: 1, rank: 3, progress: .35 }));
            const frostfire = sample(() => spells.drawSpellImpact(ctx,
                { x: 80, y: 80, spell: 1, combination: 0, rank: 3, progress: .35 }));
            const surged = sample(() => spells.drawSpellImpact(ctx,
                { x: 80, y: 80, spell: 1, rank: 3, surge: true, progress: .35 }));
            const surgedMage = sample(() => mage.drawMage(ctx, player,
                { spell: 1, rank: 3, surge: true, progress: .36, angle: 0 }));
            return { magePixels: visible(idle), spellPixels: visible(mastered),
                castDifference: difference(idle, casting),
                rankDifference: difference(basic, mastered),
                combinationDifference: difference(mastered, frostfire),
                surgeDifference: difference(mastered, surged),
                surgedMageDifference: difference(casting, surgedMage),
                chargeDifference: difference(idle, charging) };
        }");

        Assert.IsGreaterThan(150, pixels.GetProperty("magePixels").GetInt32(), "Mage must read as a silhouette, not a tiny marker.");
        Assert.IsGreaterThan(40, pixels.GetProperty("spellPixels").GetInt32(), "Impact must be visible at mobile size.");
        Assert.IsGreaterThan(20, pixels.GetProperty("castDifference").GetInt32(), "Casting must visibly move the staff.");
        Assert.IsGreaterThan(30, pixels.GetProperty("rankDifference").GetInt32(), "Mastery must visibly increase impact size.");
        Assert.IsGreaterThan(20, pixels.GetProperty("combinationDifference").GetInt32(), "Frostfire must visibly differ from basic fire.");
        Assert.IsGreaterThan(20, pixels.GetProperty("surgeDifference").GetInt32(), "Focus Surge must produce a visibly empowered impact.");
        Assert.IsGreaterThan(20, pixels.GetProperty("surgedMageDifference").GetInt32(), "Focus Surge must visibly empower the staff motion.");
        Assert.IsGreaterThan(15, pixels.GetProperty("chargeDifference").GetInt32(), "Earned Focus Surge charge should be visible on the staff.");
    }

    [TestMethod]
    public async Task Mobile_EnemyGaitAndCloisterReflections_UseRealEnemyMotionAndSpellLocations()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        var pixels = await Page.EvaluateAsync<JsonElement>(@"async () => {
            const actors = await import('./js/arena-enemy-art.js');
            const environment = await import('./js/arena-environment.js');
            const state = actors.createEnemyMotionState();
            const original = [{ entityId:4,kind:0,x:80,y:80,radius:12 },
                { entityId:7,kind:3,x:135,y:80,radius:18 }];
            const idle = actors.updateEnemyMotions(state,original,1);
            const moved = actors.updateEnemyMotions(state,[{...original[0],x:90},original[1]],1.04);
            const ctx = document.createElement('canvas');
            ctx.width = ctx.height = 200;
            const brush = ctx.getContext('2d');
            const sample = phase => {
                brush.clearRect(0,0,200,200);
                actors.drawEnemyPixelArt(brush,original[0],null,phase);
                return [...brush.getImageData(0,0,200,200).data];
            };
            const diff = (a,b) => a.reduce((n,v,i)=>n+(Math.abs(v-b[i])>15?1:0),0);
            const changed = diff(sample(0),sample(moved.get(4)));
            const boundaries = [.33,.69].flatMap(y => [
                {x:0,y,width:.35,height:.02,open:false,kind:'ruin'},
                {x:.35,y,width:.3,height:.02,open:false,kind:'gate'},
                {x:.65,y,width:.35,height:.02,open:false,kind:'ruin'},
            ]);
            const env = {seed:78111,biome:'River valley',district:'sanctuary',
                stage:3,element:'fire',barriers:boundaries,supplies:[]};
            const world = document.createElement('canvas');
            world.width=700;world.height=1050;
            const draw=world.getContext('2d');
            environment.drawArenaEnvironment(draw,env,700,1050,0);
            const before=[...draw.getImageData(195,530,310,95).data];
            const lights=[{x:350,y:565,radius:145,strength:1,center:[255,175,95]}];
            const lines=environment.drawArenaCloisterReflections(draw,env,700,1050,lights,1,true);
            const after=[...draw.getImageData(195,530,310,95).data];
            return {firstIdle:idle.get(4),secondIdle:moved.get(7),
                moving:moved.get(4),spriteDifference:changed,reflections:lines,
                waterDifference:diff(before,after)};
        }");
        Assert.AreEqual(0,pixels.GetProperty("firstIdle").GetInt32());
        Assert.AreEqual(0,pixels.GetProperty("secondIdle").GetInt32());
        Assert.IsGreaterThan(0,pixels.GetProperty("moving").GetInt32());
        Assert.IsGreaterThan(20,pixels.GetProperty("spriteDifference").GetInt32());
        Assert.AreEqual(3,pixels.GetProperty("reflections").GetInt32());
        Assert.IsGreaterThan(10,pixels.GetProperty("waterDifference").GetInt32(),
            "At the real cloister waterline a canonical Fire cast must tint physical pixels.");
    }

    [TestMethod]
    public async Task Mobile_CloisterAndFireArt_SourceDrivenPixelsRemainDistinctAtPhoneSize()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        var result = await Page.EvaluateAsync<JsonElement>(@"async () => {
            const environment = await import('./js/arena-environment.js');
            const actors = await import('./js/arena-enemy-art.js');
            const fire = await import('./js/arena-spell-vfx.js');
            const makeCanvas = (width, height) => {
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                return canvas.getContext('2d');
            };
            const barriers = [.33, .69].flatMap(y => [
                { x:0, y, width:.35, height:.02, kind:'ruin', open:false },
                { x:.35, y, width:.3, height:.02, kind:'gate', open:false },
                { x:.65, y, width:.35, height:.02, kind:'ruin', open:false },
            ]);
            const source = { seed:78111, biome:'River valley', district:'sanctuary',
                stage:3, element:'fire', barriers, supplies:[] };
            const terrain = (district, open = false) => {
                const ctx = makeCanvas(700, 1050);
                environment.drawArenaEnvironment(ctx, {
                    ...source, district,
                    barriers:barriers.map(b => ({ ...b, open:open && b.kind==='gate' })),
                }, 700, 1050, 0);
                return ctx;
            };
            const cloister = terrain('sanctuary');
            const road = terrain('causeway');
            const opened = terrain('sanctuary', true);
            const region = (ctx, left, top, width, height) =>
                [...ctx.getImageData(left, top, width, height).data];
            const differences = (a, b) => a.reduce((n, v, i) => n + (Math.abs(v - b[i]) > 16 ? 1 : 0), 0);
            const courtyard = differences(region(cloister, 230, 450, 250, 100),
                region(road, 230, 450, 250, 100));
            const gate = differences(region(cloister, 260, 346, 180, 19),
                region(opened, 260, 346, 180, 19));
            const sample = draw => {
                const ctx = makeCanvas(150, 150);
                draw(ctx);
                return [...ctx.getImageData(0,0,150,150).data];
            };
            const skeleton = sample(ctx => actors.drawEnemyPixelArt(ctx, { x:75,y:75,radius:12,kind:0 }));
            const reaper = sample(ctx => actors.drawEnemyPixelArt(ctx, { x:75,y:75,radius:12,kind:1 }));
            const heavy = sample(ctx => actors.drawEnemyPixelArt(ctx, { x:75,y:75,radius:18,kind:3 }));
            const spell = (rank, surge = false) => sample(ctx => {
                fire.drawSpellProjectile(ctx, { x:75,y:75,angle:0,spell:1,radius:8,rank,surge });
                fire.drawSpellImpact(ctx, { x:75,y:75,spell:1,rank,progress:.24,surge });
            });
            return { courtyard, gate, skeletonReaper: differences(skeleton,reaper),
                reaperHeavy:differences(reaper,heavy),fireRanks:differences(spell(1),spell(3)),
                fireSurge:differences(spell(3),spell(3,true)) };
        }");
        Assert.IsGreaterThan(200, result.GetProperty("courtyard").GetInt32(),
            "Monastery courtyard should be distinguishable from the generic valley road.");
        Assert.IsGreaterThan(70, result.GetProperty("gate").GetInt32(),
            "The real C# gate state must change the rendered monastery crossing.");
        Assert.IsGreaterThan(70, result.GetProperty("skeletonReaper").GetInt32(),
            "Fodder and reaper must be different pixel silhouettes.");
        Assert.IsGreaterThan(70, result.GetProperty("reaperHeavy").GetInt32(),
            "Heavy enemies must have their own body silhouette.");
        Assert.IsGreaterThan(30, result.GetProperty("fireRanks").GetInt32());
        Assert.IsGreaterThan(25, result.GetProperty("fireSurge").GetInt32());
    }

    [TestMethod]
    public async Task Mobile_Territories_DifferentDistrictsProduceDifferentActualCanvasPixels()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await EnterFirstTrailAsync();
        var result = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"async () => {
            const painter = await import('./js/arena-environment.js');
            const make = district => ({ seed: 1455, biome: 'Ashen caldera', element: 'fire',
                stage: 3, district, landmark: 'ruined road', supplies: [], barriers: [] });
            const sample = district => {
                const canvas = document.createElement('canvas');
                canvas.width = 950;
                canvas.height = 1550;
                const context = canvas.getContext('2d');
                painter.drawArenaEnvironment(context, make(district), 950, 1550, 0);
                const points = [];
                for (let y = 555; y < 1020; y += 28) {
                    for (let x = 130; x < 820; x += 28) {
                        const pixel = context.getImageData(x, y, 1, 1).data;
                        points.push([pixel[0], pixel[1], pixel[2]]);
                    }
                }
                return points;
            };
            const a = sample('causeway');
            const b = sample('sanctuary');
            const c = sample('rift');
            const compare = (first, second) => first.filter((rgb, i) => rgb.some((value, j) =>
                Math.abs(value - second[i][j]) > 12)).length;
            return { sampled: a.length, causewaySanctuary: compare(a, b),
                sanctuaryRift: compare(b, c), causewayRift: compare(a, c) };
        }");
        var sampled = result.GetProperty("sampled").GetInt32();
        Assert.IsGreaterThan(200, sampled);
        foreach (var comparison in new[] { "causewaySanctuary", "sanctuaryRift", "causewayRift" })
            Assert.IsGreaterThan(sampled / 4, result.GetProperty(comparison).GetInt32(),
                "Different combat districts must look substantially different, not merely gain a few elemental marks.");
    }

    [TestMethod]
    public async Task Mobile_TerritoryStory_CanvasDrawsDistinctBiomesAndVisibleLandmarks()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await EnterFirstTrailAsync();

        var scene = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"async () => {
            const art = await import('./js/arena-territory-art.js');
            const environment = await import('./js/arena-environment.js');
            const canvas = document.createElement('canvas');
            canvas.width = 950;
            canvas.height = 1550;
            const make = biome => ({ seed: 712, biome, element: 'fire', stage: 6,
                landmark: 'ruined crossing', supplies: [], barriers: [] });
            const ash = art.createTerritoryStoryPlan(make('Ashen caldera'), 950, 1550);
            const ridge = art.createTerritoryStoryPlan(make('Broken ridge'), 950, 1550);
            const valley = art.createTerritoryStoryPlan(make('River valley'), 950, 1550);
            const painted = environment.drawArenaEnvironment(canvas.getContext('2d'), make('Ashen caldera'), 950, 1550, 1);
            const middlePixel = [...canvas.getContext('2d').getImageData(475, 775, 1, 1).data];
            return {
                painted, ash: ash.landmarks[1].kind, ridge: ridge.landmarks[1].kind,
                valley: valley.landmarks[1].kind, landmarks: ash.landmarks.length,
                opaque: middlePixel[3] === 255,
            };
        }");

        Assert.IsTrue(scene.GetProperty("painted").GetBoolean());
        Assert.AreEqual(3, scene.GetProperty("landmarks").GetInt32());
        Assert.AreEqual("forge", scene.GetProperty("ash").GetString());
        Assert.AreEqual("ossuary", scene.GetProperty("ridge").GetString());
        Assert.AreEqual("waystation", scene.GetProperty("valley").GetString());
        Assert.IsTrue(scene.GetProperty("opaque").GetBoolean(), "Ground art must actually render into the world texture.");
    }

    [TestMethod]
    public async Task Mobile_RoamingTrail_CameraFollowsHunterBeyondScreenAndPageDoesNotScroll()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await EnterFirstTrailAsync();
        await Page.EvaluateAsync(@"async () => {
            const arena = await import('./js/arena.js');
            const camera = await import('./js/arena-camera.js');
            window.__roamingState = arena.readArenaDiagnostics;
            window.__roamingCamera = camera.resolveArenaCamera;
        }");
        await Page.WaitForFunctionAsync(@"() => {
            const state = window.__roamingState?.(document.querySelector('canvas.game-canvas'));
            return Boolean(state?.world && state.player);
        }");
        var initial = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"() => {
            const state = window.__roamingState(document.querySelector('canvas.game-canvas'));
            const camera = window.__roamingCamera(state.world, state.player, 390, 844);
            window.__roamingStartX = state.player.x;
            return { worldWidth: state.world.width, worldHeight: state.world.height,
                playerX: state.player.x, cameraX: camera.x, scrollY: window.scrollY };
        }");
        Assert.IsGreaterThan(390, initial.GetProperty("worldWidth").GetDouble());
        Assert.IsGreaterThan(844, initial.GetProperty("worldHeight").GetDouble());
        Assert.IsGreaterThan(390, initial.GetProperty("playerX").GetDouble(), "The world player must not be clamped to the screen.");

        await Page.Keyboard.DownAsync("ArrowRight");
        try
        {
            await Page.WaitForFunctionAsync(@"() => {
                const state = window.__roamingState(document.querySelector('canvas.game-canvas'));
                return state?.player?.x > window.__roamingStartX + 40;
            }", null, new PageWaitForFunctionOptions { Timeout = 6000 });
        }
        finally { await Page.Keyboard.UpAsync("ArrowRight"); }
        var next = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"() => {
            const state = window.__roamingState(document.querySelector('canvas.game-canvas'));
            const camera = window.__roamingCamera(state.world, state.player, 390, 844);
            return { playerX: state.player.x, cameraX: camera.x, viewportX: state.player.x - camera.x,
                scrollY: window.scrollY, renderingFailed: state.renderingFailed };
        }");
        Assert.IsGreaterThan(initial.GetProperty("playerX").GetDouble() + 40, next.GetProperty("playerX").GetDouble());
        Assert.IsGreaterThan(initial.GetProperty("cameraX").GetDouble() + 35, next.GetProperty("cameraX").GetDouble());
        Assert.IsLessThanOrEqualTo(210, next.GetProperty("viewportX").GetDouble(), "Hunter should stay near screen center as camera follows.");
        Assert.AreEqual(initial.GetProperty("scrollY").GetDouble(), next.GetProperty("scrollY").GetDouble());
        Assert.IsFalse(next.GetProperty("renderingFailed").GetBoolean());
    }

    [TestMethod]
    public async Task Mobile_FirstTrail_SafariTouchDrag_MovesHunterWithoutDocumentScroll()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await EnterFirstTrailAsync();
        await Page.EvaluateAsync(@"async () => {
            const arena = await import('./js/arena.js');
            window.__arenaDiagnostics = arena.readArenaDiagnostics;
        }");
        await Page.WaitForFunctionAsync(@"() =>
            Boolean(window.__arenaDiagnostics(document.querySelector('canvas.game-canvas'))?.player)");

        await Page.EvaluateAsync(@"async () => {
            const canvas = document.querySelector('canvas.game-canvas');
            const arena = await import('./js/arena.js');
            const start = arena.readArenaDiagnostics(canvas);
            const rect = canvas.getBoundingClientRect();
            window.__touchMoveBaseline = { x: start.player.x, scrollY: window.scrollY };
            const origin = new Touch({ identifier: 71, target: canvas, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
            const moved = new Touch({ identifier: 71, target: canvas, clientX: origin.clientX + 65, clientY: origin.clientY });
            canvas.dispatchEvent(new TouchEvent('touchstart',
                { bubbles: true, cancelable: true, touches: [origin], changedTouches: [origin], targetTouches: [origin] }));
            // Mobile Safari can cancel pointer capture even though the original finger is still moving.
            canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 71, pointerType: 'touch' }));
            canvas.dispatchEvent(new TouchEvent('touchmove',
                { bubbles: true, cancelable: true, touches: [moved], changedTouches: [moved], targetTouches: [moved] }));
        }");
        var movement = await Page.WaitForFunctionAsync(@"() => {
            const result = window.__arenaDiagnostics(document.querySelector('canvas.game-canvas'));
            const distance = (result?.player?.x ?? 0) - window.__touchMoveBaseline.x;
            return distance > 8 ? distance : false;
        }", null, new PageWaitForFunctionOptions { Timeout = 7000 });
        var observedMovement = await movement.JsonValueAsync<double>();
        var details = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"async () => {
            const arena = await import('./js/arena.js');
            const canvas = document.querySelector('canvas.game-canvas');
            const result = arena.readArenaDiagnostics(canvas);
            const original = window.__touchMoveBaseline;
            const current = new Touch({ identifier: 71, target: canvas, clientX: 0, clientY: 0 });
            canvas.dispatchEvent(new TouchEvent('touchend',
                { bubbles: true, cancelable: true, touches: [], changedTouches: [current], targetTouches: [] }));
            return { moved: result.player.x - original.x, scrollDelta: window.scrollY - original.scrollY,
                renderFailed: result.renderingFailed, touchCleared: arena.readArenaDiagnostics(canvas).touchId === null };
        }");

        Assert.IsGreaterThan(8, observedMovement, "The hunter must actually move when an iPhone touch drags.");
        Assert.AreEqual(0, details.GetProperty("scrollDelta").GetDouble(), "Touching the arena must not scroll the browser document.");
        Assert.IsFalse(details.GetProperty("renderFailed").GetBoolean(), "Terrain rendering must not fail during gameplay.");
        Assert.IsTrue(details.GetProperty("touchCleared").GetBoolean(), "Lifting the finger must stop steering.");
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
            Assert.IsLessThanOrEqualTo(2, Math.Abs(vitals.Y - objective.Y), "Trail status must align with vitals.");
            Assert.IsGreaterThanOrEqualTo(vitals.X + vitals.Width - 2, objective.X, "Trail status must sit to the right of vitals.");
            Assert.IsLessThanOrEqualTo(100, Math.Max(vitals.Height, objective.Height), "HUD must leave room for combat.");
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

        var reviewPrompt = Page.GetByRole(AriaRole.Dialog, new() { Name = "How was that hunt?" });
        await Expect(reviewPrompt).ToBeVisibleAsync();
        await Expect(reviewPrompt.GetByText("HUNT LEFT EARLY")).ToBeVisibleAsync();
        await ScreenshotAsync("mobile-review-prompt.png");
        await Page.Keyboard.PressAsync("Escape");
        await Expect(reviewPrompt).ToBeHiddenAsync();

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
    public async Task Mobile_ReviewPrompt_DontAskAgainPersistsAndSummaryButtonStillOpensReview()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await EnterFirstTrailAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Abandon run" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Don't ask again" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "How was that hunt?" })).ToBeHiddenAsync();
        Assert.AreEqual("muted", await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.reviewPrompt.v1')"));

        await Page.Locator("button.run-playtest-feedback").ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Help shape the Wyrmrealm" })).ToBeVisibleAsync();
        await Expect(Page.Locator("#playtest-fun")).ToHaveValueAsync("");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Close playtest feedback" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Return to Wyrmforge" }).ClickAsync();

        await EnterFirstTrailAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Abandon run" }).ClickAsync();
        await Expect(Page.Locator(".run-report-card")).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "How was that hunt?" })).ToHaveCountAsync(0);
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
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
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
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
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
        await Page.GetByRole(AriaRole.Button, new() { Name = "Rate 4 of 5 — Enjoyable" }).ClickAsync();
        await Expect(Page.Locator("#playtest-fun")).ToHaveValueAsync("4");
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
        Assert.AreEqual(await Page.Locator("[data-game-version]").GetAttributeAsync("data-game-version"), root.GetProperty("gameVersion").GetString());
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
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_WorldGate_FollowsFreePlayElementAndTierSteps(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:2, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator(".town-hotspot--gate").ClickAsync();

        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "World Gate" })).ToBeVisibleAsync();
        await Expect(Page.Locator(".gate-scene-art")).ToHaveAttributeAsync("src", "art/world-gate.jpg");
        await Expect(Page.Locator(".gate-closed-side")).ToBeVisibleAsync();
        await ScreenshotAsync($"world-gate-{width}.png");

        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Expect(Page.Locator(".gate-action--locked")).ToHaveCountAsync(2);
        foreach (var mode in await Page.Locator(".gate-action--locked").AllAsync()) await Expect(mode).ToBeDisabledAsync();
        await ScreenshotAsync($"world-gate-modes-{width}.png");

        await Page.Locator(".gate-action--primary").ClickAsync();
        await Expect(Page.Locator(".gate-lineage")).ToHaveCountAsync(12);
        await Expect(Page.Locator(".gate-lineage--hidden")).ToHaveCountAsync(10);
        await Expect(Page.Locator(".gate-lineage--fire")).ToBeEnabledAsync();
        await Expect(Page.Locator(".gate-lineage--frost")).ToBeEnabledAsync();
        foreach (var teaser in await Page.Locator(".gate-lineage--hidden").AllAsync()) await Expect(teaser).ToBeDisabledAsync();
        await ScreenshotAsync($"world-gate-lineages-{width}.png");

        var horizontal = await Page.EvaluateAsync<double>("() => document.documentElement.scrollWidth - window.innerWidth");
        Assert.IsLessThanOrEqualTo(1, horizontal, "The 12-slot element grid must not overflow mobile screens.");
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Expect(Page.Locator(".gate-tier")).ToHaveCountAsync(5);
        await Expect(Page.Locator(".gate-tier--ready")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".gate-tier--locked")).ToHaveCountAsync(4);
        await ScreenshotAsync($"world-gate-fire-tiers-{width}.png");

        await Page.Locator(".gate-tier--ready").ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToHaveCountAsync(0);
        await Expect(Page.Locator("canvas").First).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_WorldGate_FrostCanBeSelectedWithoutDefeatingAshfangAndStartsInSnow()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:2, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator(".town-hotspot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Expect(Page.Locator(".gate-lineage--frost")).ToBeEnabledAsync();
        await Page.Locator(".gate-lineage--frost").ClickAsync();
        await Expect(Page.Locator(".gate-heading-sigil--frost")).ToBeVisibleAsync();
        await ScreenshotAsync("world-gate-frost-tiers.png");

        await Page.Locator(".gate-tier--ready").ClickAsync();
        var save = await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.world.v1')");
        StringAssert.Contains(save, "glacier-region");
        await Page.Locator(".primary-frost").ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.GetByText(new System.Text.RegularExpressions.Regex("Snowbound vale|Rimewall heights|Glacier basin", System.Text.RegularExpressions.RegexOptions.IgnoreCase)).First).ToBeVisibleAsync();
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
        await EnterTownIfNeededAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^Quests") }).ClickAsync();
        var dialog = Page.GetByRole(AriaRole.Dialog, new() { Name = "Hunt quests" });
        await Expect(dialog).ToBeVisibleAsync();
        await dialog.Locator(".quest-entry").Filter(new() { HasText = "First path" }).GetByRole(AriaRole.Button, new() { Name = "CLAIM", Exact = true }).ClickAsync();
        await dialog.Locator(".quest-entry").Filter(new() { HasText = "A path to the Wyrm" }).GetByRole(AriaRole.Button, new() { Name = "CLAIM", Exact = true }).ClickAsync();
        await ScreenshotAsync("mobile-quests.png");
        var overflow = await Page.EvaluateAsync<double>("() => document.documentElement.scrollWidth - innerWidth");
        Assert.IsLessThanOrEqualTo(1, overflow);
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        var save = await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.arcaneBuild.v1')");
        using var json = JsonDocument.Parse(save);
        Assert.AreEqual(2, json.RootElement.GetProperty("Budget").GetInt32());
        Assert.AreEqual(60, json.RootElement.GetProperty("HunterExperience").GetInt32());
        Assert.AreEqual(2, json.RootElement.GetProperty("Quests").GetProperty("Claimed").GetArrayLength());
        Assert.AreEqual(1, json.RootElement.GetProperty("Quests").GetProperty("Caches").GetInt32());
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        await Page.Locator(".primary-arcane").ClickAsync();
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
    public async Task Mobile_RouteMap_UnfoldsTerritoryAndKeepsRewardPanelFixed(int width, int height)
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(width, height);
        await OpenAsync();
        await Expect(Page.Locator("#wyrmforge-ignition")).ToHaveCountAsync(0, new() { Timeout = 30000 });
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        await Page.Locator(".primary-arcane").ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        var wyrm = await Page.Locator("button.route-node.dragon").BoundingBoxAsync();
        Assert.IsNotNull(wyrm);
        var territory = Page.GetByLabel("Scrollable hunt territory");
        var chart = await territory.BoundingBoxAsync();
        Assert.IsNotNull(chart);
        Assert.IsTrue(wyrm.Y + wyrm.Height < chart.Y, "The lair starts beyond the opening viewport.");
        var scrollBefore = await territory.EvaluateAsync<double>("element => element.scrollTop");
        Assert.IsGreaterThan(0d, scrollBefore);
        var headerBefore = await Page.Locator(".map-header").BoundingBoxAsync();
        var footerBefore = await Page.Locator(".node-sheet").BoundingBoxAsync();
        await territory.EvaluateAsync("element => element.scrollTop -= 140");
        Assert.AreEqual(headerBefore!.Y, (await Page.Locator(".map-header").BoundingBoxAsync())!.Y);
        Assert.AreEqual(footerBefore!.Y, (await Page.Locator(".node-sheet").BoundingBoxAsync())!.Y);
        await Page.EvaluateAsync("async () => { const map = await import('./js/hunt-map.js'); map.focusHunter(document.querySelector('.hunt-viewport')); }");
        var node = Page.Locator("button.route-node.available").First;
        await Expect(node).ToBeInViewportAsync();
        var seal = await node.Locator(".node-core").BoundingBoxAsync();
        Assert.IsNotNull(seal);
        Assert.IsGreaterThanOrEqualTo(36, seal.Width);
        var touchTarget = await node.BoundingBoxAsync();
        Assert.IsNotNull(touchTarget);
        Assert.IsGreaterThanOrEqualTo(44, touchTarget.Width);
        Assert.IsGreaterThanOrEqualTo(44, touchTarget.Height);
        await territory.EvaluateAsync("element => element.scrollTop = element.scrollHeight * .48");
        // Introductory short roads have a single encounter. Exercise a real multi-stop road
        // when checking that the preview highlights the whole route, independently of DOM order.
        var previewRoad = await Page.Locator("button.route-node[data-road]").EvaluateAllAsync<string>(@"nodes => {
            const roads = new Map();
            for (const node of nodes) roads.set(node.dataset.road, (roads.get(node.dataset.road) || 0) + 1);
            return [...roads].find(([, stops]) => stops > 1)?.[0] || '';
        }");
        Assert.IsFalse(string.IsNullOrEmpty(previewRoad), "A Hunt fork must offer a multi-stop alternative to its short road.");
        var previewStops = Page.Locator($"button.route-node[data-road='{previewRoad}']");
        var expectedPreviewCount = await previewStops.CountAsync();
        var roadStop = previewStops.First;
        await roadStop.ScrollIntoViewIfNeededAsync();
        await roadStop.ClickAsync();
        await Expect(Page.Locator(".route-link.preview").First).ToBeVisibleAsync();
        Assert.IsGreaterThan(1, await Page.Locator(".route-node.road-preview").CountAsync());
        await Expect(Page.Locator(".route-node.road-preview")).ToHaveCountAsync(expectedPreviewCount);
        await Expect(Page.Locator(".enter-trail")).ToBeDisabledAsync();
        await ScreenshotAsync($"mobile-road-preview-{width}.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Close trail details" }).ClickAsync();
        await territory.EvaluateAsync("element => element.scrollTop = element.scrollHeight * .48");
        await ScreenshotAsync($"mobile-territory-forks-{width}.png");
        var detour = Page.Locator(".node-bonus").First;
        if (await detour.CountAsync() > 0)
        {
            await detour.ScrollIntoViewIfNeededAsync();
            await Expect(detour).ToContainTextAsync("BONUS RELIC");
        }
        await Page.GetByRole(AriaRole.Button, new() { Name = "Return to hunter" }).ClickAsync();
        await Expect(node).ToBeInViewportAsync();
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

    [TestMethod]
    public async Task Mobile_VacantBuildings_ExplainUnlockRequirementsOnTap()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();

        var viewport = Page.Locator(".town-panorama-viewport");
        var notice = Page.Locator(".town-lock-notice");

        await viewport.EvaluateAsync("element => window.wyrmforgeTown.show(0, false)");
        await Page.WaitForFunctionAsync(@"() => {
            const view = document.querySelector('.town-panorama-viewport');
            return Math.abs(view.scrollLeft - (view.scrollWidth / 6 - view.clientWidth / 2)) < 4;
        }");
        await Expect(Page.Locator(".town-hotspot--forge")).ToHaveAttributeAsync("data-town-state", "vacant");
        await Page.Locator(".town-hotspot--forge").ClickAsync();
        await Expect(notice).ToContainTextAsync("Blacksmith");
        await Expect(notice).ToContainTextAsync("first secured Essence");
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();

        await Page.Locator(".town-hotspot--build").ClickAsync();
        await Expect(notice).ToContainTextAsync("Arcane Nexus");
        await Expect(notice).ToContainTextAsync("first hunt");

        await viewport.EvaluateAsync("element => window.wyrmforgeTown.show(2, false)");
        await Page.WaitForFunctionAsync(@"() => {
            const view = document.querySelector('.town-panorama-viewport');
            return Math.abs(view.scrollLeft - (view.scrollWidth * 5 / 6 - view.clientWidth / 2)) < 4;
        }");
        await Page.Locator(".town-hotspot--codex").ClickAsync();
        await Expect(notice).ToContainTextAsync("Codex");
        await Expect(notice).ToContainTextAsync("first hunt");
        await Page.Locator(".town-hotspot--legends").ClickAsync();
        await Expect(notice).ToContainTextAsync("Hall of Fame");
        await Expect(notice).ToContainTextAsync("two hunts");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Dismiss building notice" }).ClickAsync();
        await Expect(notice).ToHaveCountAsync(0);
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_PrimaryOath_CancelReturnsToTownWithoutConsumingOrUnlocking()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();

        await Expect(Page.Locator(".town-hotspot--gate")).ToBeEnabledAsync();
        await Expect(Page.Locator(".town-hotspot--build")).ToHaveAttributeAsync("data-town-state", "vacant");
        await Expect(Page.Locator(".town-dormant-art--build")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".town-dormant-art--codex")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".town-dormant-art--legends")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".town-vacancy")).ToHaveCountAsync(0);
        var dormantLayers = Page.Locator(".town-building-layer[data-building-state='vacant']");
        await Expect(dormantLayers).ToHaveCountAsync(3);
        await Expect(Page.Locator(".town-building-layer[data-building-state='active']")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".town-building-layer[data-town-building='build']")).ToHaveCountAsync(1);
        Assert.IsTrue(await dormantLayers.First.EvaluateAsync<bool>(
            "element => getComputedStyle(element).filter === 'none' && " +
            "getComputedStyle(element).backdropFilter === 'none'"));
        Assert.IsTrue(await Page.Locator(".town-dormant-art").First.EvaluateAsync<bool>(
            "element => element.complete && element.naturalWidth === 2172 && element.naturalHeight === 724 && " +
            "getComputedStyle(element).filter === 'none' && getComputedStyle(element).backdropFilter === 'none'"));
        await Expect(Page.Locator(".town-dormant-art--build")).ToHaveAttributeAsync("src", "art/town-vacant-nexus.webp?v=130");
        await Expect(Page.Locator(".town-dormant-art--codex")).ToHaveAttributeAsync("src", "art/town-vacant-codex.webp?v=130");
        await Expect(Page.Locator(".town-dormant-art--legends")).ToHaveAttributeAsync("src", "art/town-vacant-legends.webp?v=130");

        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        var oath = Page.GetByRole(AriaRole.Dialog, new() { Name = "Choose your primary magic" });
        await Expect(oath).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Cancel hunt and return to town" }).ClickAsync();
        await Expect(oath).ToBeHiddenAsync();
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
        await Expect(Page.Locator(".town-hotspot--build")).ToHaveAttributeAsync("data-town-state", "vacant");
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.firstHunt.v1')"));
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Choose your primary magic" })).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_Refuge_UnlocksOccupiedBuildingsWithClickableHotspots()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await Expect(Page.Locator(".town-dormant-art")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".town-panorama-open-forge")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".town-building-layer[data-building-state='vacant']")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".town-building-layer[data-town-building='forge'][data-building-state='active']")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".town-hotspot--build")).ToBeEnabledAsync();
        await Expect(Page.Locator(".town-hotspot--forge")).ToBeEnabledAsync();
        await Expect(Page.Locator(".town-hotspot--codex")).ToBeEnabledAsync();
        await Page.Locator(".town-hotspot--build").ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" })).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_PrimaryOath_RequiresStartingSpellBeforeShowingRouteMap()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        var oath = Page.GetByRole(AriaRole.Dialog, new() { Name = "Choose your primary magic" });
        await Expect(oath).ToBeVisibleAsync();
        await Expect(oath.Locator("button.primary-choice")).ToHaveCountAsync(4);
        await oath.Locator("button.primary-fire").ClickAsync();
        await Expect(oath).ToBeHiddenAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".combat-vitals-spells .combat-spell-badge")).ToHaveAttributeAsync("aria-label", "Fire Bolt, rank 1");
    }

    private async Task EnterFirstTrailAsync()
    {
        var back = Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" });
        if (await back.IsVisibleAsync()) await back.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Choose your primary magic" })).ToBeVisibleAsync();
        await Page.Locator(".primary-arcane").ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();

        var route = Page.Locator("button.route-node.available").First;
        await route.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();
    }

    private async Task ContinueThroughWorldGateAsync()
    {
        await Expect(Page.Locator(".world-gate")).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Page.Locator(".gate-tier--ready").ClickAsync();
    }

    private async Task EnterTownIfNeededAsync()
    {
        // Wait until Blazor has finished its first render. Checking IsVisibleAsync too
        // early can leave a test at the title scene even though the button appears later.
        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 30000 });
        await start.ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
    }

    private async Task OpenAsync()
    {
        // Existing gameplay tests represent established accounts, not the new First Hunt tutorial.
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:24, Nodes:[] })); localStorage.setItem('wyrmforge.essenceVault', JSON.stringify(['CinderHeart']));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
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
            window.__dangerLatestMovement = 0;
            arena.initializeArena(document.querySelector('canvas'), {
                invokeMethodAsync: async (method, delta, width, height, x, y) => {
                    window.__dangerLatestMovement = Math.abs(x) + Math.abs(y);
                    window.__dangerMovement = Math.max(window.__dangerMovement, window.__dangerLatestMovement);
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
        // A held mouse now deliberately aims. Exercise the actual mobile movement
        // gesture with a native left-side touch, while the critical-health cue is live.
        var touchSession = await Page.Context.NewCDPSessionAsync(Page);
        try
        {
            await touchSession.SendAsync("Emulation.setTouchEmulationEnabled", new Dictionary<string, object> { ["enabled"] = true, ["maxTouchPoints"] = 2 });
            await touchSession.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchStart", ["touchPoints"] = new[] { new { x = 90, y = 600, id = 71 } } });
            await touchSession.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchMove", ["touchPoints"] = new[] { new { x = 150, y = 600, id = 71 } } });
            await Page.WaitForFunctionAsync("() => window.__dangerMovement > .5");
            await touchSession.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchEnd", ["touchPoints"] = Array.Empty<object>() });
            await Page.WaitForFunctionAsync("() => window.__dangerLatestMovement < .01");
        }
        finally
        {
            await touchSession.DetachAsync();
        }
    }

    [TestMethod]
    public async Task Mobile_StatusBadges_ClearDuringUpgradePause()
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.SetViewportSizeAsync(320, 568);
        await OpenAsync();
        await Page.EvaluateAsync(@"async () => {
            const arena = await import(new URL('js/arena-performance.js', document.baseURI).href);
            document.body.innerHTML = '<main class=""game-screen""><canvas class=""game-canvas"" style=""position:fixed;inset:0;width:100vw;height:100vh""></canvas></main>';
            window.__statusPaused = false;
            arena.initializeArena(document.querySelector('canvas'), {
                invokeMethodAsync: async () => ({
                    player:{x:160,y:350,radius:12,barrier:false}, hud:{health:100,maxHealth:100,spells:[]},
                    enemies:[{x:160,y:200,radius:12,statuses:[{id:1,stacks:1}]}],
                    splashPulses:[],elementalImpacts:[],deathBursts:[],essenceBursts:[],essenceBolts:[],projectiles:[],lightning:[],
                    paused:window.__statusPaused,ended:false
                })
            });
            window.__statusHasInk = () => {
                const canvas = document.querySelector('canvas[aria-hidden]');
                const data = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
                return data.some((value,index) => index % 4 === 3 && value > 0);
            };
        }");
        await Page.WaitForFunctionAsync("() => window.__statusHasInk()");
        await Page.EvaluateAsync("() => window.__statusPaused = true");
        await Page.WaitForFunctionAsync("() => !window.__statusHasInk()");
        await Expect(Page.Locator("body > canvas")).ToHaveCountAsync(0);
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
