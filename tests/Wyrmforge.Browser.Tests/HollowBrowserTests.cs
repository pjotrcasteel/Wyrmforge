using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class HollowBrowserTests : PageTest
{
    [TestMethod]
    public async Task Mobile_MovingAttack_TurnsWithTarget_KeepsPhase_AndPausesBothLayers()
    {
        var baseUrl = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false");
        await AttachDiagnosticsAsync();
        await Page.WaitForFunctionAsync(@"() => window.__hollowArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'))?.hollow.entities.some(e=>e.clip==='attack'&&e.frame<4)");
        await Page.Locator(".enemy-lab canvas").FocusAsync();
        // Sample inside the page so browser round trips cannot skip the action.
        await Page.EvaluateAsync(@"() => {
            window.__turnSamples=[];
            window.__turnTimer=setInterval(()=>{
                const d=window.__hollowArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));
                if(d.renderingFailed)throw new Error('Renderer failed during turn');
                window.__turnSamples.push(...d.hollow.entities.filter(e=>e.layered&&e.clip==='attack'));
            },30);
        }");
        foreach (var key in new[] { "ArrowRight", "ArrowUp", "ArrowLeft" })
        {
            await Page.Keyboard.DownAsync(key);
            await Page.WaitForTimeoutAsync(260);
            await Page.Keyboard.UpAsync(key);
        }
        var advanced = await Page.EvaluateAsync<bool>(@"() => {
            clearInterval(window.__turnTimer);
            const samples=window.__turnSamples;
            return new Set(samples.map(e=>e.baseFrame)).size>2&&new Set(samples.map(e=>e.frame)).size>2&&new Set(samples.map(e=>e.direction)).size>1;
        }");
        Assert.IsTrue(advanced, "Walking and attack phases must advance while facing follows the turning player.");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Pause", Exact = true }).ClickAsync();
        await Page.WaitForTimeoutAsync(150);
        const string read = "() => JSON.stringify(window.__hollowArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas')).hollow.entities)";
        var before = await Page.EvaluateAsync<string>(read);
        await Page.WaitForTimeoutAsync(300);
        Assert.AreEqual(before, await Page.EvaluateAsync<string>(read));
    }

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
