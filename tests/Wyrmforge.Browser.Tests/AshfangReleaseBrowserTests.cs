using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class AshfangReleaseBrowserTests : PageTest
{
    [TestMethod]
    public async Task TierOne_PublishedAssetsDecodeAndDefaultFightPreservesProgress()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/hunt-lab?wyrm=Ashfang&ascendant=false&play=true&cast=true");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Face the wyrm." })).ToBeVisibleAsync();
        await Page.EvaluateAsync("async () => { window.releaseArena = await import('./js/arena.js'); }");
        await Page.WaitForFunctionAsync("""
            () => {
                const d = window.releaseArena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas'));
                return d?.hud?.seconds >= 8 && d?.ashfang?.lastDraw;
            }
            """, null, new() { Timeout = 45000 });
        Assert.IsTrue(await Page.EvaluateAsync<bool>("""
            () => {
                const d = window.releaseArena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas'));
                return d.ashfang.ready && !d.renderingFailed && !d.ashfang.errors.length &&
                    d.dragon.health > 550 && d.hud.spells.some(s => s.isActive && s.rank === 1 && !s.evolutionName) &&
                    Math.abs(d.ashfang.lastDraw.worldCell - 448.53076140099125) < .001 && d.sharedLighting.version === 1;
            }
            """), "Actual published native atlases, normal loadout, baseline scale and shared C# lighting must be usable.");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Ⅱ Pause", Exact = true }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "▶ Resume", Exact = true })).ToBeVisibleAsync();
        await Page.Locator(".hunt-lab-options summary").ClickAsync();
        await Expect(Page.GetByLabel("Invulnerable practice")).Not.ToBeCheckedAsync();
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.greatHunt.v1')"));
        Assert.AreEqual(0, errors.Count, string.Join("\n", errors));
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, "ashfang-release-tier1-390.png"), FullPage = true });
    }
}
