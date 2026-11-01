using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>
/// AR4-A3 owner evidence from the real Town-to-Chart-to-Hunt route.
/// Captures the same authoritative C# site in semantic and native WF32 albedo modes.
/// </summary>
[TestClass]
public sealed class Ar4WorldSiteMaterialsBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568, "forest-fork")]
    [DataRow(390, 844, "mountain-pass")]
    [DataRow(390, 844, "mountain-monastery")]
    public async Task Ar4_AuthoritativeSiteKeepsIdentityAcrossSemanticAndNativeMaterialReview(
        int width, int height, string kind)
    {
        var root = (Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/")
            .TrimEnd('/');
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);

        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync("""
            localStorage.setItem('wyrmforge.firstHunt.v1', '3');
            localStorage.setItem('wyrmforge.characterSchool.v1', 'Pyromancer');
            """);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        await Page.GotoAsync($"{root}/?ar1Geography=1&arenaTerrain=semantic&ar1SiteKind={kind}",
            new() { WaitUntil = WaitUntilState.NetworkIdle });

        var start = Page.GetByRole(AriaRole.Button,
            new() { NameRegex = new System.Text.RegularExpressions.Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 45000 });
        await start.ClickAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
        {
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        }

        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Page.Locator(".gate-tier--ready").First.ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();

        var node = Page.Locator("button.route-node.available").First;
        Assert.AreEqual(kind == "mountain-monastery" ? "mountain-pass" : kind,
            await node.GetAttributeAsync("data-site-kind"));
        await node.ClickAsync();
        await Page.GetByRole(AriaRole.Button,
            new() { NameRegex = new System.Text.RegularExpressions.Regex("^Enter (rare )?trail$") }).ClickAsync();
        await Expect(Page.Locator("canvas.game-canvas")).ToBeVisibleAsync();

        await Page.WaitForFunctionAsync(
            "kind => window.__wyrmforgeAr0Geography?.kind === kind && " +
            "window.__wyrmforgeAr0Geography?.geographyActive === true && " +
            "window.__wyrmforgeAr0Geography?.materialView === 'semantic'",
            kind, new() { Timeout = 45000 });

        var siteId = await Page.EvaluateAsync<string>("() => window.__wyrmforgeAr0Geography.siteId");
        var seed = await Page.EvaluateAsync<int>("() => window.__wyrmforgeAr0Geography.seed");
        var obstacles = await Page.EvaluateAsync<int>("() => window.__wyrmforgeAr0Geography.obstacleCount");
        Assert.IsGreaterThan(0, obstacles, "The review must contain the actual C# obstacles.");
        Assert.IsTrue(await Page.EvaluateAsync<bool>(
            "() => Number.isFinite(window.__wyrmforgeAr0Geography.elevationGrid?.center?.grade)"),
            "The review must retain authoritative C# grade samples.");
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"ar4-{kind}-semantic-{width}.png"),
            FullPage = false,
        });

        // Only swap the real Hunt presentation mode: same C# site, actors, camera and simulation.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('arenaTerrain', 'materials');
            history.replaceState(null, '', url);
        }");
        await Page.WaitForFunctionAsync(
            "siteId => window.__wyrmforgeAr0Geography?.siteId === siteId && " +
            "window.__wyrmforgeAr0Geography?.materialView?.endsWith('albedo')",
            siteId, new() { Timeout = 45000 });
        var expectedMaterialView = kind == "forest-fork" ? "albedo" : "partial-albedo";
        Assert.AreEqual(expectedMaterialView, await Page.EvaluateAsync<string>(
            "() => window.__wyrmforgeAr0Geography.materialView"));
        var sourceFraction = await Page.EvaluateAsync<double>(
            "() => window.__wyrmforgeAr0Geography.sourceCoverage.fraction");
        Assert.IsTrue(sourceFraction > .70,
            "The reviewed camera area must contain original WF32 source pixels.");
        if (expectedMaterialView == "albedo")
        {
            Assert.AreEqual(1d, sourceFraction);
        }
        else
        {
            Assert.IsLessThan(1d, sourceFraction,
                "Tall Hunt worlds must explicitly report the un-authored lower band.");
        }

        Assert.AreEqual(seed, await Page.EvaluateAsync<int>("() => window.__wyrmforgeAr0Geography.seed"));
        Assert.AreEqual(obstacles, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.obstacleCount"));
        Assert.AreEqual(7, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.materialSources.length"));
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"ar4-{kind}-native-wf32-{width}.png"),
            FullPage = false,
        });

        // Camera and hunter move in the real running C# Hunt; source phase may not swim.
        await Page.Keyboard.DownAsync("w");
        await Page.WaitForTimeoutAsync(900);
        await Page.Keyboard.UpAsync("w");
        await Page.Keyboard.DownAsync("d");
        await Page.WaitForTimeoutAsync(700);
        await Page.Keyboard.UpAsync("d");
        Assert.AreEqual(siteId, await Page.EvaluateAsync<string>(
            "() => window.__wyrmforgeAr0Geography.siteId"));
        Assert.AreEqual(expectedMaterialView, await Page.EvaluateAsync<string>(
            "() => window.__wyrmforgeAr0Geography.materialView"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"ar4-{kind}-moving-camera-{width}.png"),
            FullPage = false,
        });

        if (kind == "mountain-monastery")
        {
            // The original spawn view does not contain the distant C# building.
            // This opt-in spectator frame uses its *real* obstacle outlines without teleporting the hunter.
            await Page.EvaluateAsync(@"() => {
                const url = new URL(location.href);
                url.searchParams.set('ar4ReviewFocus', 'monastery');
                history.replaceState(null, '', url);
            }");
            await Page.WaitForFunctionAsync(
                "siteId => window.__wyrmforgeAr4ReviewCamera?.siteId === siteId && " +
                "window.__wyrmforgeAr4ReviewCamera?.kind === 'mountain-monastery' && " +
                "window.__wyrmforgeAr4ReviewCamera?.buildingCount >= 3",
                siteId, new() { Timeout = 45000 });
            Assert.AreEqual(seed, await Page.EvaluateAsync<int>(
                "() => window.__wyrmforgeAr0Geography.seed"));
            Assert.AreEqual(obstacles, await Page.EvaluateAsync<int>(
                "() => window.__wyrmforgeAr0Geography.obstacleCount"));
            Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
            await Page.ScreenshotAsync(new()
            {
                Path = Path.Combine(output, "ar4-mountain-monastery-csharp-focus-390.png"),
                FullPage = false,
            });
        }

        // AR4-B *candidate* review: separate, unapproved 32px atlas path. Keep all
        // preceding P1i native-baseline captures unchanged for a fair A/B comparison.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('arenaTerrain', 'source32');
            history.replaceState(null, '', url);
        }");
        await Page.WaitForFunctionAsync(
            "siteId => window.__wyrmforgeAr0Geography?.siteId === siteId && " +
            "window.__wyrmforgeAr0Geography?.materialView === 'source32-prototype'",
            siteId, new() { Timeout = 45000 });
        Assert.AreEqual(seed, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.seed"));
        Assert.AreEqual(obstacles, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.obstacleCount"));
        Assert.IsTrue(await Page.EvaluateAsync<bool>(
            "() => window.__wyrmforgeAr0Geography.sourceCoverage?.prototypeOnly === true && " +
            "window.__wyrmforgeAr0Geography.sourceCoverage?.repeatedTiles === true"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"ar4-{kind}-source32-prototype-{width}.png"),
            FullPage = false,
        });

        // Separate v1 quieter grass / authored path-interior and seam study.
        // This has the identical C# Hunt, player, seed, obstacles and camera as
        // the semantic, soft P1i, and original-source32 captures above.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('arenaTerrain', 'source32b');
            history.replaceState(null, '', url);
        }");
        await Page.WaitForFunctionAsync(
            "siteId => window.__wyrmforgeAr0Geography?.siteId === siteId && " +
            "window.__wyrmforgeAr0Geography?.materialView === 'source32-quiet-study'",
            siteId, new() { Timeout = 45000 });
        Assert.AreEqual(seed, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.seed"));
        Assert.AreEqual(obstacles, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.obstacleCount"));
        Assert.IsTrue(await Page.EvaluateAsync<bool>(
            "() => window.__wyrmforgeAr0Geography.sourceCoverage?.prototypeOnly === true"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"ar4-{kind}-quiet-road-study-{width}.png"),
            FullPage = false,
        });

        // World-continuous, genuinely non-stamped native 32px authored preview.
        // Same C# geography, movement, obstacles and camera as preceding screenshots.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('arenaTerrain', 'source32c');
            history.replaceState(null, '', url);
        }");
        await Page.WaitForFunctionAsync(
            "siteId => window.__wyrmforgeAr0Geography?.siteId === siteId && " +
            "window.__wyrmforgeAr0Geography?.materialView === 'source32-world-study'",
            siteId, new() { Timeout = 45000 });
        Assert.AreEqual(seed, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.seed"));
        Assert.AreEqual(obstacles, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.obstacleCount"));
        Assert.IsTrue(await Page.EvaluateAsync<bool>(
            "() => window.__wyrmforgeAr0Geography.sourceCoverage?.prototypeOnly === true && " +
            "window.__wyrmforgeAr0Geography.sourceCoverage?.repeatedTiles === false"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"ar4-{kind}-world-source-{width}.png"),
            FullPage = false,
        });

        // Distinct ground-only visual comparison: original forest source retained,
        // C# mountain rock/cliff geometry textured, C# monastery courtyard paved.
        // Buildings remain their explicit unapproved placeholders.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('arenaTerrain', 'source32d');
            history.replaceState(null, '', url);
        }");
        await Page.WaitForFunctionAsync(
            "siteId => window.__wyrmforgeAr0Geography?.siteId === siteId && " +
            "window.__wyrmforgeAr0Geography?.materialView === 'source32-ground-study'",
            siteId, new() { Timeout = 45000 });
        Assert.AreEqual(seed, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.seed"));
        Assert.AreEqual(obstacles, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.obstacleCount"));
        Assert.IsTrue(await Page.EvaluateAsync<bool>(
            "() => window.__wyrmforgeAr0Geography.sourceCoverage?.prototypeOnly === true && " +
            "window.__wyrmforgeAr0Geography.sourceCoverage?.repeatedTiles === false"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"ar4-{kind}-stone-ground-study-{width}.png"),
            FullPage = false,
        });

        // B2 experimental authored Wang tile atlas, *clipped* to the authoritative
        // C# surface winners. Keep source32d proof and all other modes intact.
        await Page.EvaluateAsync(@"() => {
            const url = new URL(location.href);
            url.searchParams.set('arenaTerrain', 'source32wang');
            history.replaceState(null, '', url);
        }");
        await Page.WaitForFunctionAsync(
            "siteId => window.__wyrmforgeAr0Geography?.siteId === siteId && " +
            "window.__wyrmforgeAr0Geography?.materialView === 'source32-wang-study'",
            siteId, new() { Timeout = 45000 });
        Assert.AreEqual(seed, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.seed"));
        Assert.AreEqual(obstacles, await Page.EvaluateAsync<int>(
            "() => window.__wyrmforgeAr0Geography.obstacleCount"));
        Assert.IsTrue(await Page.EvaluateAsync<bool>(
            "() => window.__wyrmforgeAr0Geography.sourceCoverage?.prototypeOnly === true && " +
            "window.__wyrmforgeAr0Geography.sourceCoverage?.repeatedTiles === true"));
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
        await Page.ScreenshotAsync(new()
        {
            Path = Path.Combine(output, $"ar4-{kind}-wang-road-study-{width}.png"),
            FullPage = false,
        });
    }
}
