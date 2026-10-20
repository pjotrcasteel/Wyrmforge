using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class AshlingBrowserTests : PageTest
{
    [TestMethod]
    public async Task Mobile_MovingAttack_TurnsWithTarget_KeepsPhase_AndPausesFullBody()
    {
        var baseUrl = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=Ashling&seed=42&autoplay=false&cast=false");
        await AttachDiagnosticsAsync();
        await Page.WaitForFunctionAsync(@"() => window.__ashlingArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'))?.ashling.entities.some(e=>e.clip==='attack'&&e.frame<4)");
        await Page.Locator(".enemy-lab canvas").FocusAsync();
        // Sample inside the page so browser round trips cannot skip the action.
        await Page.EvaluateAsync(@"() => {
            window.__turnSamples=[];
            window.__turnTimer=setInterval(()=>{
                const d=window.__ashlingArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));
                if(d.renderingFailed)throw new Error('Renderer failed during turn');
                window.__turnSamples.push(...d.ashling.entities.filter(e=>!e.layered&&e.clip==='attack'));
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
        const string read = "() => JSON.stringify(window.__ashlingArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas')).ashling.entities)";
        var before = await Page.EvaluateAsync<string>(read);
        await Page.WaitForTimeoutAsync(300);
        Assert.AreEqual(before, await Page.EvaluateAsync<string>(read));
    }

    [TestMethod]
    public async Task Mobile_Ashling_UsesApprovedWalkAttackAndHeldDeath_InRealCombat()
    {
        var baseUrl = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=Ashling&seed=42&autoplay=true&cast=false");
        await AttachDiagnosticsAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const canvas=document.querySelector('.enemy-lab canvas');if(!canvas)return false;
            const m=window.__ashlingArena;
            const d=m.readArenaDiagnostics(canvas);
            return d?.ashling.ready&&!d.renderingFailed&&d.ashling.entities.some(e=>e.clip==='walk'&&e.frame>0);
        }");
        await Page.ScreenshotAsync(new() { Path = Path.Combine(artifacts, "ashling-walk-390.png"), FullPage = true });
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=Ashling&seed=42&autoplay=false&cast=false");
        await AttachDiagnosticsAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const m=window.__ashlingArena;
            const d=m.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));
            return d?.ashling.entities.some(e=>e.clip==='attack'&&e.frame>=4&&e.frame<=9);
        }");
        await Page.ScreenshotAsync(new() { Path = Path.Combine(artifacts, "ashling-attack-390.png"), FullPage = true });
        await Page.GotoAsync(baseUrl + "/enemy-lab?kind=Ashling&seed=42&autoplay=true&cast=true");
        await AttachDiagnosticsAsync();
        await Page.WaitForFunctionAsync(@"() => {
            const canvas=document.querySelector('.enemy-lab canvas');if(!canvas)return false;
            const m=window.__ashlingArena;
            const d=m.readArenaDiagnostics(canvas);
            return d?.ashling.ready&&!d.renderingFailed&&d.ashling.corpses.some(e=>e.age>2&&e.age<3&&e.frame===27);
        }");
        await Page.ScreenshotAsync(new() { Path = Path.Combine(artifacts, "ashling-held-corpse-390.png"), FullPage = true });
        Assert.IsFalse(await Page.EvaluateAsync<bool>("() => localStorage.getItem('wyrmforge.firstHunt.v1') !== null"));
    }

    private async Task AttachDiagnosticsAsync()
    {
        await Page.Locator(".enemy-lab canvas").WaitForAsync();
        await Expect(Page.Locator("#wyrmforge-ignition")).ToBeHiddenAsync();
        await Page.EvaluateAsync("async () => { window.__ashlingArena=await import(new URL('js/arena.js',document.baseURI).href); }");
    }
}


