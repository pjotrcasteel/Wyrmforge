using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class EngineLabsBrowserTests : PageTest
{
    private static string BaseUrl => (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ??
        "http://127.0.0.1:4173/").TrimEnd('/');

    [TestMethod]
    public async Task Hub_NavigatesEveryEngineWithoutPretendingPendingLabsAreAccepted()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync($"{BaseUrl}/engine-labs");

        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Engine Development Labs" }))
            .ToBeVisibleAsync();

        foreach (var engine in new[] { "ai", "lighting", "animation", "gameplay", "visual-physics", "vfx", "audio" })
        {
            await Page.GotoAsync($"{BaseUrl}/engine-labs/{engine}");
            await Expect(Page.Locator("nav[aria-label='Engine labs'] a[aria-current='page']"))
                .ToHaveAttributeAsync("href", $"engine-labs/{engine}");
            if (engine != "ai")
            {
                await Expect(Page.GetByText("Dedicated", new() { Exact = false }).First)
                    .ToBeVisibleAsync();
                await Expect(Page.Locator("iframe")).ToHaveCountAsync(0);
            }
        }
    }

    [TestMethod]
    public async Task AiLab_PresetsSelectActualSeededSimulationAndKeepMobileNavigation()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync($"{BaseUrl}/engine-labs/ai");

        var preview = Page.Locator("iframe[title='Live authoritative engine preview']");
        await Expect(preview).ToHaveAttributeAsync("src",
            "enemy-lab?kind=MireHound&tier=3&count=8&autoplay=false&cast=false&seed=42");

        await Page.GetByLabel("Replay seed").FillAsync("927");
        await Page.GetByLabel("Scenario").SelectOptionAsync("boss");
        await Expect(preview).ToHaveAttributeAsync("src",
            "hunt-lab?wyrm=Ashfang&ai5=true&phase=2&play=true&cast=false&invulnerable=true&seed=927");

        await Page.GetByLabel("Scenario").SelectOptionAsync("civilian");
        await Expect(preview).ToHaveAttributeAsync("src", "?townAi2=1");
        await Expect(Page.GetByTestId("ai-lab-notes")).ToContainTextAsync("seed field does not override");
        await Expect(Page.Locator("nav[aria-label='Engine labs'] a")).ToHaveCountAsync(8);
    }
    [TestMethod]
    public async Task TacticalPack_390pxInspector_DoesNotExpandDocumentToTraceWidth()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync($"{BaseUrl}/enemy-lab?kind=MireHound&tier=3&count=8&autoplay=false&cast=false&seconds=6");

        var refresh = Page.GetByRole(AriaRole.Button, new() { Name = "Refresh AI inspector" });
        await Expect(refresh).ToBeVisibleAsync();
        await Page.EvaluateAsync("async () => { window.aiViewport = await import('./js/arena.js'); }");
        await Page.WaitForFunctionAsync(
            "() => window.aiViewport.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'))?.hud?.seconds >= 6",
            null, new() { Timeout = 45000 });
        await refresh.ClickAsync();
        await Expect(Page.GetByTestId("agent-performance")).ToContainTextAsync("MaxCommittedThreats");
        await Expect(Page.GetByTestId("agent-inspector")).ToContainTextAsync("MireHound");

        var scrollWidth = await Page.EvaluateAsync<int>("() => document.documentElement.scrollWidth");
        Assert.IsLessThanOrEqualTo(391, scrollWidth,
            "AI debug output must stay inside the real 390px viewport instead of expanding to 10,000px.");
    }

    [TestMethod]
    public async Task AiLab_LinksRespectGitHubPagesBasePath()
    {
        await Page.GotoAsync($"{BaseUrl}/engine-labs/ai");

        var nav = Page.Locator("nav[aria-label='Engine labs'] a[aria-current='page']");
        await Expect(nav).ToHaveAttributeAsync("href", "engine-labs/ai");
        var frame = Page.Locator("iframe[title='Live authoritative engine preview']");
        await Expect(frame).ToHaveAttributeAsync("src",
            "enemy-lab?kind=MireHound&tier=3&count=8&autoplay=false&cast=false&seed=42");

        // A relative path is required: publishing rewrites <base href="/"> to
        // <base href="/Wyrmforge/">, and absolute paths would bypass the app.
        var rootRelativeLink = await nav.GetAttributeAsync("href");
        var rootRelativeFrame = await frame.GetAttributeAsync("src");
        Assert.IsFalse(rootRelativeLink!.StartsWith('/'));
        Assert.IsFalse(rootRelativeFrame!.StartsWith('/'));
    }

    [TestMethod]
    public async Task AiLab_390px_EmbedsRealEncounterAndNavigatesBetweenEngines()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync($"{BaseUrl}/engine-labs/ai");

        var liveEncounter = Page.FrameLocator("iframe[title='Live authoritative engine preview']");
        await Expect(liveEncounter.Locator("canvas[aria-label='Live enemy encounter']"))
            .ToBeVisibleAsync(new() { Timeout = 45000 });
        await Expect(liveEncounter.GetByRole(AriaRole.Heading, new() { Name = "Fire & Frost enemy lab" }))
            .ToBeVisibleAsync();

        var documentWidth = await Page.EvaluateAsync<int>("() => document.documentElement.scrollWidth");
        Assert.IsLessThanOrEqualTo(391, documentWidth,
            "The embedded simulation and engine switcher must not stretch a 390px device.");

        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ??
            Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, "engine-ai-lab-live-390.png"),
            FullPage = true
        });

        await Page.Locator("nav[aria-label='Engine labs'] a[href='engine-labs/lighting']").ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Lighting Lab" })).ToBeVisibleAsync();
        await Page.Locator("nav[aria-label='Engine labs'] a[href='engine-labs/ai']").ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "AI Lab" })).ToBeVisibleAsync();
    }
}
