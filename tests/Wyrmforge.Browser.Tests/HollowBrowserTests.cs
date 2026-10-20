using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class HollowBrowserTests : PageTest
{
    [TestMethod]
    public async Task Mobile_Hollow_UsesApprovedWalkAttackAndHeldDeath_InRealCombat()
    {
        var baseUrl = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=Hollow&seed=42&autoplay=true&cast=false");
        await AttachDiagnosticsAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const canvas=document.querySelector('.enemy-lab canvas');if(!canvas)return false;
            const m=window.__hollowArena;
            const d=m.readArenaDiagnostics(canvas);
            return d?.hollow.ready&&!d.renderingFailed&&d.hollow.entities.some(e=>e.clip==='walk'&&e.frame>0);
        }");
        await Page.ScreenshotAsync(new() { Path = Path.Combine(artifacts, "hollow-walk-390.png"), FullPage = true });
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false");
        await AttachDiagnosticsAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const m=window.__hollowArena;
            const d=m.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));
            return d?.hollow.entities.some(e=>e.clip==='attack'&&e.frame>=4&&e.frame<=9);
        }");
        await Page.ScreenshotAsync(new() { Path = Path.Combine(artifacts, "hollow-attack-390.png"), FullPage = true });
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=true");
        await AttachDiagnosticsAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const canvas=document.querySelector('.enemy-lab canvas');if(!canvas)return false;
            const m=window.__hollowArena;
            const d=m.readArenaDiagnostics(canvas);
            return d?.hollow.ready&&!d.renderingFailed&&d.hollow.corpses.some(e=>e.age>2&&e.age<3&&e.frame===23);
        }");
        await Page.ScreenshotAsync(new() { Path = Path.Combine(artifacts, "hollow-held-corpse-390.png"), FullPage = true });
        Assert.IsFalse(await Page.EvaluateAsync<bool>("() => localStorage.getItem('wyrmforge.firstHunt.v1') !== null"));
    }

    private async Task AttachDiagnosticsAsync()
    {
        await Page.Locator(".enemy-lab canvas").WaitForAsync();
        await Expect(Page.Locator("#wyrmforge-ignition")).ToBeHiddenAsync();
        await Page.EvaluateAsync("async () => { window.__hollowArena=await import(new URL('js/arena.js',document.baseURI).href); }");
    }
}
