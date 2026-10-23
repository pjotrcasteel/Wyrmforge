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
        // The Fire sector is already active. Its large outer emblem is intentionally offscreen
        // at phone detail zoom; clicking it here would fail without testing the major socket.
        await Expect(Page.Locator(".wheel-school-badge[data-school='Fire'][data-active='true']")).ToHaveCountAsync(1);

        // Focusing the actual major first centers that landmark in the world-space map.
        // Close its inspector for a clean image before capturing the separate socket state.
        var node = Page.Locator($".web-node[data-node-id='{majorId}']");
        await node.EvaluateAsync("el => el.click()");
        await Expect(Page.Locator(".node-inspector.open")).ToBeVisibleAsync();
        await Page.Locator(".node-inspector.open .inspector-close").ClickAsync();
        await stage.ScrollIntoViewIfNeededAsync();
        await CaptureAsync($"pyromancer-major-map-{majorId}-{width}.png");

        // Existing gesture tests cover touch pan/zoom. This test examines a focused major
        // and proves the real persisted socket works without requiring a 3200px-wide screen.
        await node.EvaluateAsync("el => el.click()");
        var inspector = Page.Locator(".node-inspector.open");
        await Expect(inspector).ToBeVisibleAsync();
        await Expect(inspector.Locator("h2")).ToHaveTextAsync(landmark);
        var selector = inspector.Locator(".web-amplifier-socket select");
        await Expect(selector).ToBeEnabledAsync();
        await Expect(selector.Locator($"option[value='{mutationName}']")).ToHaveCountAsync(1);
        // On phones the inspector follows the map in document flow, not inside
        // .atlas-stage. Validate the actual tap target and viewport instead.
        await selector.ScrollIntoViewIfNeededAsync();
        Assert.IsTrue(await selector.EvaluateAsync<bool>(@"el => {
            const rect = el.getBoundingClientRect();
            const inspector = el.closest('.node-inspector').getBoundingClientRect();
            return rect.width >= 160 && rect.height >= 44
                && rect.left >= inspector.left - 2 && rect.right <= inspector.right + 2
                && rect.left >= -2 && rect.right <= document.documentElement.clientWidth + 2
                && rect.top >= -2 && rect.bottom <= window.innerHeight + 2;
        }"), "Mutation socket must fit the phone viewport and provide a 44px tap target.");
        // Trial click verifies the actual select is interactable, not merely sized.
        await selector.ClickAsync(new LocatorClickOptions { Trial = true });

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
