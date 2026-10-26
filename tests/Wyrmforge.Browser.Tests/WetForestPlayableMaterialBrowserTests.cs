using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>
/// Exercises the ACTUAL arena-environment.js floor path used by playable
/// Hunts (not the independent GPU material-kit preview). Uses a fixed C#
/// WetForestRecipe-shaped scene to isolate pixel-art loading from combat timing.
/// </summary>
[TestClass]
public sealed class WetForestPlayableMaterialBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task LiveArenaEnvironment_UsesArchivedPr340PixelsAfterDecode_WithoutReplacingGameplay(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root))
        {
            Assert.Inconclusive("Requires the published WyrmForge browser build.");
            return;
        }

        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/arena-material-kit?seed=1204",
            new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.WaitForFunctionAsync("() => !document.getElementById('wyrmforge-ignition')",
            null, new PageWaitForFunctionOptions { Timeout = 45000 });

        var before = await Page.EvaluateAsync<string>(@"async width => {
            const arena = await import('./js/arena-environment.js');
            const art = await import('./js/arena-live-wet-forest-materials.js');
            const canvas = document.createElement('canvas');
            canvas.id = 'live-wetforest-game-render-proof';
            canvas.width = 950;
            canvas.height = 1550;
            Object.assign(canvas.style, {
                position:'fixed', left:'0', top:'0', width: width + 'px',
                height: Math.round(width*1550/950) + 'px',
                zIndex:'99999', imageRendering:'pixelated'
            });
            document.body.appendChild(canvas);
            const environment = {
                seed: 1204, biome:'River valley', district:'causeway',
                stage:1, corruption:.15, habitat:'WetForest', generatorPreview:false,
                element:'fire', supplies:[], props:[],
                barriers:[
                    {kind:'ruin',x:0,y:.31,width:.38,height:.025,open:false},
                    {kind:'ruin',x:.62,y:.31,width:.38,height:.025,open:false}
                ],
                wetForest:{
                    site:'broken-wagon', siteX:.60, siteY:.56,
                    trail:Array.from({length:9}, (_, i) =>
                        ({x:.42+.09*Math.sin(i*.48),y:i/8,width:.13+.01*(i%3)})),
                    ground:[
                        {kind:'mud',x:.71,y:.29,radiusX:.14,radiusY:.09},
                        {kind:'puddle',x:.19,y:.65,radiusX:.07,radiusY:.045},
                        {kind:'moss',x:.81,y:.76,radiusX:.11,radiusY:.06},
                        {kind:'clearing',x:.55,y:.55,radiusX:.15,radiusY:.1}
                    ]
                }
            };
            function hash() {
                const data = canvas.getContext('2d').getImageData(0,0,950,1550).data;
                let value=2166136261;
                for (let i=0; i<data.length; i+=32)
                    value = Math.imul(value ^ data[i],16777619)>>>0;
                return String(value>>>0);
            }
            function draw() {
                const ctx=canvas.getContext('2d',{alpha:false});
                ctx.clearRect(0,0,950,1550);
                if (!arena.drawArenaEnvironment(ctx,environment,950,1550,0))
                    throw new Error('The real arena environment refused to draw the world');
                return hash();
            }
            window.__liveForestProof = { environment, canvas, draw,
                diagnostics:() => art.liveWetForestMaterialDiagnostics(environment.seed) };
            return draw();
        }", width);

        await Page.WaitForFunctionAsync("() => window.__liveForestProof?.diagnostics()?.status === 'source-backed'",
            null, new PageWaitForFunctionOptions { Timeout = 90000 });
        var after = await Page.EvaluateAsync<string>("() => window.__liveForestProof.draw()");
        Assert.AreNotEqual(before, after,
            "Loading real PR #340 artwork must change the ACTUAL playable arena ground renderer.");
        Assert.AreEqual(after, await Page.EvaluateAsync<string>("() => window.__liveForestProof.draw()"),
            "Source-backed ground art should remain deterministic for the same C# recipe and level seed.");

        var diagnostics = await Page.EvaluateAsync<string>(
            "() => window.__liveForestProof.diagnostics().source");
        Assert.AreEqual("PR340-original-candidates", diagnostics);
        var artifacts = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS")
            ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(artifacts);
        await Page.Locator("#live-wetforest-game-render-proof").ScreenshotAsync(
            new LocatorScreenshotOptions
            {
                Path = Path.Combine(artifacts, $"live-wetforest-playable-ground-{width}.png"),
            });
    }
}
