using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Text.RegularExpressions;

namespace Wyrmforge.Browser.Tests;

/// <summary>Production Town → Chart → Hunt, with no legacy terrain query or synthetic Arena Lab.</summary>
[TestClass]
public sealed class GreyboxHuntBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task DefaultHunt_HasFlatOneMetreGreyboxWithEnemiesAndNoTerrain(int width, int height)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/").TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        await Page.GotoAsync(root + "/", new() { WaitUntil = WaitUntilState.NetworkIdle });

        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 45000 });
        await start.ClickAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();

        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Page.Locator(".gate-tier--ready").First.ClickAsync();
        await Page.Locator("button.route-node.available").First.ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();

        // Read the actual render module attached to the gameplay Canvas, not a duplicate simulation.
        await Page.WaitForFunctionAsync(@"async () => {
            const canvas = document.querySelector('canvas.game-canvas');
            const module = await import('/js/arena-performance.js');
            const state = module.readArenaDiagnostics(canvas);
            return state?.worldReady === true && state?.terrainPresentation === 'one-meter-greybox'
                && state?.enemies?.length > 0;
        }", null, new() { Timeout = 45000 });

        Assert.IsTrue(await Page.EvaluateAsync<bool>(@"async () => {
            const module = await import('/js/arena-performance.js');
            const state = module.readArenaDiagnostics(document.querySelector('canvas.game-canvas'));
            const grid = state?.greybox;
            return grid?.cellSizeMeters === 1 && grid?.pixelsPerFace === 32
                && grid?.microcellsPerAxis === 8 && grid?.groundBaseMeters === 0
                && grid?.groundTopMeters === 1 && state?.wetForestGround == null
                && !state?.renderingFailed;
        }"), "Production Hunt must expose one neutral 1m block face split into 8³ physical 12.5cm subcells, without painted terrain.");

        // Most world pixels must be the exact neutral floor, even with the hunter,
        // enemies, touch controls and exit guidance still rendered over it.
        var greyFractionScript = @"() => {
            const canvas = document.querySelector('canvas.game-canvas');
            const context = canvas.getContext('2d');
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            let matched = 0, total = 0;
            for (let y = 8; y < pixels.height; y += 16) {
                for (let x = 8; x < pixels.width; x += 16) {
                    const i = (y * pixels.width + x) * 4;
                    total++;
                    if (pixels.data[i] === 128 && pixels.data[i+1] === 128 &&
                        pixels.data[i+2] === 128 && pixels.data[i+3] === 255) matched++;
                }
            }
            return total > 0 ? matched / total : 0;
        }";
        // The C# snapshot may arrive before the first Canvas paint on cold mobile startup.
        // Wait for an ACTUAL grey frame; never silently accept a black/transparent frame.
        await Page.WaitForFunctionAsync($"() => ({greyFractionScript})() > 0.35",
            null, new() { Timeout = 15000 });
        var greyFraction = await Page.EvaluateAsync<double>(greyFractionScript);
        Assert.IsGreaterThan(0.35, greyFraction, "The actual playable Canvas should be dominated by untextured #808080 ground.");
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"default-greybox-hunt-{width}.png"), FullPage = false });
    }
}
