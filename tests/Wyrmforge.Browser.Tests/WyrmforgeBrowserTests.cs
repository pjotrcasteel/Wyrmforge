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
    public async Task Mobile_TownV2_NexusMaskMovesOneNpcWithoutLegacyGeometry()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townGeometry=1&townV2=1",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        var canvas = Page.Locator("[data-town-v2-canvas]");
        await Expect(canvas).ToBeVisibleAsync();
        await Expect(Page.Locator(".refuge-town-citizen")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".refuge-town-geometry-debug")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".refuge-town-png-cutout")).ToHaveCountAsync(0);
        // Mount registers the scene before its asynchronous masks and route are
        // ready. Await the qualifying snapshot, not an async polling Promise.
        var first = await Page.EvaluateAsync<JsonElement>(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            const deadline = performance.now() + 15000;
            while (performance.now() < deadline) {
                const d = module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
                if (d?.active && d.foregroundReady && d.closeWellFrontRoute && d.routeLength > 20) return d;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            throw new Error('Town V2 front route and foreground did not finish loading');
        }");
        Assert.AreEqual(1, first.GetProperty("npcCount").GetInt32());
        Assert.IsFalse(first.GetProperty("usingLegacyNavigation").GetBoolean());
        Assert.IsTrue(first.GetProperty("shrubBlocked").GetBoolean());
        Assert.IsTrue(first.GetProperty("stairTreadsWalkable").GetBoolean(),
            "The actual Nexus stone stair treads must remain walkable.");
        Assert.IsTrue(first.GetProperty("stairMasonryBlocked").GetBoolean(),
            "The iPhone screenshot showed the old mask walking into side masonry.");
        Assert.IsTrue(first.GetProperty("foliageExcludesStairs").GetBoolean(),
            "Foreground alpha must not include any stair-stone source pixels.");
        Assert.IsTrue(first.GetProperty("stairExitWalkable").GetBoolean());
        Assert.IsTrue(first.GetProperty("plazaWalkable").GetBoolean());
        Assert.IsTrue(first.GetProperty("plazaEndpointWalkable").GetBoolean());
        Assert.IsTrue(first.GetProperty("wellExcluded").GetBoolean(),
            "The first plaza slice must stop west of the central well.");
        Assert.IsTrue(first.GetProperty("westPlanterExcluded").GetBoolean());
        Assert.IsTrue(first.GetProperty("wellFrontWalkable").GetBoolean());
        Assert.IsTrue(first.GetProperty("wellFrontEndpointWalkable").GetBoolean());
        Assert.IsTrue(first.GetProperty("closeWellFrontRoute").GetBoolean(),
            "The NPC path must visibly approach the stone well base, not a distant plaza arc.");
        Assert.IsTrue(first.GetProperty("wellCenterExcluded").GetBoolean());
        Assert.IsTrue(first.GetProperty("wellRimExcluded").GetBoolean());
        Assert.IsTrue(first.GetProperty("noticeboardExcluded").GetBoolean());
        Assert.IsTrue(first.GetProperty("lowerGardenExcluded").GetBoolean());
        Assert.IsFalse(first.GetProperty("wellForegroundRequired").GetBoolean(),
            "This front-of-well slice must not repaint any well stone over an NPC.");
        Assert.IsTrue(first.GetProperty("foregroundReady").GetBoolean(),
            "The cropped V2 shrub PNG must have usable nontransparent pixels.");
        Assert.AreEqual("image/png", first.GetProperty("foregroundFormat").GetString());
        Assert.IsGreaterThan(100, first.GetProperty("foregroundPixels").GetInt32());
        Assert.IsGreaterThan(20, first.GetProperty("routeLength").GetInt32());
        await Page.WaitForTimeoutAsync(1200);
        var second = await Page.EvaluateAsync<JsonElement>(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            return module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
        }");
        Assert.IsTrue(second.GetProperty("safe").GetBoolean(), "V2 walker must remain inside the foot-safe mask.");
        Assert.AreEqual(0, second.GetProperty("violations").GetInt32());
        Assert.AreNotEqual(first.GetProperty("position").GetProperty("x").GetDouble(),
            second.GetProperty("position").GetProperty("x").GetDouble(), "The demo citizen must actually move.");
        // The walking NPC must reach actual stair treads WITHOUT a stone PNG
        // being incorrectly copied over its body as shrub foreground.
        await Page.WaitForFunctionAsync(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            const d = module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
            return d?.position.x >= 495 && d.position.x <= 550 && d.safe &&
                d.stairTreadsWalkable && d.stairMasonryBlocked && !d.stairAreaOccluded;
        }", null, new PageWaitForFunctionOptions { Timeout = 15000 });
        // Real one-NPC traversal from the approved stairs into the new plaza
        // must reach its far endpoint without crossing stonework or teleporting.
        await Page.WaitForFunctionAsync(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            const d = module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
            return d?.plazaVisits >= 1 && d.wellFrontVisits >= 1 && d.safe &&
                d.wellFrontEndpointWalkable && d.wellRimExcluded &&
                d.noticeboardExcluded && d.nearWellFrames > 20 &&
                d.nearestWellFootY <= 590 && d.violations === 0;
        }", null, new PageWaitForFunctionOptions { Timeout = 25000 });
        await Page.Locator("[data-town-v2-depth-toggle]").ClickAsync();
        await Expect(Page.Locator("[data-town-v2-depth-toggle]")).ToHaveAttributeAsync("aria-pressed","false");
        await Page.Locator("[data-town-v2-mask-toggle]").ClickAsync();
        await Expect(Page.Locator("[data-town-v2-mask-toggle]")).ToHaveAttributeAsync("aria-pressed","false");
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_TownV2_RearWellUsesTransparentDepthWithoutHidingFrontRoute()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townV2=1&townRoute=rear",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.Locator("[data-town-v2-canvas]")).ToBeVisibleAsync();
        await Expect(Page.Locator(".refuge-town-citizen")).ToHaveCountAsync(0);
        // Import once through EvaluateAsync (which awaits module loading).
        // WaitForFunction MUST be synchronous: an async callback returns a
        // truthy Promise before its false diagnostic result is resolved.
        await Page.EvaluateAsync(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            window.__readTownV2Rear = () =>
                module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
        }");
        // Return the actual diagnostic object as the JSHandle, not a false
        // promise result or a window variable from another evaluation world.
        var depthEvidenceHandle = await Page.WaitForFunctionAsync(@"() => {
            const d = window.__readTownV2Rear?.();
            if (!d?.active || !d.rearMode || !d.wellForegroundRequired ||
                !d.wellDepthReady || !d.noticeDepthReady ||
                !d.wellDepthTransparent || !d.noticeDepthTransparent ||
                !d.wellDepthEdgesClear || !d.noticeDepthEdgesClear ||
                !d.passesBehindRightPost || d.rightPostOcclusionFrames <= 0 ||
                d.rearFrames <= 3 || d.wellOcclusionFrames <= 0 ||
                d.noticeOcclusionFrames <= 0 || d.violations !== 0 || !d.safe) return false;
            return d;
        }", null, new PageWaitForFunctionOptions { Timeout = 22000 });
        var before = await depthEvidenceHandle.JsonValueAsync<JsonElement>();
        Assert.IsTrue(before.GetProperty("wellForegroundRequired").GetBoolean());
        // Foreground ready, transparent edges, and actual occlusion were already
        // observed atomically by the two live WaitForFunction predicates above.
        // Rechecking transient readiness here races Blazor scene remounts.
        Assert.AreEqual(1, before.GetProperty("npcCount").GetInt32());
        Assert.IsFalse(before.GetProperty("usingLegacyNavigation").GetBoolean());
        await Page.Locator("[data-town-v2-depth-toggle]").ClickAsync();
        await Expect(Page.Locator("[data-town-v2-depth-toggle]")).ToHaveAttributeAsync("aria-pressed", "false");
        var hidden = await Page.EvaluateAsync<JsonElement>("() => window.__readTownV2Rear()");
        await Page.WaitForTimeoutAsync(500);
        var after = await Page.EvaluateAsync<JsonElement>("() => window.__readTownV2Rear()");
        Assert.IsFalse(after.GetProperty("depthVisible").GetBoolean());
        Assert.AreEqual(hidden.GetProperty("wellOcclusionFrames").GetInt32(),
            after.GetProperty("wellOcclusionFrames").GetInt32());
        Assert.AreEqual(hidden.GetProperty("noticeOcclusionFrames").GetInt32(),
            after.GetProperty("noticeOcclusionFrames").GetInt32());
        Assert.AreEqual(0, after.GetProperty("violations").GetInt32());
        await Page.Locator("[data-town-v2-depth-toggle]").ClickAsync();
        await Expect(Page.Locator("[data-town-v2-depth-toggle]")).ToHaveAttributeAsync("aria-pressed", "true");
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_TownV2_RightPostDepthPaintsRealWoodOverTheSameStationaryNpc()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townV2=1&townRoute=rear&townPose=post",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.Locator("[data-town-v2-canvas]")).ToBeVisibleAsync();
        await Page.EvaluateAsync(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            window.__readRightPostPose = () =>
                module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
        }");
        await Page.WaitForFunctionAsync(@"() => {
            const d = window.__readRightPostPose?.();
            return d?.active && d.inspectingRightPost && d.passesBehindRightPost &&
                d.rightPostOcclusionFrames > 3 && d.safe && d.violations === 0;
        }", null, new PageWaitForFunctionOptions { Timeout = 15000 });

        // Hide only debug cyan so sampled pixels belong to the NPC/wood.
        await Page.Locator("[data-town-v2-mask-toggle]").ClickAsync();
        await Expect(Page.Locator("[data-town-v2-mask-toggle]")).ToHaveAttributeAsync("aria-pressed", "false");
        await Page.WaitForTimeoutAsync(100);
        var on = await Page.EvaluateAsync<JsonElement>(@"() => {
            const canvas = document.querySelector('[data-town-v2-canvas]');
            const ctx = canvas.getContext('2d');
            const base = document.querySelector('.refuge-town-night-base');
            const scratch = document.createElement('canvas');
            scratch.width = 1672; scratch.height = 941;
            const art = scratch.getContext('2d');
            art.drawImage(base, 0, 0);
            const pixel = (surface, x, y) => Array.from(surface.getImageData(x, y, 1, 1).data);
            return {
                position: window.__readRightPostPose().position,
                wood: pixel(ctx, 803, 436),
                expectedWood: pixel(art, 803, 436),
                outside: pixel(ctx, 812, 436)
            };
        }");

        await Page.Locator("[data-town-v2-depth-toggle]").ClickAsync();
        await Expect(Page.Locator("[data-town-v2-depth-toggle]")).ToHaveAttributeAsync("aria-pressed", "false");
        await Page.WaitForTimeoutAsync(100);
        var off = await Page.EvaluateAsync<JsonElement>(@"() => {
            const canvas = document.querySelector('[data-town-v2-canvas]');
            const ctx = canvas.getContext('2d');
            const pixel = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
            return {
                position: window.__readRightPostPose().position,
                wood: pixel(803, 436),
                outside: pixel(812, 436)
            };
        }");

        Assert.AreEqual(800, on.GetProperty("position").GetProperty("x").GetInt32());
        Assert.AreEqual(444, on.GetProperty("position").GetProperty("y").GetInt32());
        Assert.AreEqual(on.GetProperty("position").GetRawText(), off.GetProperty("position").GetRawText(),
            "Depth must never move the NPC away from the board.");
        var withWood = on.GetProperty("wood").EnumerateArray().Select(x => x.GetInt32()).ToArray();
        var artwork = on.GetProperty("expectedWood").EnumerateArray().Select(x => x.GetInt32()).ToArray();
        var noWood = off.GetProperty("wood").EnumerateArray().Select(x => x.GetInt32()).ToArray();
        CollectionAssert.AreEqual(artwork, withWood,
            "Depth ON must paint precisely the source photograph's wood, not background paving.");
        Assert.IsTrue(withWood.Where((value, i) => i < 3 && value != noWood[i]).Any(),
            "Depth OFF must expose the stationary NPC where the right timber stood.");
        CollectionAssert.AreEqual(
            on.GetProperty("outside").EnumerateArray().Select(x => x.GetInt32()).ToArray(),
            off.GetProperty("outside").EnumerateArray().Select(x => x.GetInt32()).ToArray(),
            "Toggling the timber must not paste surrounding paving over the NPC.");
    }

    [TestMethod]
    public async Task Mobile_TownV2_WellRoofDepthUsesOnlyOriginalTimberPixels()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townV2=1&townRoute=rear&townPose=well",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.Locator("[data-town-v2-canvas]")).ToBeVisibleAsync();
        await Page.EvaluateAsync(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            window.__readWellPose = () =>
                module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
        }");
        await Page.WaitForFunctionAsync(@"() => {
            const d = window.__readWellPose?.();
            return d?.active && d.inspectingWellRoof && d.wellDepthReady &&
                d.wellOcclusionFrames > 3 && d.safe && d.violations === 0;
        }", null, new PageWaitForFunctionOptions { Timeout = 15000 });

        await Page.Locator("[data-town-v2-mask-toggle]").ClickAsync();
        await Expect(Page.Locator("[data-town-v2-mask-toggle]")).ToHaveAttributeAsync("aria-pressed", "false");
        await Page.WaitForTimeoutAsync(120);
        var on = await Page.EvaluateAsync<JsonElement>(@"() => {
            const ctx = document.querySelector('[data-town-v2-canvas]').getContext('2d');
            const base = document.querySelector('.refuge-town-night-base');
            const scratch = document.createElement('canvas');
            scratch.width = 1672; scratch.height = 941;
            const art = scratch.getContext('2d');
            art.drawImage(base, 0, 0);
            const pixel = (surface, x, y) => Array.from(surface.getImageData(x, y, 1, 1).data);
            return {
                position: window.__readWellPose().position,
                roof: pixel(ctx, 852, 438),
                originalRoof: pixel(art, 852, 438),
                transparentEdge: pixel(ctx, 817, 438)
            };
        }");

        await Page.Locator("[data-town-v2-depth-toggle]").ClickAsync();
        await Expect(Page.Locator("[data-town-v2-depth-toggle]")).ToHaveAttributeAsync("aria-pressed", "false");
        await Page.WaitForTimeoutAsync(120);
        var off = await Page.EvaluateAsync<JsonElement>(@"() => {
            const ctx = document.querySelector('[data-town-v2-canvas]').getContext('2d');
            const pixel = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
            return {
                position: window.__readWellPose().position,
                roof: pixel(852, 438),
                transparentEdge: pixel(817, 438)
            };
        }");

        Assert.AreEqual(852, on.GetProperty("position").GetProperty("x").GetInt32());
        Assert.AreEqual(452, on.GetProperty("position").GetProperty("y").GetInt32());
        Assert.AreEqual(on.GetProperty("position").GetRawText(), off.GetProperty("position").GetRawText(),
            "The inspector must never relocate the NPC when depth is toggled.");

        var roofWithDepth = on.GetProperty("roof").EnumerateArray().Select(v => v.GetInt32()).ToArray();
        var originalRoof = on.GetProperty("originalRoof").EnumerateArray().Select(v => v.GetInt32()).ToArray();
        var roofWithoutDepth = off.GetProperty("roof").EnumerateArray().Select(v => v.GetInt32()).ToArray();
        CollectionAssert.AreEqual(originalRoof, roofWithDepth,
            "The roof must repaint exact original timber/tiles, not a rectangle of cobbles.");
        Assert.IsTrue(roofWithDepth.Where((value, i) => i < 3 && value != roofWithoutDepth[i]).Any(),
            "Depth OFF must uncover the same stationary NPC behind the roof.");
        CollectionAssert.AreEqual(
            on.GetProperty("transparentEdge").EnumerateArray().Select(v => v.GetInt32()).ToArray(),
            off.GetProperty("transparentEdge").EnumerateArray().Select(v => v.GetInt32()).ToArray(),
            "Roof depth must not affect the transparent paved surroundings.");
        Assert.IsTrue((await Page.EvaluateAsync<JsonElement>("() => window.__readWellPose()"))
            .GetProperty("safe").GetBoolean());
    }

    [TestMethod]
    public async Task Mobile_TownV2_ThreeResidentsWalkIndependentSafeRoutesWithRealDepth()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townV2=1&townResidents=3",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.Locator("[data-town-v2-canvas]")).ToBeVisibleAsync();
        await Page.EvaluateAsync(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            window.__readTownV2Crowd = () =>
                module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
        }");
        await Page.WaitForFunctionAsync(@"() => {
            const d = window.__readTownV2Crowd?.();
            return d?.active && d.npcCount === 3 &&
                d.crowdRearPassesRightPost && d.wellDepthReady && d.noticeDepthReady &&
                d.residents?.length === 3 && d.residents.every(p => p.safe) &&
                d.crowdFrames > 15 && d.crowdOverlapFrames === 0 && d.violations === 0;
        }", null, new PageWaitForFunctionOptions { Timeout = 20000 });
        var initial = await Page.EvaluateAsync<JsonElement>("() => window.__readTownV2Crowd()");
        Assert.IsFalse(initial.GetProperty("maskVisible").GetBoolean(),
            "The multi-NPC preview must show artwork, not paint cyan everywhere.");
        CollectionAssert.AreEquivalent(new[] { "front", "rear", "plaza" },
            initial.GetProperty("residents").EnumerateArray()
                .Select(p => p.GetProperty("route").GetString()).ToArray());

        await Page.WaitForTimeoutAsync(1800);
        // Do not count the mere presence of an SVG as proven depth: the
        // real rear walker must reach actual wooden or tiled alpha coverage.
        await Page.WaitForFunctionAsync(@"() => {
            const d = window.__readTownV2Crowd?.();
            return d?.crowdOcclusionFrames > 3 && d.violations === 0 &&
                d.residents.every(p => p.safe);
        }", null, new PageWaitForFunctionOptions { Timeout = 18000 });
        var later = await Page.EvaluateAsync<JsonElement>("() => window.__readTownV2Crowd()");
        Assert.IsGreaterThan(3, later.GetProperty("crowdOcclusionFrames").GetInt32());
        Assert.AreEqual(3, later.GetProperty("npcCount").GetInt32());
        Assert.IsTrue(later.GetProperty("residents").EnumerateArray()
            .All(p => p.GetProperty("safe").GetBoolean()), "Every actor's feet remain inside the authored mask.");
        Assert.AreEqual(0, later.GetProperty("violations").GetInt32());
        Assert.AreEqual(0, later.GetProperty("crowdOverlapFrames").GetInt32(),
            "Residents must not stand inside one another.");
        var allResidents = later.GetProperty("residents").EnumerateArray().ToArray();
        Assert.IsTrue(allResidents.All(p =>
            p.GetProperty("walkingFrames").GetInt32() > 10 &&
            p.GetProperty("distanceWalked").GetDouble() > 2 &&
            p.GetProperty("stride").GetDouble() > 0 &&
            Math.Abs(p.GetProperty("facing").GetInt32()) == 1),
            "Every resident must have distance-driven footsteps and a real facing direction.");
        Assert.IsTrue(allResidents.Skip(1).All(p =>
            p.GetProperty("idleFrames").GetInt32() > 0),
            "Secondary residents need meaningful pauses rather than synchronized perpetual walking.");
        Assert.IsTrue(allResidents.Skip(1).Any(p =>
            p.GetProperty("landmarkPauses").GetInt32() > 0),
            "At least one resident should pause naturally at a safe paved landmark.");
        var first = initial.GetProperty("residents").EnumerateArray().ToArray();
        var last = later.GetProperty("residents").EnumerateArray().ToArray();
        Assert.IsTrue(first.Zip(last).Count(pair =>
            Math.Abs(pair.First.GetProperty("position").GetProperty("x").GetDouble() -
                pair.Second.GetProperty("position").GetProperty("x").GetDouble()) > 2 ||
            Math.Abs(pair.First.GetProperty("position").GetProperty("y").GetDouble() -
                pair.Second.GetProperty("position").GetProperty("y").GetDouble()) > 2) >= 2,
            "At least two differently routed NPCs must move, not merely be copied in place.");
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_TownV2_CoverageAuditDoesNotMistakeUnknownPixelsForCompletedMapping()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townV2=1&townCoverage=1&townResidents=3",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.Locator("[data-town-v2-canvas]")).ToBeVisibleAsync();
        var legend = Page.Locator(".refuge-town-v2-coverage-legend");
        await Expect(legend).ToBeVisibleAsync();
        var legendText = await legend.InnerTextAsync();
        Assert.IsTrue(legendText.Contains("NOT walkable", StringComparison.Ordinal));
        Assert.IsTrue(legendText.Contains("Violet", StringComparison.Ordinal));
        Assert.IsTrue(legendText.Contains("NON-playable", StringComparison.Ordinal));
        await Page.EvaluateAsync(@"async () => {
            const module = await import('./js/town-v2-nexus.js?v=0.0.182');
            window.__readTownV2Coverage = () =>
                module.readTownV2Diagnostics(document.querySelector('[data-town-v2-canvas]'));
        }");
        await Page.WaitForFunctionAsync(@"() => {
            const d = window.__readTownV2Coverage?.();
            return d?.active && d.coverageAudit && d.npcCount === 3 &&
                d.coverage?.authoredGroundPixels > 0 &&
                d.coverage?.reviewedSolidPixels > 0 &&
                d.coverage?.candidateGroundPixels > 0 &&
                d.coverage?.outOfPlayPixels > 100000 &&
                d.coverage?.outOfPlayConflictPixels === 0 &&
                d.coverage?.notSeparatelyClassifiedPixels > 0 &&
                d.crowdFrames > 3 && d.violations === 0;
        }", null, new PageWaitForFunctionOptions { Timeout = 15000 });
        var audit = await Page.EvaluateAsync<JsonElement>(@"() => {
            const d = window.__readTownV2Coverage();
            const ctx = document.querySelector('[data-town-v2-canvas]').getContext('2d');
            const sample = (x,y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
            return { diagnostics:d, knownPath:sample(650,565),
                knownSolid:sample(820,550), candidate:sample(850,650),
                nonplay:sample(800,60), nonPath:sample(1300,320) };
        }");
        var diagnostics = audit.GetProperty("diagnostics");
        var coverage = diagnostics.GetProperty("coverage");
        Assert.AreEqual(1672 * 941, coverage.GetProperty("totalPixels").GetInt32());
        Assert.AreEqual(coverage.GetProperty("totalPixels").GetInt32(),
            coverage.GetProperty("authoredGroundPixels").GetInt32() +
            coverage.GetProperty("reviewedSolidPixels").GetInt32() +
            coverage.GetProperty("classConflictPixels").GetInt32() +
            coverage.GetProperty("candidateGroundPixels").GetInt32() +
            coverage.GetProperty("outOfPlayPixels").GetInt32() +
            coverage.GetProperty("notSeparatelyClassifiedPixels").GetInt32());
        Assert.IsTrue(coverage.GetProperty("knownSolidClassAvailable").GetBoolean());
        Assert.AreEqual(3, coverage.GetProperty("reviewedSolidNames").GetArrayLength());
        Assert.AreEqual(3, coverage.GetProperty("candidateGroundNames").GetArrayLength());
        Assert.AreEqual(3, coverage.GetProperty("outOfPlayNames").GetArrayLength());
        Assert.IsGreaterThan(300000, coverage.GetProperty("outOfPlayPixels").GetInt32());
        Assert.AreEqual(0, coverage.GetProperty("outOfPlayConflictPixels").GetInt32(),
            "Distant nonplay scenery must not contradict any approved or proposed ground.");
        Assert.IsGreaterThan(0, coverage.GetProperty("candidateGroundPixels").GetInt32());
        Assert.AreEqual(7, coverage.GetProperty("tileColumns").GetInt32());
        Assert.AreEqual(4, coverage.GetProperty("tileRows").GetInt32());
        Assert.AreEqual(256, coverage.GetProperty("tileSize").GetInt32());
        var tiles = coverage.GetProperty("tiles").EnumerateArray().ToArray();
        Assert.AreEqual(28, tiles.Length);
        foreach (var tile in tiles)
            Assert.AreEqual(
                tile.GetProperty("width").GetInt32() * tile.GetProperty("height").GetInt32(),
                tile.GetProperty("authoredGroundPixels").GetInt32() +
                tile.GetProperty("reviewedSolidPixels").GetInt32() +
                tile.GetProperty("classConflictPixels").GetInt32() +
                tile.GetProperty("candidateGroundPixels").GetInt32() +
                tile.GetProperty("outOfPlayPixels").GetInt32() +
                tile.GetProperty("notSeparatelyClassifiedPixels").GetInt32(),
                "Every coverage tile must account for all its image pixels.");
        Assert.AreEqual(1536, tiles[^1].GetProperty("x").GetInt32());
        Assert.AreEqual(768, tiles[^1].GetProperty("y").GetInt32());
        Assert.AreEqual(136, tiles[^1].GetProperty("width").GetInt32());
        Assert.AreEqual(173, tiles[^1].GetProperty("height").GetInt32());

        Assert.IsFalse(coverage.GetProperty("fullSceneMapped").GetBoolean());
        Assert.IsFalse(diagnostics.GetProperty("maskVisible").GetBoolean());
        var walkway = audit.GetProperty("knownPath").EnumerateArray().Select(p => p.GetInt32()).ToArray();
        var unclassified = audit.GetProperty("nonPath").EnumerateArray().Select(p => p.GetInt32()).ToArray();
        var solid = audit.GetProperty("knownSolid").EnumerateArray().Select(p => p.GetInt32()).ToArray();
        var candidate = audit.GetProperty("candidate").EnumerateArray().Select(p => p.GetInt32()).ToArray();
        var nonplay = audit.GetProperty("nonplay").EnumerateArray().Select(p => p.GetInt32()).ToArray();
        Assert.IsTrue(nonplay[2] > nonplay[0] && nonplay[0] > nonplay[1],
            "Violet is reviewed non-playable scenery, separate from physical solids and unknown ground.");
        Assert.IsTrue(candidate[2] > candidate[1] && candidate[1] > candidate[0],
            "Blue proposals are NOT yet classified as safe navigation.");
        Assert.IsTrue(solid[0] > solid[1] && solid[1] > solid[2],
            "Red means the independently reviewed well footprint, not the wooden roof foreground.");
        Assert.IsTrue(walkway[1] > walkway[0] && walkway[1] > walkway[2],
            "Teal pixels must identify only authored walking corridors.");
        Assert.IsTrue(unclassified[0] > unclassified[1] && unclassified[1] > unclassified[2],
            "Amber identifies the remaining not-separately-classified pixels, NOT reviewed solids.");
        Assert.AreEqual(0, diagnostics.GetProperty("violations").GetInt32());
    }

    [TestMethod]
    public async Task Mobile_RefugeMetrics_DebugUrlShowsLiveFPSAndSimulationCosts()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await Expect(Page.Locator("#refuge-town-performance")).ToHaveCountAsync(0);

        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townMetrics=1",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();

        var overlay = Page.Locator("#refuge-town-performance");
        await Expect(overlay).ToBeVisibleAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const text = document.querySelector('#refuge-town-performance')?.textContent ?? '';
            return /FPS \d+/.test(text) && text.includes('frame p95') &&
                text.includes('AI ') && text.includes('Paths ');
        }");
        Assert.IsTrue(await overlay.EvaluateAsync<bool>(
            "node => getComputedStyle(node).pointerEvents === 'none'"));
        await Expect(Page.Locator(".refuge-town-geometry-debug")).ToHaveCountAsync(0);
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_RefugeMetrics_FourteenNpcStressOverrideShowsActualPopulation()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townMetrics=1&townNpcCount=14",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.WaitForFunctionAsync(@"() =>
            /NPC \d+\/14/.test(document.querySelector('#refuge-town-performance')?.textContent ?? '')");
        Assert.IsTrue(await Page.Locator(".refuge-town-citizen").CountAsync() <= 14);
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task ArcaneWeb_MajorMutationAmplifier_SavesCompatibleEquippedMutation()
    {
        await Page.SetViewportSizeAsync(390, 844);
        // This script also executes after ReloadAsync; never reset the state we are asserting survives it.
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            if (!localStorage.getItem('wyrmforge.arcaneBuild.v1')) {
                localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({Budget:24,
                    Nodes:['fire-start','fire-1','fire-ember-drift','fire-scorching-winds',
                        'fire-cinder-halo','fire-conflagration','fire-ashfront','fire-spread-crown']}));
            }
            if (!localStorage.getItem('wyrmforge.fireballCore.v1')) {
                localStorage.setItem('wyrmforge.fireballCore.v1',
                    JSON.stringify({Level:1,Discovered:[2],Slots:[2,null,null,null,null]}));
            }");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();

        await Page.Locator(".web-node[data-node-id='fire-spread-crown']").EvaluateAsync("el => el.click()");
        var slot = Page.Locator(".web-amplifier-socket select");
        await Expect(slot).ToBeEnabledAsync();
        await slot.SelectOptionAsync("Detonation");
        var saved = await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.arcaneBuild.v1') ?? ''");
        StringAssert.Contains(saved, "fire-spread-crown");
        StringAssert.Contains(saved, "Detonation");

        await Page.ReloadAsync(new PageReloadOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        await Page.Locator(".web-node[data-node-id='fire-spread-crown']").EvaluateAsync("el => el.click()");
        await Expect(Page.Locator(".web-amplifier-socket select")).ToHaveValueAsync("Detonation");
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_ArenaLab_GroundFoundationHasNoLegacyAssetsOrCollision(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/arena-lab?seed=1441&stage=5&habitat=WetForest",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arena Ground Foundation" }))
            .ToBeVisibleAsync();
        var canvas = Page.Locator(".arena-stage canvas");
        await Expect(canvas).ToBeVisibleAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-ready", "true",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 45000 });
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-assets", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-roads", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-collision", "0");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-mode", "natural");
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Hit prop" })).ToHaveCountAsync(0);
        await Expect(Page.GetByRole(AriaRole.Checkbox, new() { Name = "Pathing mobs" })).ToHaveCountAsync(0);
        await Expect(Page.Locator(".arena-stage .legacy-tree")).ToHaveCountAsync(0);

        var diagnostics = await Page.EvaluateAsync<System.Text.Json.JsonElement>(@"async () => {
            const m = await import('./js/arena-ground-foundation.js?v=20261022-ground-reset-1');
            return m.readGroundFoundationDiagnostics(document.querySelector('.arena-stage canvas'));
        }");
        Assert.AreEqual(0, diagnostics.GetProperty("assets").GetInt32());
        Assert.AreEqual(0, diagnostics.GetProperty("mobs").GetInt32());
        Assert.AreEqual(0, diagnostics.GetProperty("obstacles").GetInt32());
        Assert.AreEqual(0, diagnostics.GetProperty("roads").GetInt32());
        Assert.AreEqual(960, diagnostics.GetProperty("worldWidth").GetInt32());

        await Page.GetByRole(AriaRole.Button, new() { Name = "All grass" }).ClickAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-mode", "grass");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Natural ground" }).ClickAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-mode", "natural");
        Directory.CreateDirectory(ArtifactDirectory);
        await canvas.ScreenshotAsync(new LocatorScreenshotOptions
        {
            Path = Path.Combine(ArtifactDirectory, $"arena-foundation-ground-only-{width}.png"),
        });
        await Page.GetByRole(AriaRole.Button, new() { Name = "Different ground ↻" }).ClickAsync();
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-seed", "1442");
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.arenaLabProgress')"));
    }

    [TestMethod]
    public async Task Mobile_ArenaLab_MalformedDeepLink_StillRendersGroundOnly()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') +
            "/arena-lab?seed=1441%26stage%3D5%26habitat%3DWetForest",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arena Ground Foundation" }))
            .ToBeVisibleAsync();
        var canvas = Page.Locator(".arena-stage canvas");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-seed", "1204");
        await Expect(canvas).ToHaveAttributeAsync("data-foundation-ready", "true",
            new LocatorAssertionsToHaveAttributeOptions { Timeout = 45000 });
        await Expect(Page.Locator("#wyrmforge-ignition")).ToHaveCountAsync(0);
    }

    [TestMethod]
    public async Task Refuge_NightOnly_IgnoresPriorDayPreferenceAndPreservesBuildingStates()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.townLighting.v1', 'day');");
        await OpenAsync();
        var scene = Page.Locator(".refuge-canonical-scene");
        await Expect(scene).ToBeVisibleAsync();
        var night = scene.Locator(".refuge-town-night-base");
        await Page.WaitForFunctionAsync(@"async () => {
            const image = document.querySelector('.refuge-town-night-base');
            if (!image || !image.src.includes('/night-active.webp')) return false;
            await image.decode();
            return image.naturalWidth === 1672 && image.naturalHeight === 941;
        }");
        var states = await Page.Locator(".refuge-town-spot[data-town-building]").EvaluateAllAsync<string>(
            "buttons => [...buttons].map(button => button.dataset.townState).join(',')");
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Group, new() { Name = "Town lighting preference" })).ToHaveCountAsync(0);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await Expect(night).ToHaveAttributeAsync("src", new System.Text.RegularExpressions.Regex("night-active[.]webp"));
        Assert.AreEqual(states, await Page.Locator(".refuge-town-spot[data-town-building]").EvaluateAllAsync<string>(
            "buttons => [...buttons].map(button => button.dataset.townState).join(',')"));
    }

    [TestMethod]
    public async Task Mobile_RefugeGeometryDebug_ShowsTrueBuildingCollidersOnlyOnOptIn()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await Expect(Page.Locator(".refuge-town-geometry-debug")).ToHaveCountAsync(0);
        var before = await Page.Locator(".refuge-town-spot[data-town-building]").EvaluateAllAsync<string>(
            "buttons => [...buttons].map(button => button.dataset.townState).join(',')");

        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/?townGeometry=1",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();

        var debug = Page.Locator(".refuge-town-geometry-debug");
        await Expect(debug).ToBeVisibleAsync();
        var layers = Page.Locator(".refuge-town-scenery-foreground");
        await Expect(layers).ToHaveCountAsync(14);
        var hallFoliage = Page.Locator(".refuge-town-scenery-foreground[data-town-foreground-layer='hall-terrace-foliage-foreground']");
        await Expect(hallFoliage).ToHaveCountAsync(1);
        await Page.WaitForFunctionAsync(@"() => {
            const cutouts = [...document.querySelectorAll('.refuge-town-png-cutout')];
            return cutouts.length === 8 && cutouts.every(img =>
                img.dataset.townPngReady === 'true' &&
                img.src.startsWith('data:image/png;base64,') &&
                img.naturalWidth > 0 && img.naturalHeight > 0);
        }");
        foreach (var id in new[] { "noticeboard-panel", "noticeboard-supports", "well-roof",
            "well-supports", "well-front-rim", "nexus-terrace-parapet",
            "nexus-terrace-bushes", "nexus-stairs-shrubs" })
        {
            var png = Page.Locator($".refuge-town-png-cutout[data-town-cutout='{id}']");
            await Expect(png).ToBeVisibleAsync();
            Assert.IsTrue(await png.EvaluateAsync<bool>(@"img => {
                if (getComputedStyle(img).pointerEvents !== 'none' ||
                    img.naturalWidth > 300 || img.naturalHeight > 100) return false;
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const context = canvas.getContext('2d');
                if (!context) return false;
                context.drawImage(img, 0, 0);
                const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                let transparent = 0, painted = 0;
                for (let i = 3; i < pixels.length; i += 4) {
                    if (pixels[i] < 16) transparent++;
                    if (pixels[i] > 239) painted++;
                }
                const total = canvas.width * canvas.height;
                return transparent > total * 0.05 && painted > total * 0.02;
            }"), $"Foreground {id} must contain both actual opaque artwork and transparent surroundings.");
        }

        // The terrace mask must leave the painted paving itself transparent.
        // A broad replacement image that hides NPCs on paved stone fails this check.
        var terrace = Page.Locator("[data-town-cutout='nexus-terrace-parapet']");
        Assert.IsTrue(await terrace.EvaluateAsync<bool>(@"img => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            if (!ctx) return false;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, c.width, c.height).data;
            let filled = 0;
            for (let i = 3; i < data.length; i += 4)
                if (data[i] > 239) filled++;
            const sample = (x, y) => data[((y * c.width + x) * 4) + 3];
            return filled / (c.width * c.height) < 0.45 &&
                sample(126, 8) < 16 && sample(126, 65) < 16;
        }"), "The terrace cutout must not repaint a large area of pavement.");

        // A real in-browser click must choose a moving NPC. Do not just assert
        // that the click handler's source text or an inert debug button exists.
        await Page.Locator("[data-town-layer-select='Route']").ClickAsync();
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelectorAll('.refuge-town-citizen[data-town-citizen-state=walking]').length > 0");
        var selected = await Page.EvaluateAsync<bool>(@"() => {
            const scene = document.querySelector('.refuge-canonical-scene');
            const walking = [...scene.querySelectorAll(
                '.refuge-town-citizen[data-town-citizen-state=walking]')];
            const person = walking[0];
            if (!person) return false;
            const rect = person.getBoundingClientRect();
            scene.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true,
                clientX: rect.left + rect.width / 2, clientY: rect.bottom
            }));
            return (document.querySelector('[data-town-geometry-selection]')?.textContent ?? '')
                .includes('ROUTE · NPC ' + person.dataset.townCitizenId);
        }");
        Assert.IsTrue(selected, "Clicking a real moving NPC must update the route selection.");
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelector('[data-town-route]') !== null");
        await Page.Locator("[data-town-layer-select='Walkable']").ClickAsync();
        await Expect(Page.Locator("[data-town-route]")).ToHaveCountAsync(0);
        await Page.Locator("[data-town-layer-select='All']").ClickAsync();
        await Expect(Page.Locator(".refuge-town-crowd")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".refuge-town-crowd--behind, .refuge-town-crowd--front")).ToHaveCountAsync(0);
        await Page.WaitForFunctionAsync(@"() =>
            document.querySelectorAll('.refuge-town-geometry-solid').length >= 14");
        foreach (var id in new[] { "arcane-nexus-building", "blacksmith-building", "codex-building",
            "hall-of-fame-building", "world-gate-west-tower", "world-gate-east-tower" })
        {
            await Expect(debug.Locator($".refuge-town-geometry-solid[data-town-obstacle='{id}']")).ToHaveCountAsync(1);
        }
        Assert.IsTrue(await debug.EvaluateAsync<bool>(
            "element => getComputedStyle(element).pointerEvents === 'none'"));
        Assert.IsTrue(await debug.Locator(".refuge-town-geometry-solid").First.EvaluateAsync<bool>(
            "element => getComputedStyle(element).fill.includes('235, 36, 40')"), "Solid geometry should be red.");
        // Nexus paved forecourt is a distinct walkable region, without widening the solid buildings.
        var mappedWalkableCount = await Page.EvaluateAsync<int>(@"async () => {
            const result = await fetch('art/town/night-navigation.json');
            if (!result.ok) throw new Error('Town navigation JSON not available.');
            return (await result.json()).walkable.length;
        }");
        Assert.IsTrue(mappedWalkableCount >= 15, "Screenshot-corrected streets and terraces must be mapped.");
        await Expect(debug.Locator(".refuge-town-geometry-walkable")).ToHaveCountAsync(mappedWalkableCount);
        await Expect(debug.Locator(".refuge-town-geometry-visual[data-town-foreground='world-gate-arch-roof']"))
            .ToHaveCountAsync(1);
        await Expect(debug.Locator(".refuge-town-geometry-label")).ToHaveCountAsync(0);
        await Expect(debug.Locator(".refuge-town-geometry-legend")).ToHaveCountAsync(0);
        Assert.IsTrue(await Page.EvaluateAsync<bool>(@"() => {
            const feet = document.querySelectorAll('.refuge-town-geometry-feet').length;
            const citizens = document.querySelectorAll('.refuge-town-citizen').length;
            return feet === citizens && citizens > 0 && citizens <= 11;
        }"), "Only currently present citizens should have debug contact discs.");
        await Expect(Page.Locator(".refuge-town-citizen[style*='visibility:hidden']")).ToHaveCountAsync(0);

        Assert.AreEqual(before, await Page.Locator(".refuge-town-spot[data-town-building]").EvaluateAllAsync<string>(
            "buttons => [...buttons].map(button => button.dataset.townState).join(',')"));

        await ScreenshotAsync("refuge-town-geometry-debug-mobile.png");
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToBeVisibleAsync();
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_BuildingLab_CanAuthorAndLockIndependentStages_WithoutChangingGame(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(BaseUrl.TrimEnd('/') + "/sprite-lab/buildings/",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Building Lab v0.2" })).ToBeVisibleAsync();
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

        // The user edits actual roof variants beside the preview on mobile;
        // the first release hid Base/Reference in a distant inspector panel.
        await Expect(Page.Locator("#quickSlot")).ToHaveValueAsync("roof");
        await Expect(Page.Locator("#quickChoices button[data-variant='roof:damaged']")).ToBeVisibleAsync();
        await Expect(Page.Locator("#quickChoices button[data-variant='base']")).ToBeVisibleAsync();
        await Expect(Page.Locator("#slotZoom")).ToBeVisibleAsync();
        var initialRoof = await Page.Locator("#buildingCanvas").EvaluateAsync<string>("canvas => canvas.toDataURL('image/png')");
        var initialDetail = await Page.Locator("#slotZoom").EvaluateAsync<string>("canvas => canvas.toDataURL('image/png')");
        await Page.Locator("#quickChoices button[data-variant='base']").ClickAsync();
        await Expect(Page.Locator("#quickChoices button[data-variant='base']")).ToHaveAttributeAsync("aria-pressed", "true");
        var intactRoof = await Page.Locator("#buildingCanvas").EvaluateAsync<string>("canvas => canvas.toDataURL('image/png')");
        Assert.AreNotEqual(initialRoof, intactRoof, "Switching roof to Intact must actually change visible pixels.");
        var intactDetail = await Page.Locator("#slotZoom").EvaluateAsync<string>("canvas => canvas.toDataURL('image/png')");
        Assert.AreNotEqual(initialDetail, intactDetail, "The enlarged roof preview must also show the chosen variant.");

        await Page.Locator("#quickChoices button[data-variant='roof:damaged']").ClickAsync();
        await Expect(Page.Locator("#quickChoices button[data-variant='roof:damaged']"))
            .ToHaveAttributeAsync("aria-pressed", "true");
        var damagedRoofAgain = await Page.Locator("#buildingCanvas").EvaluateAsync<string>("canvas => canvas.toDataURL('image/png')");
        Assert.AreEqual(initialRoof, damagedRoofAgain, "Reapplying damaged roof must restore the same native pixels.");
        if (width == 390)
        {
            Directory.CreateDirectory(ArtifactDirectory);
            await ScreenshotAsync("building-lab-roof-choices-390.png");
        }

        // Switching a stage must show the immutable original base artwork,
        // not a darker rectangular piece of a different panorama.
        await Page.Locator("#quickStages button[data-stage='active']").ClickAsync();
        await Expect(Page.Locator("#quickChoices button[data-variant='base']"))
            .ToHaveAttributeAsync("aria-pressed", "true");
        await Page.Locator("#quickStages button[data-stage='vacant']").ClickAsync();
        await Page.Locator("#quickLock").ClickAsync();
        await Expect(Page.Locator("#quickChoices button[data-variant='roof:damaged']")).ToBeDisabledAsync();

        await Page.Locator("#quickStages button[data-stage='active']").ClickAsync();
        await Expect(Page.Locator("#quickChoices button[data-variant='base']")).ToBeEnabledAsync();
        await Expect(Page.Locator("#slotVariant")).ToHaveValueAsync("base");
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
        await Expect(Page.Locator(".character-creation")).ToBeVisibleAsync();
        await ScreenshotAsync($"character-creation-{width}x{height}.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_Refuge_HasThreeScrollableSlicesAndClickableBuildings(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await OpenAsync();
        await Expect(Page.Locator("section.town-square")).ToBeVisibleAsync();
        await Expect(Page.Locator(".refuge-canonical-scene")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".refuge-town-spot")).ToHaveCountAsync(5);
        await Expect(Page.Locator(".refuge-canonical-districts")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".refuge-town-night-base")).ToHaveCountAsync(1);
        await Page.WaitForFunctionAsync(@"() => {
            const img = document.querySelector('.refuge-town-night-base');
            return img?.complete && img.naturalWidth === 1672 && img.naturalHeight === 941;
        }");
        // A truncated WebP still reports a natural size before the decoder fails;
        // require decoded pixels instead of accepting a blank nighttime town.
        await Page.EvaluateAsync(@"async () => {
            const img = document.querySelector('.refuge-town-night-base');
            await img.decode();
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 16, 16);
            const pixels = ctx.getImageData(0, 0, 16, 16).data;
            const min = [255, 255, 255];
            const max = [0, 0, 0];
            for (let i = 0; i < pixels.length; i += 4) {
                for (let channel = 0; channel < 3; channel++) {
                    min[channel] = Math.min(min[channel], pixels[i + channel]);
                    max[channel] = Math.max(max[channel], pixels[i + channel]);
                }
            }
            if (max.every((value, i) => value - min[i] < 18))
                throw new Error('Night town panorama decoded without meaningful image detail');
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }");
        var viewport = Page.Locator(".refuge-canonical-viewport");
        Assert.IsTrue(await viewport.EvaluateAsync<bool>(
            "element => element.scrollWidth >= element.clientWidth * 3"),
            "The single night town scene must span three portrait views.");

        await Page.WaitForFunctionAsync(@"() => {
            const view = document.querySelector('.refuge-canonical-viewport');
            const scene = document.querySelector('.refuge-canonical-scene');
            return Math.abs(view.scrollLeft - (scene.clientWidth / 2 - view.clientWidth / 2)) < 4;
        }");
        await Expect(Page.Locator("#wyrmforge-ignition")).ToBeHiddenAsync();
        await ScreenshotAsync($"refuge-town-center-{width}.png");

        await viewport.EvaluateAsync("element => window.wyrmforgeTown.show(0, false)");
        await Page.WaitForFunctionAsync(@"() => {
            const view = document.querySelector('.refuge-canonical-viewport');
            const scene = document.querySelector('.refuge-canonical-scene');
            return Math.abs(view.scrollLeft - (scene.clientWidth / 6 - view.clientWidth / 2)) < 4;
        }");
        await ScreenshotAsync($"refuge-town-left-{width}.png");

        await viewport.EvaluateAsync("element => window.wyrmforgeTown.show(2, false)");
        await Page.WaitForFunctionAsync(@"() => {
            const view = document.querySelector('.refuge-canonical-viewport');
            const scene = document.querySelector('.refuge-canonical-scene');
            return Math.abs(view.scrollLeft - (scene.clientWidth * 5 / 6 - view.clientWidth / 2)) < 4;
        }");
        await ScreenshotAsync($"refuge-town-right-{width}.png");
        Assert.IsTrue(await viewport.EvaluateAsync<bool>(@"element => {
            const rect = element.getBoundingClientRect();
            return Math.abs(rect.width - innerWidth) <= 2 && Math.abs(rect.height - innerHeight) <= 2;
        }"));
    }
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_Nexus_SharedMaterialsKeepResearchAndWebReadable(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','3'); localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:24,Nodes:[]}));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await ScreenshotAsync($"nexus-town-reference-{width}.png");
        await OpenTownBuildingAsync("Arcane Nexus");
        await Expect(Page.Locator("main.menu-nexus .fireball-ritual")).ToBeVisibleAsync();
        await ScreenshotAsync($"nexus-fireball-reference-{width}.png");

        await Page.GetByRole(AriaRole.Tab, new() { Name = "Research" }).ClickAsync();
        await Expect(Page.Locator(".spellcraft-stage")).ToBeVisibleAsync();
        Assert.AreEqual(0, await Page.Locator(".fireball-hero-art").CountAsync());
        Assert.IsTrue(await Page.EvaluateAsync<bool>(@"() => {
            const reading = document.querySelector('.spellcraft-reading').getBoundingClientRect();
            const dock = document.querySelector('.spellcraft-dock');
            return getComputedStyle(dock).position === 'static' && dock.getBoundingClientRect().top >= reading.bottom - 1
                && [...document.querySelectorAll('.element-token i')].every(icon =>
                    getComputedStyle(icon, '::after').backgroundImage.includes('divine-lineage-sigils.webp'))
                && document.documentElement.scrollWidth <= window.innerWidth + 1;
        }"), "The shared pixel emblems must load without a sticky tray hiding research or causing horizontal overflow.");
        await Page.WaitForFunctionAsync(@"async () => {
            const circle = await import(new URL('js/spellcraft-circle.js', document.baseURI).href);
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 64;
            const ctx = canvas.getContext('2d');
            circle.drawEmblem(ctx, 'fire', 32, 32, 48);
            return ctx.getImageData(0, 0, 64, 64).data.some((value, index) => index % 4 === 3 && value > 0);
        }");
        await ScreenshotAsync($"nexus-research-shared-style-{width}.png");
        await Page.Locator(".spellcraft-dock").ScrollIntoViewIfNeededAsync();
        await ScreenshotAsync($"nexus-research-actions-{width}.png");

        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        await Expect(Page.Locator(".atlas-stage")).ToBeVisibleAsync();
        Assert.IsTrue(await Page.Locator(".atlas-stage").EvaluateAsync<bool>(@"stage => {
            const frame = getComputedStyle(stage);
            return frame.borderTopWidth === '3px' && frame.borderTopLeftRadius === '0px'
                && !document.querySelector('.nexus-equipped, .school-wheel-navigation')
                && [...document.querySelectorAll('.atlas-action')].every(button => {
                    const box = button.getBoundingClientRect();
                    return box.width >= 44 && box.height >= 44;
                });
        }"), "Web frame and controls must use the same material treatment with real 44px tap targets.");
        await ScreenshotAsync($"nexus-web-shared-style-{width}.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
        await Expect(Page.Locator("main.menu-nexus")).ToHaveCountAsync(0);
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_ArcaneWeb_TouchPanUsesReadableSpacedMapWithoutCraftPanels(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("window.ontouchstart = null; localStorage.setItem('wyrmforge.firstHunt.v1','3'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:24, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        // Each facet advertises its actual purpose without changing accessible tab names.
        await Expect(Page.GetByRole(AriaRole.Tab, new() { Name = "Fireball" }).Locator("small")).ToHaveTextAsync("Upgrade core");
        await Expect(Page.GetByRole(AriaRole.Tab, new() { Name = "Research" }).Locator("small")).ToHaveTextAsync("Discover");
        await Expect(Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).Locator("small")).ToHaveTextAsync("Specialize");
        Assert.IsTrue(await Page.Locator(".nexus-facets").EvaluateAsync<bool>(@"tabs => {
            const area = tabs.getBoundingClientRect();
            return area.width <= window.innerWidth + 2
                && [...tabs.querySelectorAll('button')].every(button => {
                    const rect = button.getBoundingClientRect();
                    return rect.height >= 44 && rect.left >= area.left - 1 && rect.right <= area.right + 1;
                });
        }"), "Nexus purposes must remain readable, tappable, and contained at 320px and 390px.");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();

        await Expect(Page.Locator(".school-wheel-navigation, .nexus-equipped, .nexus-rack-details, .build-heading, .atlas-toolbar")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".atlas-stage > .web-points-hud")).ToBeVisibleAsync();
        await Expect(Page.Locator(".atlas-stage > .web-floating-controls .atlas-action")).ToHaveCountAsync(4);
        Assert.IsTrue(await Page.Locator(".web-points-hud").EvaluateAsync<bool>(@"chip => {
            const stage = chip.closest('.atlas-stage').getBoundingClientRect();
            const rect = chip.getBoundingClientRect();
            return rect.left >= stage.left && rect.right <= stage.right
                && rect.top >= stage.top && rect.bottom <= stage.bottom;
        }"), "Arcane point counter must float inside the Web without displacing the canvas.");
        var viewport = Page.GetByRole(AriaRole.Region, new() { Name = "Arcane specialization map" });
        await viewport.ScrollIntoViewIfNeededAsync();
        await Expect(viewport).ToHaveAttributeAsync("data-scale", "0.95");
        Assert.IsGreaterThan(12, await Page.Locator(".web-node[data-tier='minor']").CountAsync());
        Assert.IsGreaterThan(4, await Page.Locator(".web-node[data-tier='medium']").CountAsync());
        Assert.IsGreaterThan(4, await Page.Locator(".web-node[data-tier='major']").CountAsync());
        await Expect(Page.Locator(".web-node[data-node-id='fire-spread-crown'][data-tier='major']")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".web-node[data-node-id='fire-conflagration'][data-tier='medium']")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".web-node[data-node-id='fire-ember-drift'][data-tier='minor']")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".web-region-label")).ToHaveCountAsync(2);
        var minimumSeparation = await Page.EvaluateAsync<double>(@"() => {
            const nodes = [...document.querySelectorAll('.web-node')].map(n => ({ x:parseFloat(n.style.left), y:parseFloat(n.style.top) }));
            return Math.min(...nodes.flatMap((a,i) => nodes.slice(i+1).map(b => Math.hypot(a.x-b.x,a.y-b.y))));
        }");
        Assert.IsGreaterThanOrEqualTo(90, minimumSeparation, "Node centers must have meaningful world-space separation.");
        await AssertArcanePathsClearAsync();
        await ScreenshotAsync($"specialize-readable-{width}.png");
        var node = Page.Locator(".web-node[data-node-id='fire-1']");
        var box = await node.BoundingBoxAsync();
        Assert.IsNotNull(box);
        var x = box.X + box.Width / 2;
        var y = box.Y + box.Height / 2;
        var before = await Page.Locator(".arcane-web-canvas").GetAttributeAsync("style");
        var pageY = await Page.EvaluateAsync<double>("window.scrollY");
        await Page.Mouse.MoveAsync(x, y);
        await Page.Mouse.WheelAsync(60, 80);
        await Expect(Page.Locator(".arcane-web-canvas")).Not.ToHaveAttributeAsync("style", before!);
        await Expect(viewport).ToHaveAttributeAsync("data-scale", "0.95");
        Assert.AreEqual(pageY, await Page.EvaluateAsync<double>("window.scrollY"), 1);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Center current school" }).ClickAsync();
        var cdp = await Page.Context.NewCDPSessionAsync(Page);
        await cdp.SendAsync("Emulation.setTouchEmulationEnabled", new Dictionary<string, object> { ["enabled"] = true });
        // Trusted browser touch input begins ON a node, not an empty test div.
        await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchStart", ["touchPoints"] = new[] { new { x, y, id = 1 } } });
        for (var step = 1; step <= 6; step++)
        {
            await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchMove", ["touchPoints"] = new[] { new { x = x + step * 12, y = y - step * 12, id = 1 } } });
            await Page.WaitForTimeoutAsync(20);
        }
        await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchEnd", ["touchPoints"] = Array.Empty<object>() });
        await Expect(Page.Locator(".arcane-web-canvas")).Not.ToHaveAttributeAsync("style", before!);
        await Expect(Page.Locator(".node-inspector.open")).ToHaveCountAsync(0);
        Assert.AreEqual(pageY, await Page.EvaluateAsync<double>("window.scrollY"), 1, "A Web drag must not scroll the document.");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Center current school" }).ClickAsync();
        await viewport.ScrollIntoViewIfNeededAsync();
        await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchStart", ["touchPoints"] = new[] { new { x = x - 35, y, id = 11 }, new { x = x + 35, y, id = 12 } } });
        await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchMove", ["touchPoints"] = new[] { new { x = x - 65, y, id = 11 }, new { x = x + 65, y, id = 12 } } });
        await cdp.SendAsync("Input.dispatchTouchEvent", new Dictionary<string, object> { ["type"] = "touchEnd", ["touchPoints"] = Array.Empty<object>() });
        Assert.IsGreaterThan(0.95, double.Parse((await viewport.GetAttributeAsync("data-scale"))!, System.Globalization.CultureInfo.InvariantCulture));
        await Expect(Page.Locator(".node-inspector.open")).ToHaveCountAsync(0);
        Assert.AreEqual(pageY, await Page.EvaluateAsync<double>("window.scrollY"), 1);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Center current school" }).ClickAsync();
        await node.ClickAsync();
        var inspector = Page.Locator(".node-inspector.open");
        await Expect(inspector).ToBeVisibleAsync();
        await Expect(inspector.Locator(".nexus-bench")).ToHaveCountAsync(0);

        var webNotOccluded = await Page.EvaluateAsync<bool>(@"() => {
            const web = document.querySelector('.atlas-stage').getBoundingClientRect();
            const details = document.querySelector('.node-inspector.open').getBoundingClientRect();
            return details.top >= web.bottom - 1;
        }");
        Assert.IsTrue(webNotOccluded, "The node inspector must sit beneath the Web, not over the skill nodes.");
        await ScreenshotAsync($"specialize-inspector-{width}.png");
    }

    [TestMethod]
    [DataRow("Cryomancer", "Frost Shard", "px-frost")]
    [DataRow("Stormcaller", "Chain Lightning", "px-storm")]
    [DataRow("Arcanist", "Arcane Orb", "px-rune")]
    public async Task Mobile_SavedSchool_OpensItsOwnSignatureWithoutUsingFireball(string school, string signature, string icon)
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync($"localStorage.setItem('wyrmforge.firstHunt.v1','3'); localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({{Budget:8,Nodes:[]}})); localStorage.setItem('wyrmforge.essenceVault',JSON.stringify(['CinderHeart'])); localStorage.setItem('wyrmforge.characterSchool.v1','{school}');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");

        var signatureTab = Page.GetByRole(AriaRole.Tab, new() { Name = signature });
        await Expect(signatureTab).ToBeEnabledAsync();
        await Expect(signatureTab.Locator("small")).ToHaveTextAsync("Signature spell");
        await signatureTab.ClickAsync();
        await Expect(Page.Locator(".signature-foundation h2")).ToHaveTextAsync(signature);
        await Expect(Page.Locator($".signature-emblem .{icon}")).ToBeVisibleAsync();
        await Expect(Page.Locator(".signature-unavailable")).ToContainTextAsync("not available for this school yet");
        await Expect(Page.Locator(".fireball-ritual")).ToHaveCountAsync(0);
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Upgrade to Lv 2" })).ToHaveCountAsync(0);
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= window.innerWidth + 2"));
        Assert.AreEqual(school, await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.characterSchool.v1')"));
        Assert.AreEqual(1, await Page.EvaluateAsync<int>("() => JSON.parse(localStorage.getItem('wyrmforge.essenceVault')).length"));
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_FireballMutationSources_ExplainRealAshfangUnlocksWithoutInventedCrafting(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','3'); localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]})); localStorage.setItem('wyrmforge.essenceVault',JSON.stringify(['CinderHeart']));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.Locator(".fireball-socket--1").ClickAsync();

        await Expect(Page.Locator(".fireball-mutator")).ToHaveCountAsync(10);
        await Expect(Page.Locator(".fireball-source-details")).ToHaveCountAsync(4);
        await Expect(Page.Locator(".fireball-source-unavailable")).ToHaveCountAsync(6);

        var meteor = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Meteor Heart" });
        await Expect(meteor.Locator("summary")).ToContainTextAsync("Ashfang");
        await Expect(meteor.Locator("summary")).ToContainTextAsync("Molten Fang");
        await Expect(meteor.Locator(".fireball-mutator")).ToBeDisabledAsync();
        await meteor.Locator("summary").ClickAsync();
        await Expect(meteor.Locator(".fireball-source-description")).ToContainTextAsync("Secure Molten Fang from an Ashfang Hunt");
        await Expect(meteor.Locator(".fireball-source-description")).ToContainTextAsync("No crafting required");
        await Expect(meteor.Locator(".fireball-source-description")).ToContainTextAsync("Not yet unlocked");
        Assert.IsTrue(await meteor.Locator("summary").EvaluateAsync<bool>("element => element.getBoundingClientRect().height >= 44"));

        var detonation = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Detonation" });
        await Expect(detonation.Locator("summary")).ToContainTextAsync("Cinder Heart");
        await detonation.Locator("summary").ClickAsync();
        await Expect(detonation.Locator(".fireball-source-description")).ToContainTextAsync("Already unlocked");
        await Expect(detonation.Locator(".fireball-source-description")).ToContainTextAsync("Secured in vault: 1");

        var planned = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Phoenix Volley" });
        await Expect(planned.Locator(".fireball-source-unavailable")).ToHaveTextAsync("Source not available yet");
        await Expect(planned.Locator("details")).ToHaveCountAsync(0);
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= window.innerWidth + 2"),
            "Source disclosures must not cause horizontal overflow on mobile.");
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_FireballUpgrade_ContextualProgressionGuidance_OnlyAppearsWithCorePanel(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.removeItem('wyrmforge.fireballCore.v1');
            localStorage.removeItem('wyrmforge.essenceVault');
            localStorage.removeItem('wyrmforge.huntMaterials.v1');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");

        var helper = Page.Locator(".fireball-context .fireball-progression-help");
        await Expect(Page.Locator(".fireball-context h3")).ToHaveTextAsync("Upgrade Fireball");
        await Expect(helper).ToHaveTextAsync("Mutators are discovered in Research and equipped into unlocked sockets.");
        await Expect(helper).ToBeVisibleAsync();
        await Expect(Page.Locator(".fireball-chamber")).ToBeVisibleAsync();

        await Page.Locator(".fireball-socket--1").ClickAsync();
        await Expect(helper).ToHaveCountAsync(0);
        await Expect(Page.Locator(".fireball-mutator-list")).ToBeVisibleAsync();
        await Page.Locator(".fireball-center").ClickAsync();
        await Expect(helper).ToBeVisibleAsync();

        await Page.Locator(".fireball-socket--3").ClickAsync();
        await Expect(Page.Locator(".fireball-locked-explainer")).ToContainTextAsync("Socket 3 is sealed");
        await Expect(helper).ToBeVisibleAsync();
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= innerWidth + 2"),
            "Progression guidance must stay below the altar and fit narrow mobile viewports.");
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_EmptyFireballSocket_WithNoMutators_ShowsAcquisitionAndOpensWorldGate(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.removeItem('wyrmforge.fireballCore.v1');
            localStorage.removeItem('wyrmforge.essenceVault');
            localStorage.removeItem('wyrmforge.huntMaterials.v1');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Expect(Page.Locator(".fireball-first-mutator")).ToHaveCountAsync(0);
        await Page.Locator(".fireball-socket--1").ClickAsync();

        var guide = Page.Locator(".fireball-first-mutator");
        await Expect(guide).ToBeVisibleAsync();
        await Expect(guide).ToContainTextAsync("No mutators unlocked yet");
        await Expect(guide).ToContainTextAsync("Ashlings");
        await Expect(guide).ToContainTextAsync("Ash Slingers");
        await Expect(guide).ToContainTextAsync("barrels and crates");
        await Expect(guide).ToContainTextAsync("Extract to keep");
        await Expect(guide).ToContainTextAsync("Ember Residue");
        await Expect(guide).ToContainTextAsync("Charred Scrap");
        await Expect(guide).ToContainTextAsync("0 / 2");
        await Expect(Page.Locator(".fireball-mutator")).ToHaveCountAsync(10);
        await Expect(guide.GetByRole(AriaRole.Button, new() { Name = "Craft Cinder Needle" })).ToHaveCountAsync(0);
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= innerWidth + 2"),
            "The first-mutator guide must fit a narrow phone viewport.");

        await guide.GetByRole(AriaRole.Button, new() { Name = "Open World Gate" }).ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_EmptyFireballSocket_WithSecuredMaterials_CraftsFirstMutatorInPlace()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.setItem('wyrmforge.huntMaterials.v1',
                JSON.stringify(['EmberResidue','EmberResidue','CharredScrap','CharredScrap']));
            localStorage.removeItem('wyrmforge.fireballCore.v1');
            localStorage.removeItem('wyrmforge.essenceVault');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.Locator(".fireball-socket--1").ClickAsync();

        var guide = Page.Locator(".fireball-first-mutator");
        await Expect(guide).ToContainTextAsync("Ember Residue");
        await Expect(guide).ToContainTextAsync("2 / 2");
        await Expect(guide.GetByRole(AriaRole.Button, new() { Name = "Open World Gate" })).ToHaveCountAsync(0);
        await guide.GetByRole(AriaRole.Button, new() { Name = "Craft Cinder Needle" }).ClickAsync();
        await Expect(guide).ToHaveCountAsync(0);

        var firstMutation = Page.Locator(".fireball-mutator").First;
        await Expect(firstMutation).ToContainTextAsync("Cinder Needle");
        await Expect(firstMutation).ToBeEnabledAsync();
        await firstMutation.ClickAsync();
        await Expect(Page.Locator(".fireball-socket--1")).ToContainTextAsync("Cinder Needle");
        Assert.AreEqual(0, await Page.EvaluateAsync<int>(
            "() => JSON.parse(localStorage.getItem('wyrmforge.huntMaterials.v1')).length"));
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_FireballMutators_WithNoIngredients_DistinguishUnknownUncraftedAndPlanned(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.removeItem('wyrmforge.fireballCore.v1');
            localStorage.removeItem('wyrmforge.essenceVault');
            localStorage.removeItem('wyrmforge.huntMaterials.v1');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.Locator(".fireball-socket--1").ClickAsync();

        var unknown = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Meteor Heart" });
        await Expect(unknown).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\bunknown\b"));
        await Expect(unknown.Locator(".mutation-state")).ToHaveTextAsync("Unknown");
        await Expect(unknown.Locator(".mutation-unknown-mark")).ToHaveTextAsync("?");
        await Expect(unknown.Locator(".fireball-mutator")).ToBeDisabledAsync();
        await unknown.Locator("summary").ClickAsync();
        await Expect(unknown.Locator(".fireball-source-description")).ToContainTextAsync("Molten Fang");

        var cinder = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Cinder Needle" });
        await Expect(cinder).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\buncrafted\b"));
        await Expect(cinder.Locator(".mutation-state")).ToHaveTextAsync("Uncrafted");
        await Expect(cinder.Locator(".fireball-mutator")).ToBeDisabledAsync();

        var future = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Phoenix Volley" });
        await Expect(future).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\bplanned\b"));
        await Expect(future.Locator(".mutation-state")).ToHaveTextAsync("Planned");
        await Expect(future.Locator(".fireball-mutator")).ToBeDisabledAsync();
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= innerWidth + 2"));
    }

    [TestMethod]
    public async Task Mobile_FireballMutators_AfterSecuringMaterials_TransitionCraftableOwnedEquipped()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.setItem('wyrmforge.essenceVault',JSON.stringify(['CinderHeart']));
            localStorage.setItem('wyrmforge.huntMaterials.v1',
                JSON.stringify(['EmberResidue','EmberResidue','CharredScrap','CharredScrap']));
            localStorage.removeItem('wyrmforge.fireballCore.v1');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.Locator(".fireball-socket--1").ClickAsync();

        var owned = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Detonation" });
        await Expect(owned.Locator(".mutation-state")).ToHaveTextAsync("Owned");
        await Expect(owned.Locator(".fireball-mutator")).ToBeEnabledAsync();

        var cinder = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Cinder Needle" });
        await Expect(cinder).ToHaveClassAsync(new System.Text.RegularExpressions.Regex(@"\bcraftable\b"));
        await Expect(cinder.Locator(".mutation-state")).ToHaveTextAsync("Craftable now");
        await Expect(cinder.Locator(".fireball-mutator")).ToBeDisabledAsync();
        await cinder.Locator("summary").ClickAsync();
        await cinder.GetByRole(AriaRole.Button, new() { Name = "Craft Cinder Needle" }).ClickAsync();
        await Expect(cinder.Locator(".mutation-state")).ToHaveTextAsync("Owned");
        await Expect(cinder.Locator(".fireball-mutator")).ToBeEnabledAsync();

        await cinder.Locator(".fireball-mutator").ClickAsync();
        await Expect(cinder.Locator(".mutation-state")).ToHaveTextAsync("Equipped");
        await Expect(Page.Locator(".fireball-socket--1")).ToContainTextAsync("Cinder Needle");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Remove mutator" }).ClickAsync();
        await Expect(cinder.Locator(".mutation-state")).ToHaveTextAsync("Owned");
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= innerWidth + 2"));
    }

    [TestMethod]
    public async Task Mobile_FireballMutators_WhenEquippedInAnotherSocket_ShowEquippedButPreventDuplication()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.removeItem('wyrmforge.essenceVault');
            localStorage.setItem('wyrmforge.fireballCore.v1',
                JSON.stringify({Level:2,Discovered:[2],Slots:[2,null,null,null,null]}));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.Locator(".fireball-socket--2").ClickAsync();

        var detonation = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Detonation" });
        await Expect(detonation.Locator(".mutation-state")).ToHaveTextAsync("Equipped");
        await Expect(detonation.Locator(".mutation-state")).ToHaveAttributeAsync("aria-label", "Equipped in another socket");
        await Expect(detonation.Locator(".fireball-mutator")).ToBeDisabledAsync();
        await Expect(Page.Locator(".fireball-socket--1")).ToContainTextAsync("Detonation");
        await Expect(Page.Locator(".fireball-socket--2")).ToContainTextAsync("Empty");
    }

    [TestMethod]
    public async Task Mobile_Fireball_CraftMinorMutationFromSecuredOrdinaryLoot()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"if (!localStorage.getItem('cinderCraftTestSeeded')) {
            localStorage.setItem('cinderCraftTestSeeded','1');
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.setItem('wyrmforge.huntMaterials.v1',JSON.stringify([
                'EmberResidue','EmberResidue','CharredScrap','CharredScrap']));
            localStorage.removeItem('wyrmforge.fireballCore.v1');
        }");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.Locator(".fireball-socket--1").ClickAsync();
        var needle = Page.Locator(".fireball-mutator-entry").Filter(new() { HasText = "Cinder Needle" });
        await Expect(needle.Locator(".fireball-mutator")).ToBeDisabledAsync();
        await needle.Locator("summary").ClickAsync();
        await Expect(needle.Locator(".fireball-common-recipe")).ToContainTextAsync("Ember Residue: 2 / 2");
        await Expect(needle.Locator(".fireball-common-recipe")).ToContainTextAsync("Charred Scrap: 2 / 2");
        await needle.GetByRole(AriaRole.Button, new() { Name = "Craft Cinder Needle" }).ClickAsync();
        await Expect(needle.Locator(".fireball-mutator")).ToBeEnabledAsync();
        await Expect(needle.Locator(".fireball-crafted")).ToHaveTextAsync("Already crafted");
        await needle.Locator(".fireball-mutator").ClickAsync();
        await Expect(Page.Locator(".fireball-socket--1")).ToContainTextAsync("Cinder Needle");
        Assert.AreEqual(0, await Page.EvaluateAsync<int>(@"() =>
            JSON.parse(localStorage.getItem('wyrmforge.huntMaterials.v1')).length"));
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Expect(Page.Locator(".fireball-socket--1")).ToContainTextAsync("Cinder Needle");
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= window.innerWidth + 2"));
    }

    [TestMethod]
    public async Task Mobile_FireballLevelFour_NeedsRareEmberglassAndSpendsGradedEssence()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"if (!localStorage.getItem('emberglassTestSeeded')) {
            localStorage.setItem('emberglassTestSeeded','1');
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.setItem('wyrmforge.fireballCore.v1',JSON.stringify({Level:3,Discovered:[],Slots:[]}));
            localStorage.setItem('wyrmforge.essenceVault',JSON.stringify(['CinderHeart','AshenWing']));
            localStorage.setItem('wyrmforge.essenceGrades.v1',JSON.stringify({CinderHeart:{Epic:1}}));
            localStorage.removeItem('wyrmforge.huntMaterials.v1');
        }");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");

        var emberglass = Page.Locator(".fireball-material.loot-rarity-rare");
        await Expect(emberglass).ToContainTextAsync("Emberglass");
        await Expect(emberglass).ToContainTextAsync("Rare · 0 / 1");
        await Expect(emberglass).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("missing"));
        await Expect(Page.Locator(".fireball-material").Filter(new() { HasText = "Cinder Heart" })).ToContainTextAsync("Epic ×1");
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Upgrade to Lv 4" })).ToBeDisabledAsync();
        Assert.AreEqual("rgb(111, 168, 220)", await emberglass.Locator(".loot-rarity-label").EvaluateAsync<string>("label => getComputedStyle(label).color"));
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= window.innerWidth + 2"));
        await ScreenshotAsync("fireball-emberglass-gate-390.png");

        await Page.EvaluateAsync("() => localStorage.setItem('wyrmforge.huntMaterials.v1', JSON.stringify(['Emberglass']))");
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Expect(Page.Locator(".fireball-material.loot-rarity-rare")).ToContainTextAsync("Rare · 1 / 1");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Upgrade to Lv 4" }).ClickAsync();
        await Expect(Page.Locator(".fireball-heading h2 span")).ToHaveTextAsync("Lv 4");
        Assert.AreEqual("[]", await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.huntMaterials.v1')"));
        Assert.AreEqual("[]", await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.essenceVault')"));
        Assert.AreEqual("{}", await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.essenceGrades.v1')"));
        await Expect(Page.Locator(".fireball-material.loot-rarity-rare")).ToContainTextAsync("Rare · 0 / 1");
        var wyrmcinder = Page.Locator(".fireball-material.loot-rarity-epic");
        await Expect(wyrmcinder).ToContainTextAsync("Wyrmcinder Core");
        await Expect(wyrmcinder).ToContainTextAsync("Epic · 0 / 1");
    }

    [TestMethod]
    public async Task Mobile_FireballNexus_EquipsUpgradesAndRestoresPersistentSpell()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("if (!localStorage.getItem('fireballTestSeeded')) { localStorage.setItem('fireballTestSeeded','1'); localStorage.setItem('wyrmforge.firstHunt.v1','3'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:8, Nodes:[] })); localStorage.setItem('wyrmforge.essenceVault', JSON.stringify(['CinderHeart'])); }");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");

        await Expect(Page.Locator(".fireball-ritual")).ToBeVisibleAsync();
        await Expect(Page.Locator(".fireball-hero-art")).ToBeVisibleAsync();
        Assert.IsTrue(await Page.Locator(".fireball-chamber").EvaluateAsync<bool>(
            "element => getComputedStyle(element).backgroundImage.includes('arcane-nexus/ritual-chamber.svg')"),
            "The live Nexus must load its independent Gothic chamber layer.");
        Assert.IsTrue(await Page.Locator(".fireball-hero-art").EvaluateAsync<bool>("img => img.complete && img.naturalWidth > 0"),
            "The approved Fireball artwork must actually load, rather than silently falling back to CSS.");
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= window.innerWidth + 2"),
            "The Arcane Nexus must not overflow a 390px portrait viewport.");
        await Expect(Page.Locator(".fireball-context h3")).ToHaveTextAsync("Upgrade Fireball");
        Assert.IsTrue(await Page.Locator(".fireball-panel-heading .fireball-school-icon").EvaluateAsync<bool>(@"async icon => {
            const style = getComputedStyle(icon);
            if (!style.backgroundImage.includes('divine-lineage-sigils.webp')
                || !style.backgroundPosition.startsWith('0') || style.imageRendering !== 'pixelated') return false;
            const image = new Image();
            image.src = style.backgroundImage.slice(5, -2);
            try { await image.decode(); } catch { return false; }
            return image.naturalWidth === 192 && image.naturalHeight === 128;
        }"), "The upgrade panel must render the same canonical Fire sigil as character creation.");
        await Expect(Page.Locator(".fireball-socket")).ToHaveCountAsync(5);
        await Expect(Page.Locator(".fireball-socket.sealed")).ToHaveCountAsync(4);
        await Page.Locator(".fireball-socket--3").ClickAsync();
        await Expect(Page.Locator(".fireball-context")).ToBeFocusedAsync();
        await Expect(Page.Locator(".fireball-context h3")).ToHaveTextAsync("Upgrade Fireball");
        await Expect(Page.Locator(".fireball-locked-explainer")).ToContainTextAsync("Socket 3 is sealed");
        await Expect(Page.Locator(".fireball-locked-explainer")).ToContainTextAsync("Unlocks at Fireball Lv 3");
        await Expect(Page.Locator(".fireball-locked-explainer")).ToContainTextAsync("equip a researched mutator");
        await Page.Locator(".fireball-center").ClickAsync();
        await Expect(Page.Locator(".fireball-locked-explainer")).ToHaveCountAsync(0);
        await ScreenshotAsync("arcane-nexus-fireball-390.png");

        await Page.Locator(".fireball-socket--1").ClickAsync();
        await Expect(Page.Locator(".fireball-context")).ToBeFocusedAsync();
        await Expect(Page.Locator(".fireball-context h3")).ToContainTextAsync("Select a mutator");
        await Expect(Page.Locator(".fireball-mutator")).ToHaveCountAsync(10);
        Assert.AreEqual(3, await Page.Locator(".fireball-mutator img.fireball-mutation-art").CountAsync(),
            "Implemented mutations each have authored, separate pixel-art assets.");
        Assert.IsTrue(await Page.Locator(".fireball-mutator img.fireball-mutation-art").EvaluateAllAsync<bool>(
            "images => images.every(image => image.complete && image.naturalWidth > 0)"),
            "All implemented Fireball mutation art must load in the actual selector.");
        await Page.Locator(".fireball-mutator").Filter(new() { HasText = "Detonation" }).ClickAsync();
        await Expect(Page.Locator(".fireball-socket--1")).ToContainTextAsync("Detonation");
        await Expect(Page.Locator(".fireball-socket--1 img.fireball-mutation-art")).ToBeVisibleAsync();

        await Page.Locator(".fireball-center").ClickAsync();
        await Expect(Page.Locator(".fireball-context")).ToBeFocusedAsync();
        await Expect(Page.Locator(".fireball-context h3")).ToHaveTextAsync("Upgrade Fireball");
        Assert.AreEqual("hidden", await Page.Locator("[data-game-version]").EvaluateAsync<string>("element => getComputedStyle(element).visibility"));
        await Expect(Page.Locator(".fireball-mini-pips i")).ToHaveCountAsync(10);
        await Expect(Page.Locator(".fireball-damage-growth")).ToContainTextAsync("Base damage: +0%");
        await Expect(Page.Locator(".fireball-damage-growth")).ToContainTextAsync("+8%");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Upgrade to Lv 2" }).ClickAsync();
        await Expect(Page.Locator(".fireball-heading h2")).ToContainTextAsync("Lv 2");
        await Expect(Page.Locator(".fireball-damage-growth")).ToContainTextAsync("Base damage: +8%");
        await Expect(Page.Locator(".fireball-damage-growth")).ToContainTextAsync("+16%");
        await Expect(Page.Locator(".fireball-socket.sealed")).ToHaveCountAsync(3);
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Expect(Page.Locator(".fireball-heading h2")).ToContainTextAsync("Lv 2");
        await Expect(Page.Locator(".fireball-socket--1")).ToContainTextAsync("Detonation");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        Assert.IsGreaterThan(40, await Page.Locator(".web-node").CountAsync());
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
        await Expect(Page.Locator(".refuge-town-spot[data-town-state='active']")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".refuge-town-vacant-layer")).ToHaveCountAsync(4);
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
        await Expect(Page.Locator(".refuge-town-spot[data-town-state='active']")).ToHaveCountAsync(2);
        await Expect(Page.Locator(".refuge-town-vacant-layer")).ToHaveCountAsync(2);
        await Expect(Page.Locator(".refuge-town-night-base")).ToHaveCountAsync(1);
        await OpenTownBuildingAsync("Arcane Nexus");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Nexus", Exact = true })).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        await Expect(Page.Locator(".build-points strong")).ToHaveTextAsync("1");
    }

    [TestMethod]
    public async Task Mobile_Spellcraft_ResearchesAndBindsRimeInfusionWithConsent()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','3'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:8, Nodes:[] })); localStorage.setItem('wyrmforge.essenceVault', JSON.stringify(['RimeHeart']));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Research" }).ClickAsync();

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
        await OpenTownBuildingAsync("Hall of Fame");
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
    public async Task Mobile_ColdStartBeyondNineSeconds_CompletesWithoutAutomaticReload()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var delayedFrameworkResource = false;
        await Page.RouteAsync("**/_framework/*", async route =>
        {
            if (delayedFrameworkResource || !route.Request.Url.Contains(".wasm", StringComparison.OrdinalIgnoreCase))
            {
                await route.ContinueAsync();
                return;
            }

            delayedFrameworkResource = true;
            await Task.Delay(TimeSpan.FromSeconds(12));
            await route.ContinueAsync();
        });

        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        await Expect(Page.Locator("#ignition-status")).ToHaveTextAsync("FIRST LAUNCH MAY TAKE A MOMENT",
            new() { Timeout = 20000 });
        Assert.IsFalse(Page.Url.Contains("boot=", StringComparison.Ordinal),
            "A slow but healthy startup must not discard its in-flight downloads by navigating again.");

        await Expect(Page.Locator("main.game-shell")).ToBeVisibleAsync(new() { Timeout = 40000 });
        await Expect(Page.Locator("#wyrmforge-ignition")).ToHaveCountAsync(0, new() { Timeout = 40000 });
        Assert.IsTrue(delayedFrameworkResource, "The test must delay a real .NET WebAssembly resource.");
        Assert.IsTrue(await Page.EvaluateAsync<bool>(
            "() => performance.getEntriesByName('wyrmforge:boot', 'measure').length === 1"));
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
            await OpenAsync("Pyromancer");

            await OpenTownBuildingAsync("Blacksmith");
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

            await OpenTownBuildingAsync("Codex");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Lineages", Exact = true }).ClickAsync();
            await Expect(Page.GetByText("WYRMFORGED SPELL LINEAGES", new() { Exact = true })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Great Hunt", Exact = true }).ClickAsync();
            await Expect(Page.Locator(".codex-view .great-hunt-altar")).ToBeVisibleAsync();
            await ScreenshotAsync("mobile-mastery-codex.png");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();

            await OpenTownBuildingAsync("Arcane Nexus");
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Nexus", Exact = true })).ToBeVisibleAsync();
            await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();

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

            await OpenTownBuildingAsync("Blacksmith");
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

            await OpenTownBuildingAsync("Codex");
            await Page.GetByRole(AriaRole.Button, new() { Name = "Lineages", Exact = true }).ClickAsync();
            await Expect(Page.GetByText("WYRMFORGED SPELL LINEAGES", new() { Exact = true })).ToBeVisibleAsync();
            await ScreenshotAsync("desktop-mastery-codex.png");

            await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();

            await OpenTownBuildingAsync("Arcane Nexus");
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
    public async Task Mobile_WorldGate_FollowsFreePlayLineageAndTierSteps(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:2, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();

        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "World Gate" })).ToBeVisibleAsync();
        await Expect(Page.Locator(".gate-scene-art")).ToHaveAttributeAsync("src", "art/world-gate.jpg");
        await Expect(Page.Locator(".gate-closed-side")).ToBeVisibleAsync();
        await ScreenshotAsync($"world-gate-{width}.png");

        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Expect(Page.Locator(".gate-action--locked")).ToHaveCountAsync(2);
        foreach (var mode in await Page.Locator(".gate-action--locked").AllAsync()) await Expect(mode).ToBeDisabledAsync();
        await ScreenshotAsync($"world-gate-modes-{width}.png");

        await Page.Locator(".gate-action--primary").ClickAsync();
        await Expect(Page.Locator(".gate-lineage")).ToHaveCountAsync(6);
        await Expect(Page.Locator(".gate-lineage--hidden")).ToHaveCountAsync(4);
        await Expect(Page.Locator(".gate-sigil")).ToHaveCountAsync(6);
        foreach (var school in new[] { "fire", "frost", "storm", "arcane", "necromancy", "summoner" })
            await Expect(Page.Locator($".gate-sigil--{school}")).ToBeVisibleAsync();
        var atlas = await Page.Locator(".gate-sigil--fire").EvaluateAsync<string>("element => getComputedStyle(element).backgroundImage");
        StringAssert.Contains(atlas, "divine-lineage-sigils.webp");
        var atlasLoaded = await Page.EvaluateAsync<bool>(
            "async () => { const image = new Image(); image.src = new URL('art/divine-lineage-sigils.webp', document.baseURI).href; await image.decode(); return image.naturalWidth === 192 && image.naturalHeight === 128; }");
        Assert.IsTrue(atlasLoaded, "Six actual pixel sigils must load from the approved runtime atlas.");
        await Expect(Page.Locator(".gate-lineage--fire")).ToBeEnabledAsync();
        await Expect(Page.Locator(".gate-lineage--frost")).ToBeEnabledAsync();
        foreach (var teaser in await Page.Locator(".gate-lineage--hidden").AllAsync()) await Expect(teaser).ToBeDisabledAsync();
        await ScreenshotAsync($"world-gate-lineages-{width}.png");

        var horizontal = await Page.EvaluateAsync<double>("() => document.documentElement.scrollWidth - window.innerWidth");
        Assert.IsLessThanOrEqualTo(1, horizontal, "The six-lineage Hunt grid must not overflow mobile screens.");
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Expect(Page.Locator(".gate-tier")).ToHaveCountAsync(5);
        await Expect(Page.Locator(".gate-tier--ready")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".gate-tier--locked")).ToHaveCountAsync(4);
        await Expect(Page.GetByText("Tier 1: 3-4 trails, one fork, then Ashfang. Extract to secure your Essence.", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".gate-tier--locked").First).ToContainTextAsync("Clear Tier 1 first");
        await ScreenshotAsync($"world-gate-fire-tiers-{width}.png");

        await Page.Locator(".gate-tier--ready").ClickAsync();
        await Expect(Page.Locator(".world-gate")).ToHaveCountAsync(0);
        await Expect(Page.Locator("canvas").First).ToBeVisibleAsync();
        await Expect(Page.GetByText("FIRE · TIER 1", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator("button.route-node")).ToHaveCountAsync(6);
        await Expect(Page.Locator("button.route-node.available")).ToHaveCountAsync(1);
        await ScreenshotAsync($"fire-tier-one-map-{width}.png");
    }

    [TestMethod]
    public async Task FireTierOne_CompletionOpensFireTierTwoWithoutUnlockingFrostOrHigherTiers()
    {
        const string tierTwoOpen = "Tier 2 open: 6-8 trails, two forks and an optional refuge, then Ascendant Ashfang.";
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"if (!localStorage.getItem('fireTierTestSeeded')) {
            localStorage.setItem('fireTierTestSeeded','1');
            localStorage.setItem('wyrmforge.firstHunt.v1','2');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:2,Nodes:[]}));
            localStorage.setItem('wyrmforge.world.v1',JSON.stringify({
                Discovered:['cinder-frontier'], Selected:'glacier-region', CompletedTierOneHunts:['cinder-frontier']
            }));
        }");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Expect(Page.GetByText(tierTwoOpen, new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".gate-tier--ready")).ToHaveCountAsync(2);
        await Expect(Page.Locator(".gate-tier--locked")).ToHaveCountAsync(3);
        await Expect(Page.Locator(".gate-tier--locked").First).ToContainTextAsync("Clear Tier 2 first");
        await Expect(Page.Locator(".gate-tier--locked").Nth(1)).ToContainTextAsync("Not yet available");
        await ScreenshotAsync("world-gate-fire-tier-two-open.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to Wyrm lineages" }).ClickAsync();
        await Page.Locator(".gate-lineage--frost").ClickAsync();
        await Expect(Page.GetByText(tierTwoOpen, new() { Exact = true })).ToHaveCountAsync(0);
        await Expect(Page.Locator(".gate-tier--ready")).ToHaveCountAsync(1);
        await Page.Locator(".gate-tier--ready").ClickAsync();
        var save = await Page.EvaluateAsync<JsonElement>("() => JSON.parse(localStorage.getItem('wyrmforge.world.v1'))");
        Assert.AreEqual("glacier-region", save.GetProperty("Selected").GetString());
        CollectionAssert.AreEqual(new[] { "cinder-frontier" }, save.GetProperty("CompletedTierOneHunts").EnumerateArray().Select(v => v.GetString()).ToArray());
        Assert.AreEqual(1, save.GetProperty("ClearedHuntTiers").GetProperty("cinder-frontier").GetInt32());
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Expect(Page.GetByText(tierTwoOpen, new() { Exact = true })).ToBeVisibleAsync();
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_FireTierTwo_ShowsAscendantTargetAndOptionalRefuge(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"if (!localStorage.getItem('fireTierTwoSeeded')) {
            localStorage.setItem('fireTierTwoSeeded','1');
            localStorage.setItem('wyrmforge.firstHunt.v1','2');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:2,Nodes:[]}));
            localStorage.setItem('wyrmforge.world.v1',JSON.stringify({
                Discovered:['cinder-frontier'], Selected:'cinder-frontier', ClearedHuntTiers:{'cinder-frontier':1}
            }));
        }");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Page.Locator(".gate-tier--ready").Nth(1).ClickAsync();
        await Expect(Page.GetByText("FIRE · TIER 2", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".map-attention summary b")).ToHaveTextAsync("Ascendant Ashfang");
        await Expect(Page.Locator("button.route-node .node-refuge")).ToHaveCountAsync(1);
        await Expect(Page.Locator("button.route-node .node-refuge")).ToHaveTextAsync("⛨ OPTIONAL");
        await ScreenshotAsync($"fire-tier-two-map-{width}.png");
        await Page.Locator("button.route-node", new() { Has = Page.Locator(".node-refuge") }).ClickAsync(new() { Force = true });
        await Expect(Page.GetByText("Reclaim it and a later fall returns you here. Finds made after it are lost.", new() { Exact = true })).ToBeVisibleAsync();
        await ScreenshotAsync($"fire-tier-two-refuge-sheet-{width}.png");
        var horizontal = await Page.EvaluateAsync<double>("() => document.documentElement.scrollWidth - window.innerWidth");
        Assert.IsLessThanOrEqualTo(1, horizontal, "The Tier 2 map must not overflow mobile screens.");
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_FireTierThree_ShowsElderTargetRefugeAndOptionalWatchtower(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"if (!localStorage.getItem('fireTierThreeSeeded')) {
            localStorage.setItem('fireTierThreeSeeded','1');
            localStorage.setItem('wyrmforge.firstHunt.v1','2');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:2,Nodes:[]}));
            localStorage.setItem('wyrmforge.world.v1',JSON.stringify({
                Discovered:['cinder-frontier'], Selected:'cinder-frontier', ClearedHuntTiers:{'cinder-frontier':2}
            }));
        }");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Expect(Page.GetByText("Tier 3 open: 10-13 trails, three forks, a refuge and a watchtower that scouts the last fork, then Elder Ashfang.",
            new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".gate-tier--ready")).ToHaveCountAsync(3);
        await ScreenshotAsync($"world-gate-fire-tier-three-open-{width}.png");
        await Page.Locator(".gate-tier--ready").Nth(2).ClickAsync();
        await Expect(Page.GetByText("FIRE · TIER 3", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".map-attention summary b")).ToHaveTextAsync("Elder Ashfang");
        await Expect(Page.Locator(".realm-route--long")).ToHaveCountAsync(1);
        await Expect(Page.Locator("button.route-node .node-refuge")).ToHaveCountAsync(1);
        await Expect(Page.Locator("button.route-node .node-tower")).ToHaveTextAsync("◉ OPTIONAL");
        await Expect(Page.Locator("button.route-node .node-scouted")).ToHaveCountAsync(0);
        await ScreenshotAsync($"fire-tier-three-map-{width}.png");
        var tower = Page.Locator("button.route-node", new() { Has = Page.Locator(".node-tower") });
        await tower.ScrollIntoViewIfNeededAsync();
        await ScreenshotAsync($"fire-tier-three-watchtower-{width}.png");
        await tower.ClickAsync(new() { Force = true });
        await Expect(Page.GetByText("◉ Optional detour · scouts the last fork", new() { Exact = true })).ToBeVisibleAsync();
        await ScreenshotAsync($"fire-tier-three-watchtower-sheet-{width}.png");
        var horizontal = await Page.EvaluateAsync<double>("() => document.documentElement.scrollWidth - window.innerWidth");
        Assert.IsLessThanOrEqualTo(1, horizontal, "The Tier 3 map must not overflow mobile screens.");
    }

    [TestMethod]
    public async Task Mobile_WorldGate_FrostCanBeSelectedWithoutDefeatingAshfangAndStartsInSnow()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({ Budget:2, Nodes:[] }));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Expect(Page.Locator(".gate-lineage--frost")).ToBeEnabledAsync();
        await Page.Locator(".gate-lineage--frost").ClickAsync();
        await Expect(Page.Locator(".gate-heading-sigil.gate-sigil--frost")).ToBeVisibleAsync();
        await ScreenshotAsync("world-gate-frost-tiers.png");

        await Page.Locator(".gate-tier--ready").ClickAsync();
        var save = await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.world.v1')");
        StringAssert.Contains(save, "glacier-region");
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.GetByText(new System.Text.RegularExpressions.Regex("Snowbound vale|Rimewall heights|Glacier basin", System.Text.RegularExpressions.RegexOptions.IgnoreCase)).First).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task Mobile_Atlas_CompleteWebAndBackNavigationArePreserved()
    {
        await Page.SetViewportSizeAsync(320, 568);
        await OpenAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        Assert.IsGreaterThan(40, await Page.Locator(".web-node").CountAsync());
        Assert.IsGreaterThan(40, await Page.Locator(".web-connections path.web-edge").CountAsync());
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
        var viewport = Page.Locator(".refuge-canonical-viewport");
        await Expect(Page.Locator(".refuge-town-spot[data-town-state='vacant']")).ToHaveCountAsync(4);
        await Expect(Page.Locator(".refuge-town-vacant-layer")).ToHaveCountAsync(4);
        await viewport.EvaluateAsync("element => window.wyrmforgeTown.show(0, false)");
        await Page.Locator(".refuge-town-spot--nexus").ClickAsync();
        await Expect(Page.Locator(".town-lock-notice")).ToContainTextAsync("Complete your first hunt");
        await Page.Locator(".refuge-town-spot--blacksmith").ClickAsync();
        await Expect(Page.Locator(".town-lock-notice")).ToContainTextAsync("first secured Essence");
        await viewport.EvaluateAsync("element => window.wyrmforgeTown.show(2, false)");
        await Page.Locator(".refuge-town-spot--codex").ClickAsync();
        await Expect(Page.Locator(".town-lock-notice")).ToContainTextAsync("Complete your first hunt");
        await Page.Locator(".refuge-town-spot--hall").ClickAsync();
        await Expect(Page.Locator(".town-lock-notice")).ToContainTextAsync("Complete two hunts");
        await Expect(Page.Locator(".refuge-town-vacant-layer")).ToHaveCountAsync(4);
        await Expect(Page.Locator(".refuge-town-spot[data-town-state='vacant']")).ToHaveCountAsync(4);
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.townVisualOverride')"));
        await ScreenshotAsync("refuge-town-locked-gameplay.png");
    }
    [TestMethod]
    public async Task Mobile_CharacterCreation_UsesDivineSchoolBeforeFirstHuntAndPersists()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true }).ClickAsync();
        await Expect(Page.Locator(".character-creation")).ToBeVisibleAsync();
        await Expect(Page.Locator(".character-school")).ToHaveCountAsync(6);
        await Expect(Page.Locator(".character-school:disabled")).ToHaveCountAsync(5);
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Choose your magic" })).ToBeVisibleAsync();
        await Expect(Page.GetByText("Choose your Divine Wyrm affinity.")).ToHaveCountAsync(0);
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Arcanist, not yet available" })).ToBeDisabledAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
        Assert.AreEqual("Pyromancer", await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.characterSchool.v1')"));
        Assert.AreEqual("FireBolt", await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.preferredPrimary.v1')"));
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Choose your primary magic" })).ToHaveCountAsync(0);
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".combat-vitals-spells .combat-spell-badge")).ToHaveAttributeAsync("aria-label", "Fire Bolt, rank 1");
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.Locator(".character-creation")).ToHaveCountAsync(0);
        Assert.AreEqual("Pyromancer", await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.characterSchool.v1')"));
    }

    [TestMethod]
    public async Task Mobile_Refuge_UnlocksOccupiedBuildingsWithClickableHotspots()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync();
        await Expect(Page.Locator(".refuge-town-spot[data-town-state='vacant']")).ToHaveCountAsync(0);
        await Expect(Page.Locator(".refuge-town-spot[data-town-state='active']")).ToHaveCountAsync(4);
        await Expect(Page.Locator(".refuge-town-vacant-layer")).ToHaveCountAsync(0);
        await Page.Locator(".refuge-town-spot--nexus").ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Arcane Nexus", Exact = true })).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await Page.Locator(".refuge-town-spot--blacksmith").ClickAsync();
        await Expect(Page.Locator(".forge-view")).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await Page.Locator(".refuge-town-spot--codex").ClickAsync();
        await Expect(Page.Locator(".codex-view")).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await Page.Locator(".refuge-town-spot--hall").ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Hall of Fame high scores" })).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Close Hall of Fame" }).ClickAsync();
        await Expect(Page.Locator(".refuge-town-spot[data-town-state='active']")).ToHaveCountAsync(4);
        await Expect(Page.Locator(".refuge-town-vacant-layer")).ToHaveCountAsync(0);
    }
    [TestMethod]
    public async Task Mobile_LegacyPrimary_MigratesCharacterSchoolWithoutPerHuntOath()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.preferredPrimary.v1','FrostShard');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Expect(Page.Locator(".character-creation")).ToHaveCountAsync(0);
        Assert.AreEqual("Cryomancer", await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.characterSchool.v1')"));
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN FIRST HUNT" }).ClickAsync();
        await ContinueThroughWorldGateAsync();
        await Expect(Page.GetByRole(AriaRole.Dialog, new() { Name = "Choose your primary magic" })).ToHaveCountAsync(0);
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator(".combat-vitals-spells .combat-spell-badge")).ToHaveAttributeAsync("aria-label", "Frost Shard, rank 1");
    }

    private async Task EnterFirstTrailAsync()
    {
        var back = Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" });
        if (await back.IsVisibleAsync()) await back.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN HUNT", Exact = true }).ClickAsync();
        await ContinueThroughWorldGateAsync();
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

    private async Task OpenTownBuildingAsync(string destination)
    {
        var back = Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" });
        if (await back.IsVisibleAsync()) await back.ClickAsync();
        var selector = destination switch
        {
            "Arcane Nexus" => ".refuge-town-spot--nexus",
            "Blacksmith" => ".refuge-town-spot--blacksmith",
            "Codex" => ".refuge-town-spot--codex",
            "Hall of Fame" => ".refuge-town-spot--hall",
            _ => throw new ArgumentOutOfRangeException(nameof(destination), destination, "Unknown town building"),
        };
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
        await Page.Locator(selector).ClickAsync();
    }

    private async Task EnterTownIfNeededAsync()
    {
        // Wait until Blazor has finished its first render. Checking IsVisibleAsync too
        // early can leave a test at the title scene even though the button appears later.
        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 30000 });
        await start.ClickAsync();
        await Expect(Page.Locator(".character-creation, .town-square")).ToBeVisibleAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_ArcaneWheel_RetainsKnowledgeAndWarnsOncePerVisit(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"if (!localStorage.getItem('wheelTestSeeded')) {
            localStorage.setItem('wheelTestSeeded','1');
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:['fire-start','storm-start','storm-1','storm-2']}));
        }");
        await Page.GotoAsync(BaseUrl, new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        await Expect(Page.Locator(".wheel-school-badge")).ToHaveCountAsync(6);
        var active = Page.Locator(".wheel-school-badge[data-active='true']");
        await Expect(active).ToHaveAttributeAsync("data-school", "Fire");
        Assert.IsTrue(await active.EvaluateAsync<bool>("el => el.style.left === '1600px' && el.style.top === '280px'"));
        await ScreenshotAsync($"arcane-wheel-start-{width}.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web" }).ClickAsync();
        await ScreenshotAsync($"arcane-wheel-overview-{width}.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Inspect Stormcaller sector", Exact = true }).ClickAsync();
        await Expect(active).ToHaveAttributeAsync("data-school", "Fire");
        await Page.WaitForFunctionAsync(@"() => {
            const badge = document.querySelector('.web-node[data-node-id=storm-major]').getBoundingClientRect();
            const map = document.querySelector('.arcane-web-viewport').getBoundingClientRect();
            return badge.left >= map.left && badge.right <= map.right && badge.top >= map.top && badge.bottom <= map.bottom;
        }");
        await ScreenshotAsync($"arcane-wheel-storm-sector-{width}.png");
        var stormLeaf = Page.Locator(".web-node[aria-label^='Overcharge.']");
        await stormLeaf.EvaluateAsync("el => el.click()");
        await Page.Locator(".route-action.refund").ClickAsync();
        var warning = Page.GetByRole(AriaRole.Dialog);
        await Expect(warning).ToBeVisibleAsync();
        await ScreenshotAsync($"arcane-wheel-refund-warning-{width}.png");
        await warning.GetByRole(AriaRole.Button, new() { Name = "Cancel", Exact = true }).ClickAsync();
        await Expect(stormLeaf).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("selected"));
        await Page.Locator(".route-action.refund").ClickAsync();
        await warning.GetByRole(AriaRole.Button, new() { Name = "Refund points", Exact = true }).ClickAsync();
        await Expect(warning).ToHaveCountAsync(0);
        // An accepted warning covers subsequent refunds during this visit.
        await Page.Locator(".web-node[aria-label^='Surge.']").EvaluateAsync("el => el.click()");
        await Page.Locator(".route-action.refund").ClickAsync();
        await Expect(warning).ToHaveCountAsync(0);
        await Expect(Page.Locator(".reserved-points summary")).ToHaveTextAsync("2 reserved");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Research" }).ClickAsync();
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        await Page.Locator(".web-node[aria-label^='Static.']").EvaluateAsync("el => el.click()");
        await Page.Locator(".route-action.refund").ClickAsync();
        await Expect(warning).ToBeVisibleAsync();
        await warning.GetByRole(AriaRole.Button, new() { Name = "Cancel", Exact = true }).ClickAsync();
        // Refund-all must ask too; cancelling does not acknowledge the warning.
        await Page.Locator(".loadout-strip > summary").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Refund all learned Arcane points" }).ClickAsync();
        await Expect(warning).ToBeVisibleAsync();
        await warning.GetByRole(AriaRole.Button, new() { Name = "Cancel", Exact = true }).ClickAsync();
        await Expect(Page.Locator(".web-node[aria-label^='Static.']")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("selected"));
        await Expect(Page.Locator(".web-node[aria-label^='Spark.']")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("selected"));
        await Page.Locator(".route-action.refund").ClickAsync();
        await warning.GetByRole(AriaRole.Button, new() { Name = "Refund points", Exact = true }).ClickAsync();
        await Expect(warning).ToHaveCountAsync(0);
        await Expect(Page.Locator(".reserved-points summary")).ToHaveTextAsync("3 reserved");
        await Expect(Page.Locator(".web-node[aria-label^='Spark.']")).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("selected"));
        await Page.ReloadAsync(new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        await Expect(Page.Locator(".reserved-points summary")).ToHaveTextAsync("3 reserved");
        await Page.Locator(".web-node[aria-label^='Surge.']").EvaluateAsync("el => el.click()");
        await Expect(Page.Locator(".node-inspector")).ToContainTextAsync("OTHER SCHOOL");
        await Expect(Page.Locator(".route-action.allocate")).ToHaveCountAsync(0);
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= innerWidth + 1"));
        await ScreenshotAsync($"arcane-wheel-reserved-{width}.png");
    }

    [TestMethod]
    [DataRow("Cryomancer", "Frost")]
    [DataRow("Stormcaller", "Storm")]
    [DataRow("Arcanist", "Arcane")]
    public async Task ArcaneWheel_SavedSchoolRemainsNorthWhenBrowsing(string school, string sector)
    {
        await Page.SetViewportSizeAsync(390, 844);
        await OpenAsync(school);
        await OpenTownBuildingAsync("Arcane Nexus");
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        var active = Page.Locator(".wheel-school-badge[data-active='true']");
        await Expect(active).ToHaveAttributeAsync("data-school", sector);
        Assert.IsTrue(await active.EvaluateAsync<bool>("el => el.style.left === '1600px' && el.style.top === '280px'"));
        await Page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Inspect Pyromancer sector", Exact = true }).ClickAsync();
        await Expect(active).ToHaveAttributeAsync("data-school", sector);
        await Page.Locator(".web-node[aria-label^='Spark.']").EvaluateAsync("el => el.click()");
        await Expect(Page.Locator(".node-inspector")).ToContainTextAsync("OTHER SCHOOL");
        await Expect(Page.Locator(".route-action.allocate")).ToHaveCountAsync(0);
        Assert.AreEqual(school, await Page.EvaluateAsync<string>("() => localStorage.getItem('wyrmforge.characterSchool.v1')"));
        await ScreenshotAsync($"arcane-wheel-{sector.ToLowerInvariant()}-north.png");
    }

    private async Task OpenAsync(string school = "Arcanist")
    {
        // Existing gameplay tests represent established accounts, not the new First Hunt tutorial.
        await Page.AddInitScriptAsync($"localStorage.setItem('wyrmforge.firstHunt.v1','2'); localStorage.setItem('wyrmforge.arcaneBuild.v1', JSON.stringify({{ Budget:24, Nodes:[] }})); localStorage.setItem('wyrmforge.essenceVault', JSON.stringify(['CinderHeart'])); localStorage.setItem('wyrmforge.characterSchool.v1','{school}');");
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
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_DebugReset_CancelPreservesCharacterAndConfirmStartsFresh(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"if (!sessionStorage.getItem('other-project.reset-fixture')) {
            sessionStorage.setItem('other-project.reset-fixture','keep');
            sessionStorage.setItem('wyrmforge.debug-session','remove');
            localStorage.setItem('other-project.save','keep');
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Arcanist');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:24,Nodes:['arcane-start']}));
            localStorage.setItem('wyrmforge.future-save.v99','remove');
        }");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownIfNeededAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Reset character", Exact = true }).ClickAsync();
        var dialog = Page.GetByRole(AriaRole.Dialog, new() { Name = "Reset this character?" });
        await Expect(dialog).ToBeVisibleAsync();
        await ScreenshotAsync($"debug-reset-confirm-{width}.png");
        await dialog.GetByRole(AriaRole.Button, new() { Name = "Cancel", Exact = true }).ClickAsync();
        await Expect(dialog).Not.ToBeVisibleAsync();
        Assert.AreEqual("Arcanist", await Page.EvaluateAsync<string>("localStorage.getItem('wyrmforge.characterSchool.v1')"));
        await Page.GetByRole(AriaRole.Button, new() { Name = "Reset character", Exact = true }).ClickAsync();
        await dialog.GetByRole(AriaRole.Button, new() { Name = "Reset everything", Exact = true }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true })).ToBeVisibleAsync();
        Assert.IsTrue(await Page.EvaluateAsync<bool>(@"() =>
            !localStorage.getItem('wyrmforge.firstHunt.v1') && !localStorage.getItem('wyrmforge.characterSchool.v1') &&
            !localStorage.getItem('wyrmforge.arcaneBuild.v1') && !localStorage.getItem('wyrmforge.future-save.v99') &&
            !sessionStorage.getItem('wyrmforge.debug-session') && localStorage.getItem('other-project.save') === 'keep' &&
            sessionStorage.getItem('other-project.reset-fixture') === 'keep' && !location.search"));
        await ScreenshotAsync($"debug-reset-welcome-{width}.png");
        await Page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Choose your magic" })).ToBeVisibleAsync();
    }

    private async Task AssertArcanePathsClearAsync()
    {
        var issues = await Page.EvaluateAsync<string[]>(@"() => {
            const nodes = [...document.querySelectorAll('.web-node')].map(n => ({ id:n.dataset.nodeId,
                x:parseFloat(n.style.left), y:parseFloat(n.style.top), radius:n.offsetWidth/2 }));
            const edges = [...document.querySelectorAll('.web-connections path')].map(e => {
                const numbers = e.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
                return { from:e.dataset.from, to:e.dataset.to,
                    points:Array.from({length:numbers.length/2},(_,i) => ({x:numbers[i*2],y:numbers[i*2+1]})) };
            });
            const issues = [];
            const cross = (a,b) => a.x*b.y-a.y*b.x;
            const sub = (a,b) => ({x:a.x-b.x,y:a.y-b.y});
            const segments = e => e.points.slice(1).map((b,i) => [e.points[i],b]);
            for (const e of edges) for (const [a,b] of segments(e)) for (const n of nodes) {
                if (n.id === e.from || n.id === e.to) continue;
                const dx=b.x-a.x,dy=b.y-a.y;
                const t=Math.max(0,Math.min(1,((n.x-a.x)*dx+(n.y-a.y)*dy)/(dx*dx+dy*dy)));
                if (Math.hypot(n.x-a.x-t*dx,n.y-a.y-t*dy) < n.radius+6)
                    issues.push(`${e.from}/${e.to} runs through ${n.id}`);
            }
            for (let i=0;i<edges.length;i++) for (const f of edges.slice(i+1)) {
                const e=edges[i], shared=nodes.filter(n => [e.from,e.to].includes(n.id) && [f.from,f.to].includes(n.id));
                for (const [a,b] of segments(e)) for (const [c,d] of segments(f)) {
                    const r=sub(b,a),q=sub(d,c),den=cross(r,q);
                    if (Math.abs(den)<0.001) continue;
                    const t=cross(sub(c,a),q)/den,u=cross(sub(c,a),r)/den;
                    if(t<0||t>1||u<0||u>1) continue;
                    const x=a.x+t*r.x,y=a.y+t*r.y;
                    if(!shared.some(n => Math.hypot(x-n.x,y-n.y)<1)) issues.push(`${e.from}/${e.to} crosses ${f.from}/${f.to}`);
                }
            }
            return [...new Set(issues)];
        }");
        Assert.AreEqual(0, issues.Length, string.Join("; ", issues));
    }

}
