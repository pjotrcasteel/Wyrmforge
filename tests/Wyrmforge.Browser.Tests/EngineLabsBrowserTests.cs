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
                .ToHaveAttributeAsync("href", $"/engine-labs/{engine}");
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
            "/enemy-lab?kind=MireHound&tier=3&count=8&autoplay=false&cast=false&seed=42");

        await Page.GetByLabel("Replay seed").FillAsync("927");
        await Page.GetByLabel("Scenario").SelectOptionAsync("boss");
        await Expect(preview).ToHaveAttributeAsync("src",
            "/hunt-lab?wyrm=Ashfang&ai5=true&phase=2&play=true&cast=false&invulnerable=true&seed=927");

        await Page.GetByLabel("Scenario").SelectOptionAsync("civilian");
        await Expect(preview).ToHaveAttributeAsync("src", "/?townAi2=1");
        await Expect(Page.GetByTestId("ai-lab-notes")).ToContainTextAsync("seed field does not override");
        await Expect(Page.Locator("nav[aria-label='Engine labs'] a")).ToHaveCountAsync(8);
    }
}
