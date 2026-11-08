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
        var fireSigil = page.Locator(".wheel-school-badge[data-school='Fire'][data-active='true']");
        Assert.IsTrue(await fireSigil.EvaluateAsync<bool>(@"sigil => {
            const map = sigil.closest('.arcane-web-canvas');
            const heart = map.querySelector('[data-node-id=wyrmheart]');
            const y = parseFloat(sigil.style.top);
            return sigil.style.left === heart.style.left
                && sigil.style.top === heart.style.top
                && [...map.querySelectorAll('.web-node.school-fire')]
                    .every(node => parseFloat(node.style.top) < y);
        }"), "The Fire sigil sits at the center and all Fire nodes branch north from it.");
        var fireLink = page.Locator(".web-edge[data-from='constellation-Fire-13-3'][data-to='constellation-Fire-13-4']");
        var activeFireStroke = await fireLink.EvaluateAsync<string>("link => getComputedStyle(link).stroke");
        var fireApproach = page.Locator(".web-edge[data-from='fire-banked-embers'][data-to='constellation-Fire-8-0']");
        Assert.IsTrue(await fireApproach.EvaluateAsync<bool>("link => (link.getAttribute('d').match(/L/g) ?? []).length > 1"));
        await Capture(page, $"web-{width}-overview");
        await page.Locator("[data-node-id='fire-ember-covenant']").ClickAsync();
        await Expect(page.Locator(".node-inspector.open")).ToContainTextAsync("Ember Covenant");
        await Capture(page, $"web-{width}-grand-goal");
        await page.GetByRole(AriaRole.Button, new() { Name = "Close node inspector" }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web", Exact = true }).ClickAsync();
        foreach (var (id, name) in new[] { ("fire-enduring-5", "Undying Hearth"),
            ("fire-furnace-5", "Heart of Cinders"), ("fire-shelter-5", "Shelter in the Pyre") })
        {
            await page.Locator($"[data-node-id='{id}']").ClickAsync();
            await Expect(page.Locator(".node-inspector.open")).ToContainTextAsync(name);
            await page.WaitForFunctionAsync(@"id => {
                const rect = document.querySelector(`[data-node-id='${id}']`).getBoundingClientRect();
                const node = document.querySelector(`[data-node-id='${id}']`);
                const map = node.closest('.arcane-web-viewport').getBoundingClientRect();
                return rect.top >= Math.max(64, map.top) && rect.bottom <= Math.min(innerHeight, map.bottom);
            }", id, new() { Timeout = 5000 });
            await Expect(page.Locator(".route-gains")).Not.ToContainTextAsync("MutationDuration");
            await Capture(page, $"web-{width}-{id}");
            await page.GetByRole(AriaRole.Button, new() { Name = "Close node inspector" }).ClickAsync();
            await page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web", Exact = true }).ClickAsync();
        }
        var constellation = page.Locator("[data-node-id='constellation-Fire-13-4']");
        var beforeRotation = await constellation.EvaluateAsync<string>("node => node.style.left + ',' + node.style.top");
        await constellation.ClickAsync();
        await Expect(page.Locator(".node-inspector.open")).ToContainTextAsync("Lava Seal");
        await Expect(page.Locator(".route-action.allocate")).ToBeEnabledAsync();
        await Capture(page, $"web-{width}-fire-constellation");
        await page.GetByRole(AriaRole.Button, new() { Name = "Close node inspector" }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Inspect Cryomancer sector", Exact = true }).ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Activate school", Exact = true }).ClickAsync();
        await Expect(page.Locator("[data-school='Frost']")).ToHaveAttributeAsync("data-active", "true");
        Assert.AreNotEqual(beforeRotation, await constellation.EvaluateAsync<string>("node => node.style.left + ',' + node.style.top"));
        Assert.AreEqual("Cryomancer", await page.EvaluateAsync<string>("localStorage.getItem('wyrmforge.characterSchool.v1')"));
        var saved = await page.EvaluateAsync<string>("localStorage.getItem('wyrmforge.arcaneBuild.v1')");
        StringAssert.Contains(saved, "fire-2");
        await page.GetByRole(AriaRole.Button, new() { Name = "Show whole Arcane Web", Exact = true }).ClickAsync();
        var dormantFireStroke = await fireLink.EvaluateAsync<string>("link => getComputedStyle(link).stroke");
        Assert.AreNotEqual(activeFireStroke, dormantFireStroke, "The overview should distinguish active Fire links from dormant links.");
        await Capture(page, $"web-{width}-rotated-overview");
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
            evidence.sawField ||= diagnostics?.burningGroundCount > 0;
            if (diagnostics?.hud?.seconds > (evidence.samples.at(-1)?.seconds ?? -1)) {
                evidence.samples.push({ seconds: diagnostics.hud.seconds, health: diagnostics.hud.health,
                    dragonHealth: diagnostics.dragon?.health, fields: diagnostics.burningGroundCount,
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

    [TestMethod]
    public async Task RealCombat_SolarWakePractice_ShowsTriggeredField()
    {
        var folder = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.GetTempPath();
        Directory.CreateDirectory(folder);
        await using var context = await Browser.NewContextAsync(new()
        {
            ViewportSize = new() { Width = 320, Height = 568 }, HasTouch = true, IsMobile = true,
            RecordVideoDir = folder, RecordVideoSize = new() { Width = 320, Height = 568 },
        });
        var page = await context.NewPageAsync();
        var url = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        // Separate, explicitly invulnerable phase-two practice proves the conditional
        // effect's rendering; the full-damage encounter above remains the threat check.
        await page.GotoAsync(url.TrimEnd('/') + "/hunt-lab?wyrm=Ashfang&ascendant=false&phase=2&loadout=fire-evolution&mutator=CinderNeedle&invulnerable=true&seed=1337");
        await Expect(page.Locator(".hunt-lab-canvas")).ToBeVisibleAsync();
        await Expect(page.GetByText("DEVELOPER FIXTURE", new() { Exact = false })).ToBeVisibleAsync();
        await page.EvaluateAsync(@"async () => {
            const canvas = document.querySelector('.hunt-lab-canvas');
            window.progressionRuntime = await import(canvas.dataset.arenaModule);
        }");
        await page.WaitForFunctionAsync(@"() => {
            const canvas = document.querySelector('.hunt-lab-canvas');
            const diagnostics = window.progressionRuntime.readArenaDiagnostics(canvas);
            window.solarEvidence ??= { started: false, sawField: false, samples: [],
                arena: { width: canvas.clientWidth, height: canvas.clientHeight } };
            const evidence = window.solarEvidence;
            evidence.started ||= diagnostics?.dragon != null;
            evidence.sawField ||= diagnostics?.burningGroundCount > 0;
            if (diagnostics?.hud?.seconds > (evidence.samples.at(-1)?.seconds ?? -1)) {
                evidence.samples.push({ seconds: diagnostics.hud.seconds, dragon: diagnostics.dragon,
                    fields: diagnostics.burningGroundCount, fireAreas: diagnostics.essenceBursts });
            }
            return evidence.sawField || (evidence.started && !diagnostics?.dragon) || diagnostics?.ended;
        }", null, new() { Timeout = 120000 });
        await page.GetByRole(AriaRole.Button, new() { Name = "Ⅱ Pause", Exact = true }).ClickAsync();
        await File.WriteAllTextAsync(Path.Combine(folder, "solar-wake-practice-diagnostics.json"),
            await page.EvaluateAsync<string>("JSON.stringify(window.solarEvidence, null, 2)"));
        var sawField = await page.EvaluateAsync<bool>("window.solarEvidence.sawField");
        await Capture(page, sawField ? "combat-320-solar-wake-triggered-practice" : "combat-320-practice-no-trigger");
        Assert.IsTrue(sawField, "The real Cinder Needle + Emberbrand II fight must trigger Solar Wake; see diagnostics and recording.");
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
