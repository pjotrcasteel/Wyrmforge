using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class ArcaneTouchCompatibilityTests : BrowserTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Web_TouchPanTapAndDebugReset_WorkAtPhoneSize(int width, int height)
    {
        await using var context = await Browser.NewContextAsync(new()
        {
            ViewportSize = new() { Width = width, Height = height }, HasTouch = true, IsMobile = true,
        });
        await context.AddInitScriptAsync(@"if (!sessionStorage.getItem('compat-fixture')) {
            sessionStorage.setItem('compat-fixture','keep');
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Arcanist');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:24,Nodes:[]}));
        }");
        var page = await context.NewPageAsync();
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await page.GotoAsync(baseUrl.TrimEnd('/') + "/?debugResetFixture=1");
        await Expect(page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true })).ToBeVisibleAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true }).ClickAsync();
        await Expect(page.Locator(".town-square")).ToBeVisibleAsync();
        await page.Locator(".refuge-town-spot--nexus").ClickAsync();
        await page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        var viewport = page.GetByRole(AriaRole.Region, new() { Name = "Arcane specialization map" });
        await viewport.ScrollIntoViewIfNeededAsync();
        var node = page.Locator(".web-node[data-node-id='arcane-1']");
        var box = await node.BoundingBoxAsync();
        Assert.IsNotNull(box);
        // Native tap exercises the engine's Touch + Pointer + compatibility-click ordering.
        await page.Touchscreen.TapAsync(box.X + box.Width / 2, box.Y + box.Height / 2);
        await Expect(page.Locator(".node-inspector.open")).ToBeVisibleAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Close node inspector" }).ClickAsync();
        await viewport.ScrollIntoViewIfNeededAsync();
        var before = await page.Locator(".arcane-web-canvas").GetAttributeAsync("style");
        var scrollY = await page.EvaluateAsync<double>("window.scrollY");
        // Playwright exposes native tap but no native WebKit swipe. Exercise the
        // touch-shaped DOM events in that engine; trusted swipe/pinch runs in Chromium.
        // WebKit does not expose a public Touch constructor.
        await node.EvaluateAsync(@"async target => {
            const r=target.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
            const send=(type,dx,dy) => {
                const finger={identifier:7,clientX:x+dx,clientY:y+dy};
                const event=new Event(type,{bubbles:true,cancelable:true});
                Object.defineProperties(event,{touches:{value:type==='touchend'?[]:[finger]},changedTouches:{value:[finger]}});
                target.dispatchEvent(event);
            };
            send('touchstart',0,0);
            for(let i=1;i<=4;i++) { send('touchmove',i*12,i*10); await new Promise(requestAnimationFrame); }
            send('touchend',48,40);
        }");
        await Expect(page.Locator(".arcane-web-canvas")).Not.ToHaveAttributeAsync("style", before!);
        await Expect(page.Locator(".node-inspector.open")).ToHaveCountAsync(0);
        Assert.AreEqual(scrollY, await page.EvaluateAsync<double>("window.scrollY"), 1);
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.GetTempPath();
        Directory.CreateDirectory(artifacts);
        await page.ScreenshotAsync(new() { Path = Path.Combine(artifacts, $"arcane-touch-{width}.png"), FullPage = true });
        await page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Reset character", Exact = true }).ClickAsync();
        var dialog = page.GetByRole(AriaRole.Dialog, new() { Name = "Reset this character?" });
        await Expect(dialog).ToBeVisibleAsync();
        await dialog.GetByRole(AriaRole.Button, new() { Name = "Reset everything", Exact = true }).ClickAsync();
        await Expect(page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true })).ToBeVisibleAsync();
        Assert.AreEqual(string.Empty, new Uri(page.Url).Query);
        await page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true }).ClickAsync();
        await Expect(page.GetByRole(AriaRole.Heading, new() { Name = "Choose your magic" })).ToBeVisibleAsync();
    }
}
