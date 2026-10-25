using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>Non-destructive T0 screenshots of the production Town, not the GPU proof scene.</summary>
[TestClass]
public sealed class TownT0BaselineBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    [DataRow(1280, 800)]
    public async Task TownT0_CanonicalDistricts_CaptureRuntimeBaseline(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires the running WyrmForge app."); return; }
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');");
        await Page.GotoAsync(root.TrimEnd('/') + "/?townNpcCount=14", new() { WaitUntil = WaitUntilState.NetworkIdle });
        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 30000 });
        await start.ClickAsync();
        await Expect(Page.Locator(".character-creation, .town-square")).ToBeVisibleAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
        await Expect(Page.Locator(".refuge-canonical-scene .refuge-town-night-base")).ToBeVisibleAsync();
        await Page.Locator(".refuge-town-night-base").EvaluateAsync("img => img.decode()");
        var view = Page.Locator(".refuge-canonical-viewport");
        foreach (var (district, index) in new[] { ("west", 0), ("center", 1), ("east", 2) })
        {
            await view.EvaluateAsync("(el, district) => window.wyrmforgeTown.show(district, false)", index);
            await Page.WaitForTimeoutAsync(150);
            await Page.ScreenshotAsync(new()
            {
                Path = Path.Combine(artifacts, $"t0-town-{district}-{width}x{height}.png"),
                FullPage = true
            });
        }
        Assert.AreEqual(5, await Page.Locator(".refuge-town-spot").CountAsync(),
            "Four building hotspots and the World Gate must remain available.");
    }
    [TestMethod]
    [DataRow(0, "vacant")]
    [DataRow(3, "active")]
    public async Task TownT0_CanonicalBuildingStates_CaptureUnmodifiedRuntime(int firstHunt, string expectedNexusState)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires the running WyrmForge app."); return; }
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync($@"localStorage.setItem('wyrmforge.firstHunt.v1','{firstHunt}');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');");
        await Page.GotoAsync(root, new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownForBaselineAsync();

        await Expect(Page.Locator(".refuge-town-spot--nexus")).ToHaveAttributeAsync("data-town-state", expectedNexusState);
        var states = await Page.EvaluateAsync<string>(@"() => JSON.stringify(
            [...document.querySelectorAll('.refuge-town-spot[data-town-building]')].map(el => ({
                id: el.dataset.townBuilding, state: el.dataset.townState, label: el.getAttribute('aria-label')
            })))");
        await File.WriteAllTextAsync(Path.Combine(artifacts, $"t0-building-states-{expectedNexusState}-390.json"), states);
        Assert.AreEqual(4, await Page.Locator(".refuge-town-spot[data-town-building]").CountAsync());

        foreach (var (district, index) in new[] { ("west", 0), ("east", 2) })
        {
            await Page.EvaluateAsync("(i) => window.wyrmforgeTown.show(i, false)", index);
            await Page.WaitForTimeoutAsync(150);
            await Page.ScreenshotAsync(new()
            {
                Path = Path.Combine(artifacts, $"t0-buildings-{expectedNexusState}-{district}-390.png"),
                FullPage = true
            });
        }
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task TownT0_FourteenNpcOcclusion_CaptureFramesAndHeadlessFrameTimes(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires the running WyrmForge app."); return; }
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');");
        await Page.GotoAsync(root.TrimEnd('/') + "/?townNpcCount=14&townMetrics=1",
            new() { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownForBaselineAsync();
        await Page.EvaluateAsync("() => window.wyrmforgeTown.show(1, false)");
        await Page.WaitForTimeoutAsync(200);
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(artifacts, $"t0-npc-14-early-{width}x{height}.png"),
            FullPage = true
        });

        var measurements = await Page.EvaluateAsync<string>(@"async () => {
            const samples = await new Promise(resolve => {
                const durations = [];
                let previous = null;
                const frame = (now) => {
                    if (previous !== null) durations.push(now - previous);
                    previous = now;
                    if (durations.length >= 90) resolve(durations);
                    else requestAnimationFrame(frame);
                };
                requestAnimationFrame(frame);
            });
            samples.sort((a, b) => a - b);
            return JSON.stringify({
                context: 'headless Chromium CI, not a physical mobile FPS measurement',
                innerWidth, innerHeight, sampleCount: samples.length,
                medianFrameMs: samples[45], p95FrameMs: samples[85],
                visibleNpcDomCount: document.querySelectorAll('.refuge-town-citizen').length,
                buildingStates: [...document.querySelectorAll('[data-town-building]')]
                    .map(el => ({ id: el.dataset.townBuilding, state: el.dataset.townState }))
            });
        }");
        await File.WriteAllTextAsync(Path.Combine(artifacts, $"t0-npc-14-metrics-{width}x{height}.json"), measurements);
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(artifacts, $"t0-npc-14-late-{width}x{height}.png"),
            FullPage = true
        });
    }

    private async Task EnterTownForBaselineAsync()
    {
        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 30000 });
        await start.ClickAsync();
        await Expect(Page.Locator(".character-creation, .town-square")).ToBeVisibleAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
        await Page.Locator(".refuge-town-night-base").EvaluateAsync("img => img.decode()");
    }

}
