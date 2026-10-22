using System.Text.Json;
using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

// Capture the *actual rendered game*, not another concept or mockup.
// These images are evidence for a separate human iPhone acceptance pass.
[TestClass]
public sealed class PyromancerVisualAcceptanceTests : PageTest
{
    private string BaseUrl => Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
    private string ArtifactDirectory => Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
        ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");

    [TestMethod]
    [DataRow(320, 568, "fire-spread-crown", "Crown of Ash", 2, "Detonation")]
    [DataRow(390, 844, "fire-spread-crown", "Crown of Ash", 2, "Detonation")]
    [DataRow(320, 568, "fire-ember-altar", "Heart of the Furnace", 3, "ScorchedEarth")]
    [DataRow(390, 844, "fire-ember-altar", "Heart of the Furnace", 3, "ScorchedEarth")]
    public async Task FireMajor_WebAndSocket_AreUsableOnPortraitPhones(
        int width, int height, string majorId, string landmark, int mutationId, string mutationName)
    {
        await Page.SetViewportSizeAsync(width, height);
        var nodes = majorId == "fire-spread-crown"
            ? new[] { "fire-start", "fire-1", "fire-ember-drift", "fire-scorching-winds",
                "fire-cinder-halo", "fire-conflagration", "fire-ashfront", "fire-spread-crown" }
            : new[] { "fire-start", "fire-1", "fire-cinder-temper", "fire-frost-gate",
                "fire-burning-veins", "fire-searing-focus", "fire-immolation", "fire-coalbed", "fire-ember-altar" };
        var build = JsonSerializer.Serialize(new { Budget = 24, Nodes = nodes });
        var core = JsonSerializer.Serialize(new { Level = 5, Discovered = new[] { mutationId },
            Slots = new int?[] { mutationId, null, null, null, null } });

        // Seed only once. Reload must not overwrite the persisted socket binding.
        var script = "if (!localStorage.getItem('fireVisualEvidenceSeeded')) {"
            + "localStorage.setItem('fireVisualEvidenceSeeded','1');"
            + "localStorage.setItem('wyrmforge.firstHunt.v1','3');"
            + "localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');"
            + "localStorage.setItem('wyrmforge.arcaneBuild.v1'," + JsonSerializer.Serialize(build) + ");"
            + "localStorage.setItem('wyrmforge.fireballCore.v1'," + JsonSerializer.Serialize(core) + ");"
            + "}";
        await Page.AddInitScriptAsync(script);
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownAsync();
        await OpenWebAsync();

        var stage = Page.Locator(".atlas-stage");
        await Expect(stage).ToBeVisibleAsync();
        await Expect(Page.Locator(".web-region-label")).ToHaveCountAsync(2);
        await Expect(Page.Locator(".web-node[data-tier='major'][data-node-id='" + majorId + "']")).ToHaveCountAsync(1);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Inspect Pyromancer sector" }).ClickAsync();
        await CaptureAsync($"pyromancer-major-map-{majorId}-{width}.png");

        // Programmatic node inspection avoids pretending the whole 3200px map is visible.
        // Actual gestures and minimum hit-target sizes are tested by the general mobile suite.
        await Page.Locator($".web-node[data-node-id='{majorId}']").EvaluateAsync("el => el.click()");
        var inspector = Page.Locator(".node-inspector.open");
        await Expect(inspector).ToBeVisibleAsync();
        await Expect(inspector.Locator("h2")).ToHaveTextAsync(landmark);
        var selector = inspector.Locator(".web-amplifier-socket select");
        await Expect(selector).ToBeEnabledAsync();
        await Expect(selector.Locator($"option[value='{mutationName}']")).ToHaveCountAsync(1);
        Assert.IsTrue(await selector.EvaluateAsync<bool>(@"el => {
            const rect = el.getBoundingClientRect();
            const stage = document.querySelector('.atlas-stage').getBoundingClientRect();
            const inspector = el.closest('.node-inspector').getBoundingClientRect();
            return rect.width >= 160 && rect.height >= 44
                && inspector.left >= stage.left - 2 && inspector.right <= stage.right + 2;
        }"), "Mutation socket must remain tappable and inside the Fire Web frame.");

        await selector.SelectOptionAsync(mutationName);
        await Expect(selector).ToHaveValueAsync(mutationName);
        var persisted = await Page.EvaluateAsync<string>(
            "() => localStorage.getItem('wyrmforge.arcaneBuild.v1') ?? ''");
        StringAssert.Contains(persisted, majorId);
        StringAssert.Contains(persisted, mutationName);
        await CaptureAsync($"pyromancer-major-socket-{majorId}-{width}.png");

        await Page.ReloadAsync(new PageReloadOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await EnterTownAsync();
        await OpenWebAsync();
        await Page.Locator($".web-node[data-node-id='{majorId}']").EvaluateAsync("el => el.click()");
        await Expect(Page.Locator(".web-amplifier-socket select")).ToHaveValueAsync(mutationName);
    }

    private async Task EnterTownAsync()
    {
        var start = Page.GetByRole(AriaRole.Button,
            new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 30000 });
        await start.ClickAsync();
        await Expect(Page.Locator(".character-creation, .town-square")).ToBeVisibleAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        await Expect(Page.Locator(".town-square")).ToBeVisibleAsync();
    }

    private async Task OpenWebAsync()
    {
        await Page.Locator(".refuge-town-spot--nexus").ClickAsync();
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web" }).ClickAsync();
        await Expect(Page.Locator(".atlas-stage")).ToBeVisibleAsync();
    }

    private async Task CaptureAsync(string filename)
    {
        Directory.CreateDirectory(ArtifactDirectory);
        await Page.ScreenshotAsync(new PageScreenshotOptions
        {
            Path = Path.Combine(ArtifactDirectory, filename),
            FullPage = false,
        });
    }
}
