using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>T2 in-game opt-in; reuse actual TownCrowd rather than implementing agent AI.</summary>
[TestClass]
public sealed class TownT2InGameBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task TownT2_OptInGpu3D_KeepsRealNpcForegroundAndHotspots(int width, int height)
    {
        var root=Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if(string.IsNullOrWhiteSpace(root))
        {
            Assert.Inconclusive("Requires a running WyrmForge app.");
            return;
        }
        var artifacts=Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(),"wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(width,height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');");
        await Page.GotoAsync(root.TrimEnd('/')+"/?town3d=1&townNpcCount=14",
            new(){WaitUntil=WaitUntilState.NetworkIdle});

        var start=Page.GetByRole(AriaRole.Button,new()
            {NameRegex=new System.Text.RegularExpressions.Regex("^START GAME")});
        await start.WaitForAsync(new(){State=WaitForSelectorState.Visible,Timeout=30000});
        await start.ClickAsync();
        await Expect(Page.Locator(".character-creation, .town-square")).ToBeVisibleAsync();
        if(await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button,new(){Name="Choose Pyromancer"}).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region,new(){Name="Town square"})).ToBeVisibleAsync();
        await Page.WaitForFunctionAsync("() => window.__town3dInGamePreview?.getState().ready===true");
        await Expect(Page.Locator("[data-town-3d-preview]")).ToHaveAttributeAsync("data-ready","true");

        var deviation=await Page.EvaluateAsync<double>(
            "() => window.__town3dInGamePreview.getState().referenceMae");
        Assert.IsTrue(deviation < 14,$"In-game GPU reconstruction must match the approved artwork (MAE {deviation}).");
        Assert.IsGreaterThan(0,await Page.Locator(".refuge-town-citizen").CountAsync(),
            "Use the real existing TownCrowd citizens instead of a fake AI/NPC clone.");
        Assert.AreEqual(5,await Page.Locator(".refuge-town-spot").CountAsync());
        await Expect(Page.Locator(".refuge-town-night-base")).ToBeVisibleAsync();
        // Real gameplay cutouts remain in the DOM and must finish extracting
        // the well roof and noticeboard from the approved painting. This is
        // the existing foot-depth system, not synthetic test-only actors.
        await Page.WaitForFunctionAsync(@"() =>
            ['well-roof','noticeboard-panel'].every(id =>
                document.querySelector('[data-town-cutout=""' + id + '""]')
                    ?.dataset.townPngReady === 'true')");
        Assert.IsTrue(await Page.Locator("[data-town-cutout][data-town-png-ready='true']").CountAsync() >= 2,
            "Well/noticeboard architectural alpha masks are required for NPC occlusion.");

        await Page.EvaluateAsync("() => window.wyrmforgeTown.show(1,false)");
        await Page.WaitForTimeoutAsync(150);
        await Page.ScreenshotAsync(new()
        {
            Path=Path.Combine(artifacts,$"t2-real-game-town3d-center-{width}x{height}.png"),
            FullPage=true
        });
        // The actual game deliberately remains night-only at this milestone;
        // standalone day-render validation must not revive the removed Day/Auto UI.
        Assert.AreEqual("night", await Page.EvaluateAsync<string>(
            "() => window.__town3dInGamePreview.getState().mode"));
        Assert.IsTrue(await Page.EvaluateAsync<bool>(
            "() => document.querySelector('.refuge-town-night-base').src.includes('/night-active.webp')"),
            "The approved in-game night painting must remain the authoritative visual state.");
        Assert.AreEqual(5, await Page.Locator(".refuge-town-spot").CountAsync());

    }
}
