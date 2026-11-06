using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class ProgressionV13Tests : BrowserTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task RealWeb_SwitchRefundAndReload_PreservesProgress(int width, int height)
    {
        await using var context = await Browser.NewContextAsync(new()
        {
            ViewportSize = new() { Width = width, Height = height }, HasTouch = true, IsMobile = true,
            ReducedMotion = ReducedMotion.Reduce,
        });
        // Existing-hunter fixture, not proof of a freshly earned Hunt victory.
        await context.AddInitScriptAsync(@"if (!sessionStorage.getItem('progression-v13')) {
            sessionStorage.setItem('progression-v13','1');
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:24,Nodes:['fire-start','fire-1','fire-2']}));
        }");
        var page = await context.NewPageAsync();
        await page.GotoAsync(Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/");
        await page.GetByRole(AriaRole.Button, new() { Name = "START GAME", Exact = true }).ClickAsync();
        await page.Locator(".refuge-town-spot--nexus").ClickAsync();
        await page.GetByRole(AriaRole.Tab, new() { Name = "Arcane Web", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web", Exact = true }).ClickAsync();
        await Capture(page, $"web-{width}-overview");
        await page.Locator("[data-node-id='fire-ember-covenant']").ClickAsync();
        await Expect(page.Locator(".node-inspector.open")).ToContainTextAsync("Ember Covenant");
        await Capture(page, $"web-{width}-grand-goal");
        await page.GetByRole(AriaRole.Button, new() { Name = "Close node inspector" }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Inspect Cryomancer sector", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Activate school", Exact = true }).ClickAsync();
        await Expect(page.Locator("[data-school='Frost']")).ToHaveAttributeAsync("data-active", "true");
        Assert.AreEqual("Cryomancer", await page.EvaluateAsync<string>("localStorage.getItem('wyrmforge.characterSchool.v1')"));
        var saved = await page.EvaluateAsync<string>("localStorage.getItem('wyrmforge.arcaneBuild.v1')");
        StringAssert.Contains(saved, "fire-2");
        await page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web", Exact = true }).ClickAsync();
        await page.Locator("[data-node-id='fire-2']").ClickAsync();
        await Expect(page.Locator(".node-inspector.open")).ToContainTextAsync("Dormant:");
        await Capture(page, $"web-{width}-dormant");
        await page.GetByRole(AriaRole.Button, new() { Name = "Refund node", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Refund points", Exact = true }).ClickAsync();
        var after = await page.EvaluateAsync<string>("localStorage.getItem('wyrmforge.arcaneBuild.v1')");
        Assert.IsFalse(after.Contains("fire-2", StringComparison.Ordinal));
        StringAssert.Contains(after, "fire-1");
        await page.ReloadAsync();
        Assert.AreEqual(after, await page.EvaluateAsync<string>("localStorage.getItem('wyrmforge.arcaneBuild.v1')"));
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task RealCombat_FireEvolutionFixture_RendersWithoutSavingProgress(int width, int height)
    {
        var folder = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.GetTempPath();
        Directory.CreateDirectory(folder);
        await using var context = await Browser.NewContextAsync(new()
        {
            ViewportSize = new() { Width = width, Height = height }, HasTouch = true, IsMobile = true,
            RecordVideoDir = folder, RecordVideoSize = new() { Width = width, Height = height },
        });
        var page = await context.NewPageAsync();
        var errors = new List<string>();
        page.PageError += (_, error) => errors.Add(error);
        var url = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await page.GotoAsync(url.TrimEnd('/') + "/hunt-lab?wyrm=Ashfang&ascendant=false&loadout=fire-evolution&invulnerable=false&seed=1337");
        await Expect(page.Locator(".hunt-lab-canvas")).ToBeVisibleAsync();
        await Expect(page.GetByText("DEVELOPER FIXTURE", new() { Exact = false })).ToBeVisibleAsync();
        await page.EvaluateAsync(@"async () => {
            const canvas = document.querySelector('.hunt-lab-canvas');
            window.progressionRuntime = await import(canvas.dataset.arenaModule);
        }");
        await page.WaitForFunctionAsync(@"() => {
            const canvas = document.querySelector('.hunt-lab-canvas');
            const diagnostics = window.progressionRuntime.readArenaDiagnostics(canvas);
            window.progressionEvidence ??= { sawProjectile: false, sawField: false, samples: [] };
            const evidence = window.progressionEvidence;
            evidence.sawProjectile ||= diagnostics?.projectiles?.length > 0;
            evidence.sawField ||= diagnostics?.burningGrounds?.length > 0;
            if (diagnostics?.hud?.seconds > (evidence.samples.at(-1)?.seconds ?? -1)) {
                evidence.samples.push({ seconds: diagnostics.hud.seconds, health: diagnostics.hud.health,
                    dragonHealth: diagnostics.dragon?.health, fields: diagnostics.burningGrounds.length,
                    projectiles: diagnostics.projectiles.length, performance: diagnostics.performance });
            }
            return diagnostics?.hud?.seconds >= 25 || diagnostics?.ended;

        }", null, new() { Timeout = 90000 });
        await File.WriteAllTextAsync(Path.Combine(folder, $"combat-{width}-diagnostics.json"),
            await page.EvaluateAsync<string>("JSON.stringify(window.progressionEvidence, null, 2)"));
        Assert.IsTrue(await page.EvaluateAsync<bool>("window.progressionEvidence.sawProjectile"), "Encounter must actually cast Fireball.");
        await page.GetByRole(AriaRole.Button, new() { Name = "Ⅱ Pause", Exact = true }).ClickAsync();
        await Capture(page, $"combat-{width}-solar-wake-fixture");
        Assert.AreEqual(0, errors.Count, string.Join("\n", errors));
        Assert.IsNull(await page.EvaluateAsync<string?>("localStorage.getItem('wyrmforge.arcaneBuild.v1')"));
    }

    private static async Task Capture(IPage page, string name)
    {
        var folder = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.GetTempPath();
        Directory.CreateDirectory(folder);
        await page.ScreenshotAsync(new() { Path = Path.Combine(folder, name + ".png"), FullPage = false });
        await page.ScreenshotAsync(new() { Path = Path.Combine(folder, name + "-page.png"), FullPage = true });
    }
}
