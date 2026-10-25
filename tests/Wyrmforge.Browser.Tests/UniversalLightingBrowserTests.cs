using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class UniversalLightingBrowserTests : PageTest
{
    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task SharedGpu_SourcesAndEmissionDisabled_AllWorldPixelsBlack(int width, int height)
    {
        var root = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL");
        if (string.IsNullOrWhiteSpace(root)) { Assert.Inconclusive("Requires the published Blazor application."); return; }
        var errors = new System.Collections.Concurrent.ConcurrentQueue<string>();
        Page.PageError += (_, error) => errors.Enqueue(error);
        Page.Console += (_, message) => { if (message.Type == "error") errors.Enqueue(message.Text); };
        await Page.SetViewportSizeAsync(width, height);
        await Page.GotoAsync(root.TrimEnd('/') + "/arena-light-engine");
        var canvas = Page.Locator(".gpu-proof canvas");
        await Expect(canvas).ToHaveAttributeAsync("data-ready", "true", new() { Timeout = 90000 });
        await Page.EvaluateAsync("async () => { window.gpuProof = await import('./js/lighting/proof-scene.js'); }");
        var lit = await PixelHashAsync(canvas);
        Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => c.width > 0 && c.height > 0 && gpuProof.proofPixels(c).some((v,i) => i%4!==3 && v>0)"),
            "A nonempty illuminated framebuffer is required before testing darkness.");
        await CaptureAsync(width, "overlap");
        await ConfigureAsync(canvas, new { profile = "zero", rune = true });
        var maximum = await canvas.EvaluateAsync<int>(
            "c => { const p=gpuProof.proofPixels(c); let m=0; for(let i=0;i<p.length;i++) if(i%4!==3) m=Math.max(m,p[i]); return m; }");
        Assert.AreEqual(0, maximum, "Every world framebuffer RGB channel must be exactly black, including source surfaces.");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Shared light engine" })).ToBeVisibleAsync();
        await CaptureAsync(width, "zero");
        await ConfigureAsync(canvas, new { profile = "night", rune = false });
        Assert.AreEqual(lit, await PixelHashAsync(canvas), "Restoring a frozen snapshot must restore the exact output.");
        await ConfigureAsync(canvas, new { rune = true });
        Assert.AreNotEqual(lit, await PixelHashAsync(canvas));
        await CaptureAsync(width, "new-rune");
        await ConfigureAsync(canvas, new { rune = false });
        Assert.AreEqual(lit, await PixelHashAsync(canvas), "Removed emitters must leave no ghost illumination.");
        await ConfigureAsync(canvas, new { shadows = false });
        Assert.AreNotEqual(lit, await PixelHashAsync(canvas));
        await CaptureAsync(width, "shadows-off");
        await ConfigureAsync(canvas, new { shadows = true, reflections = false });
        Assert.AreNotEqual(lit, await PixelHashAsync(canvas));
        await CaptureAsync(width, "specular-off");
        await ConfigureAsync(canvas, new { reflections = true, frame = 8 });
        var posed = await PixelHashAsync(canvas);
        Assert.AreNotEqual(lit, posed, "A pose change must affect rendering independently of source movement.");
        await CaptureAsync(width, "left-pose8");
        await ConfigureAsync(canvas, new { progress = .85 });
        Assert.AreNotEqual(posed, await PixelHashAsync(canvas), "Moving only the light must change illumination.");
        await CaptureAsync(width, "right-pose8");
        await ConfigureAsync(canvas, new { profile = "day" });
        await CaptureAsync(width, "day");
        await ConfigureAsync(canvas, new { profile = "night", progress = .25, frame = 0 });
        foreach (var view in new[] { "albedo", "normals", "geometry", "shadow-visibility", "light-depth", "light-bounds" })
        {
            await ConfigureAsync(canvas, new { view });
            Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
            Assert.AreNotEqual(lit, await PixelHashAsync(canvas), $"{view} must be a real diagnostic pass.");
            Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).some((v,i) => i%4!==3 && v>0)"),
                $"{view} must render; blank output can conceal shader errors or a light trapped inside its caster.");
            await CaptureAsync(width, view);
        }
        await ConfigureAsync(canvas, new { view = "lit" });
        Assert.AreEqual(lit, await PixelHashAsync(canvas), "Inspection must not mutate the lit scene.");
        foreach (var focus in new[] { "actors", "oak", "town", "water" })
        {
            await ConfigureAsync(canvas, new { focus, profile = "night", view = "lit" });
            var focused = await PixelHashAsync(canvas);
            await CaptureAsync(width, $"close-{focus}");
            await ConfigureAsync(canvas, new { profile = "zero", view = "normals" });
            Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).every((v,i) => i%4===3 || v===0)"),
                $"Every RGB channel must be black in the {focus} camera, even when an inspection pass was selected.");
            await CaptureAsync(width, $"close-{focus}-zero");
            await ConfigureAsync(canvas, new { profile = "night", view = "lit" });
            Assert.AreEqual(focused, await PixelHashAsync(canvas));
        }
        await ConfigureAsync(canvas, new { focus = "actors" });
        var actors = await PixelHashAsync(canvas);
        await ConfigureAsync(canvas, new { normals = false });
        Assert.AreNotEqual(actors, await PixelHashAsync(canvas), "Authored pose normals must affect actual actor shading.");
        await CaptureAsync(width, "actors-without-normals");
        await ConfigureAsync(canvas, new { normals = true, inspectObject = "hollowed", receivesLight = false });
        Assert.AreNotEqual(actors, await PixelHashAsync(canvas), "Light receipt must be independently configurable.");
        await CaptureAsync(width, "hollowed-no-receive-light");
        await ConfigureAsync(canvas, new { receivesLight = true, castsShadow = false });
        await CaptureAsync(width, "hollowed-no-cast");
        await ConfigureAsync(canvas, new { castsShadow = true, receivesShadow = false });
        await CaptureAsync(width, "hollowed-no-receive-shadow");
        await ConfigureAsync(canvas, new { receivesShadow = true });
        Assert.AreEqual(actors, await PixelHashAsync(canvas));
        await ConfigureAsync(canvas, new { focus = "oak", progress = .85, view = "shadow-visibility" });
        await CaptureAsync(width, "oak-point-visibility-right");
        await ConfigureAsync(canvas, new { progress = .15 });
        await CaptureAsync(width, "oak-point-visibility-left");
        await VerifyReceiversAsync(canvas, width);
        Assert.AreEqual(0, errors.Count, string.Join(Environment.NewLine, errors));
    }

    private async Task VerifyReceiversAsync(ILocator canvas, int width)
    {
        await ConfigureAsync(canvas, new { lighting = "neutral-key", view = "lit", progress = .25, frame = 0, fireball = false, torch = false, spot = false });
        var comparisons = new List<object>();
        foreach (var id in new[] { "hollowed", "ashling", "npc-binding-proxy", "wall", "roof", "foreground-post", "oak-0", "oak-1" })
        {
            var focus = id == "foreground-post" ? "water" : id.StartsWith("oak-") ? "oak" : id is "hollowed" or "ashling" ? "actors" : "town";
            await ConfigureAsync(canvas, new { inspectObject = id, focus });
            await SaveReceiverBaselineAsync(canvas);
            await CaptureAsync(width, $"key-{id}");
            if (id is "hollowed" or "ashling")
            {
                await ConfigureAsync(canvas, new { normals = false });
                var changed = await ReceiverChangedPixelsAsync(canvas);
                comparisons.Add(new { receiver = id, comparison = "authored-normal-versus-flat", changedPixels = changed });
                Assert.IsGreaterThan(5, changed, $"{id} authored normals must change its own visible pixels.");
                await CaptureAsync(width, $"key-{id}-flat");
                await ConfigureAsync(canvas, new { normals = true });
            }
            await ConfigureAsync(canvas, new { receivesLight = false });
            var receiptChanged = await ReceiverChangedPixelsAsync(canvas);
            comparisons.Add(new { receiver = id, comparison = "receives-light", changedPixels = receiptChanged });
            Assert.IsGreaterThan(5, receiptChanged, $"{id} must receive the registered key.");
            await CaptureAsync(width, $"key-{id}-no-receipt");
            await ConfigureAsync(canvas, new { receivesLight = true });
            Assert.AreEqual(0, await ReceiverChangedPixelsAsync(canvas), $"{id} must restore exactly.");
        }
        await ConfigureAsync(canvas, new { focus = "water", inspectObject = "puddle", behind = true });
        var centers = new List<double>();
        foreach (var position in new[] { .15, .4 })
        {
            await ConfigureAsync(canvas, new { progress = position, reflections = true });
            await SaveReceiverBaselineAsync(canvas);
            await CaptureAsync(width, $"water-key-{position}-specular");
            await ConfigureAsync(canvas, new { reflections = false });
            var specularChanged = await ReceiverChangedPixelsAsync(canvas);
            comparisons.Add(new { receiver = "puddle", comparison = "specular-on-off", position, changedPixels = specularChanged });
            Assert.IsGreaterThan(100, specularChanged, "Specular A/B must change water pixels, not just other surfaces.");
            centers.Add(await canvas.EvaluateAsync<double>(
                "c => { const p=gpuProof.proofPixels(c), e=window.receiverEvidence; let sum=0,x=0; for(const i of e.indices) { const d=Math.max(0,e.pixels[i]+e.pixels[i+1]+e.pixels[i+2]-p[i]-p[i+1]-p[i+2]); sum+=d; x+=(i/4%c.width)*d; } return sum ? x/sum : -1; }"));
            await CaptureAsync(width, $"water-key-{position}-diffuse");
        }
        comparisons.Add(new { receiver = "puddle", comparison = "specular-centroid", xPixels = centers });
        var directory = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-gpu-proof");
        await File.WriteAllTextAsync(Path.Combine(directory, $"gpu-{width}-receiver-comparisons.json"),
            System.Text.Json.JsonSerializer.Serialize(comparisons, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
        Assert.IsGreaterThan(1.0, Math.Abs(centers[1] - centers[0]), "Water's specular contribution must move with the source.");
        await ConfigureAsync(canvas, new { reflections = true, profile = "zero" });
        Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).every((v,i) => i%4===3 || v===0)"),
            "Zero must disable the explicit inspection key too.");
        await CaptureAsync(width, "inspection-key-zero");
        await VerifyPoseShadowsAsync(canvas, width);
        await VerifyCutoutShadowsAsync(canvas, width);
        await VerifyOakLayerShadowsAsync(canvas, width);
        await VerifyActorSourceLifecycleAsync(canvas, width);
        await VerifyTownFixturesAsync(canvas, width);
        await VerifyTemporalStabilityAsync(canvas, width);
    }

    private async Task VerifyPoseShadowsAsync(ILocator canvas, int width)
    {
        await ConfigureAsync(canvas, new { profile = "night", focus = "actors", inspectObject = "approved-ground", behind = false, progress = .5, frame = 0 });
        await SaveReceiverBaselineAsync(canvas);
        await ConfigureAsync(canvas, new { view = "shadow-visibility" });
        await canvas.EvaluateAsync("c => { window.receiverEvidence.pixels=gpuProof.proofPixels(c); }");
        await CaptureAsync(width, "ground-shadow-pose0");
        await ConfigureAsync(canvas, new { frame = 8, view = "object-mask" });
        // Intersect visible ground at both poses: actor silhouette movement itself cannot pass this check.
        await canvas.EvaluateAsync("c => { const p=gpuProof.proofPixels(c); window.receiverEvidence.indices=window.receiverEvidence.indices.filter(i => p[i]===255); }");
        await ConfigureAsync(canvas, new { view = "shadow-visibility" });
        var changed = await ReceiverChangedPixelsAsync(canvas);
        Assert.IsGreaterThan(5, changed, "Pose changes must alter actual shadow visibility on ground visible in both poses.");
        await CaptureAsync(width, "ground-shadow-pose8");
        await RecordComparisonAsync(width, "pose-shadow", new { changedGroundPixels = changed, excludedActorSilhouettes = true });
    }

    private async Task VerifyCutoutShadowsAsync(ILocator canvas, int width)
    {
        await ConfigureAsync(canvas, new { cutouts = true, focus = "cutouts", inspectObject = "cutout-lower", frame = 0 });
        await SaveReceiverBaselineAsync(canvas);
        // Hold the key at the upper layer throughout cast/alpha comparisons.
        await ConfigureAsync(canvas, new { inspectObject = "cutout-upper", view = "shadow-visibility" });
        await canvas.EvaluateAsync("c => { window.receiverEvidence.pixels=gpuProof.proofPixels(c); }");
        await CaptureAsync(width, "cutout-leaf-shadows");
        await ConfigureAsync(canvas, new { castsShadow = false });
        var castChanged = await ReceiverChangedPixelsAsync(canvas);
        Assert.IsGreaterThan(5, castChanged, "Upper alpha leaves must shadow visible lower leaves.");
        await CaptureAsync(width, "cutout-no-cast");
        await ConfigureAsync(canvas, new { castsShadow = true, cutoutAlpha = false, inspectObject = "cutout-lower", view = "object-mask" });
        // Exclude pixels newly covered by the opaque control quad.
        await canvas.EvaluateAsync("c => { const p=gpuProof.proofPixels(c); window.receiverEvidence.indices=window.receiverEvidence.indices.filter(i => p[i]===255); }");
        await ConfigureAsync(canvas, new { inspectObject = "cutout-upper", view = "shadow-visibility" });
        var holesChanged = await ReceiverChangedPixelsAsync(canvas);
        Assert.IsGreaterThan(5, holesChanged, "Alpha holes must transmit light that a solid quad blocks.");
        await RecordComparisonAsync(width, "cutout-shadow", new { castChangedPixels = castChanged, alphaHolesChangedPixels = holesChanged });
        await CaptureAsync(width, "cutout-solid-control");
        await ConfigureAsync(canvas, new { cutoutAlpha = true, view = "lit" });
        await CaptureAsync(width, "cutout-lit");
        await ConfigureAsync(canvas, new { profile = "zero" });
        Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).every((v,i) => i%4===3 || v===0)"));
        await CaptureAsync(width, "cutout-zero");
    }

    private async Task VerifyOakLayerShadowsAsync(ILocator canvas, int width)
    {
        await ConfigureAsync(canvas, new { profile = "night", cutouts = false, focus = "oak", inspectObject = "oak-2", progress = .5 });
        await SaveReceiverBaselineAsync(canvas);
        // Oak groups share the same root, so selecting the caster leaves the key stationary.
        await ConfigureAsync(canvas, new { inspectObject = "oak-1", view = "shadow-visibility" });
        await canvas.EvaluateAsync("c => { window.receiverEvidence.pixels=gpuProof.proofPixels(c); }");
        await CaptureAsync(width, "oak-leaf-receiver-shadowed");
        await ConfigureAsync(canvas, new { castsShadow = false });
        var changed = await ReceiverChangedPixelsAsync(canvas);
        Assert.IsGreaterThan(5, changed, "Original oak leaf geometry must shadow another visible foliage group, not only the ground.");
        await RecordComparisonAsync(width, "oak-leaf-shadow", new { caster = "oak-1", receiver = "oak-2", changedLeafPixels = changed });
        await CaptureAsync(width, "oak-leaf-caster-off");
        await ConfigureAsync(canvas, new { castsShadow = true });
        Assert.AreEqual(0, await ReceiverChangedPixelsAsync(canvas));
    }

    private async Task VerifyActorSourceLifecycleAsync(ILocator canvas, int width)
    {
        await ConfigureAsync(canvas, new { lighting = "source-lifecycle", focus = "actors", profile = "night", view = "lit",
            cutouts = false, behind = false, frame = 0, fireball = true, torch = false, spot = false, rune = false });
        var comparisons = new List<object>();
        foreach (var id in new[] { "hollowed", "ashling" })
        {
            await ConfigureAsync(canvas, new { inspectObject = id, sourceDistance = 24 });
            await SaveReceiverBaselineAsync(canvas);
            var outside = await ReceiverMeanRgbAsync(canvas);
            Assert.AreEqual(0.0, outside, "An ordinary actor outside the only source range must be black.");
            await CaptureAsync(width, $"{id}-source-outside");
            await ConfigureAsync(canvas, new { sourceDistance = 8 });
            var middle = await ReceiverMeanRgbAsync(canvas);
            Assert.IsGreaterThan(outside, middle, "Entering the source range must reveal the same actor pixels.");
            await CaptureAsync(width, $"{id}-source-entering");
            await ConfigureAsync(canvas, new { sourceDistance = 2 });
            var near = await ReceiverMeanRgbAsync(canvas);
            Assert.IsGreaterThan(middle, near, "Approaching illumination must increase, not use a binary visibility threshold.");
            var nearHash = await PixelHashAsync(canvas);
            await CaptureAsync(width, $"{id}-source-near");
            await ConfigureAsync(canvas, new { torch = true });
            var overlap = await ReceiverMeanRgbAsync(canvas);
            Assert.IsGreaterThan(near, overlap, "A second local light must add illumination on the actor itself.");
            await CaptureAsync(width, $"{id}-source-overlap");
            await ConfigureAsync(canvas, new { torch = false });
            Assert.AreEqual(nearHash, await PixelHashAsync(canvas), "Removing the second light restores the entire frozen frame.");
            await ConfigureAsync(canvas, new { fireball = false });
            Assert.AreEqual(0.0, await ReceiverMeanRgbAsync(canvas));
            Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).every((v,i) => i%4===3 || v===0)"),
                "With both registered sources disabled and no ambient/emission, the entire world must be black.");
            await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Shared light engine" })).ToBeVisibleAsync();
            await CaptureAsync(width, $"{id}-sources-disabled-zero");
            await ConfigureAsync(canvas, new { fireball = true, sourceDistance = 24 });
            Assert.AreEqual(outside, await ReceiverMeanRgbAsync(canvas), "Leaving the range must restore darkness without ghost light.");
            comparisons.Add(new { receiver = id, distances = new[] { 24, 8, 2 }, meanRgb = new[] { outside, middle, near }, overlapMeanRgb = overlap });
        }
        await RecordComparisonAsync(width, "actor-source-lifecycle", comparisons);
    }

    private async Task VerifyTownFixturesAsync(ILocator canvas, int width)
    {
        await ConfigureAsync(canvas, new { lighting = "town-fixture", focus = "town", profile = "night", view = "lit",
            townActive = true, mastery = 0, fireball = false, torch = false });
        var comparisons = new List<object>();
        var schoolHashes = new HashSet<string>();
        foreach (var school in new[] { "fire", "frost", "storm", "arcane", "death", "binding" })
        {
            await ConfigureAsync(canvas, new { school });
            foreach (var receiver in new[] { "wall", "npc-binding-proxy" })
            {
                await ConfigureAsync(canvas, new { inspectObject = receiver, mastery = 0 });
                await SaveReceiverBaselineAsync(canvas);
                var low = await ReceiverMeanRgbAsync(canvas);
                await ConfigureAsync(canvas, new { mastery = 1 });
                var high = await ReceiverMeanRgbAsync(canvas);
                Assert.IsGreaterThan(low, high, $"{school} mastery must increase actual light on {receiver}, not only the fixture core.");
                comparisons.Add(new { school, receiver, lowMasteryMeanRgb = low, highMasteryMeanRgb = high });
            }
            schoolHashes.Add(await PixelHashAsync(canvas));
            await CaptureAsync(width, $"town-{school}-mastery");
        }
        Assert.AreEqual(6, schoolHashes.Count, "All six schools must produce distinct lighting with the same geometry.");
        await ConfigureAsync(canvas, new { inspectObject = "wall", school = "arcane" });
        await SaveReceiverBaselineAsync(canvas);
        var active = await PixelHashAsync(canvas);
        var activeObjects = await canvas.EvaluateAsync<int>("c => gpuProof.proofDiagnostics(c).objects");
        await ConfigureAsync(canvas, new { townActive = false });
        Assert.IsFalse(await canvas.EvaluateAsync<bool>("c => gpuProof.proofDiagnostics(c).lights.some(l => l.id==='town-nexus-fixture')"));
        Assert.AreEqual(activeObjects - 2, await canvas.EvaluateAsync<int>("c => gpuProof.proofDiagnostics(c).objects"),
            "Vacancy removes both the luminous fixture core and the occupant proxy.");
        Assert.IsGreaterThan(5, await ReceiverChangedPixelsAsync(canvas), "Vacancy must extinguish actual wall illumination.");
        await CaptureAsync(width, "town-vacant");
        await ConfigureAsync(canvas, new { townActive = true });
        Assert.AreEqual(active, await PixelHashAsync(canvas), "Reactivation restores the exact frozen scene without ghost sources.");
        await ConfigureAsync(canvas, new { aboveRoof = true, inspectObject = "wall" });
        await SaveReceiverBaselineAsync(canvas);
        await ConfigureAsync(canvas, new { inspectObject = "roof", view = "shadow-visibility" });
        await canvas.EvaluateAsync("c => { window.receiverEvidence.pixels=gpuProof.proofPixels(c); }");
        await CaptureAsync(width, "town-roof-shadow-on-wall");
        await ConfigureAsync(canvas, new { castsShadow = false });
        var roofShadowPixels = await ReceiverChangedPixelsAsync(canvas);
        Assert.IsGreaterThan(5, roofShadowPixels, "The roof must occlude the registered source on visible wall pixels.");
        comparisons.Add(new { caster = "roof", receiver = "wall", changedShadowPixels = roofShadowPixels });
        await CaptureAsync(width, "town-roof-cast-off");
        await ConfigureAsync(canvas, new { castsShadow = true });
        Assert.AreEqual(0, await ReceiverChangedPixelsAsync(canvas));
        await ConfigureAsync(canvas, new { aboveRoof = false, inspectObject = "wall", view = "object-mask" });
        var nightGeometry = await PixelHashAsync(canvas);
        await ConfigureAsync(canvas, new { profile = "day" });
        Assert.AreEqual(nightGeometry, await PixelHashAsync(canvas), "Day and night must use identical receiver geometry and camera.");
        await ConfigureAsync(canvas, new { view = "lit" });
        Assert.AreNotEqual(active, await PixelHashAsync(canvas));
        await CaptureAsync(width, "town-fixture-day");
        await ConfigureAsync(canvas, new { profile = "zero" });
        Assert.IsTrue(await canvas.EvaluateAsync<bool>("c => gpuProof.proofPixels(c).every((v,i) => i%4===3 || v===0)"),
            "Zero must disable Town fixture light, moon, ambient and the school emissive core.");
        await CaptureAsync(width, "town-fixture-zero");
        await RecordComparisonAsync(width, "town-fixture", comparisons);
    }

    private async Task VerifyTemporalStabilityAsync(ILocator canvas, int width)
    {
        await ConfigureAsync(canvas, new { lighting = "scene", profile = "night", view = "lit", panPixels = 0,
            fireball = true, torch = true, spot = true, frame = 0, progress = .25, animate = false, inspectObject = "hollowed" });
        var comparisons = new List<object>();
        foreach (var focus in new[] { "actors", "oak", "water" })
        {
            await ConfigureAsync(canvas, new { focus, panPixels = 0 });
            var original = await PixelHashAsync(canvas);
            await canvas.EvaluateAsync("c => { window.panEvidence={pixels:gpuProof.proofPixels(c),width:c.width,height:c.height}; }");
            await CaptureAsync(width, $"temporal-{focus}-origin");
            foreach (var pan in new[] { 1, 2, 4, 8, 4, 2, 1 })
            {
                await ConfigureAsync(canvas, new { panPixels = pan });
                var changedFraction = await canvas.EvaluateAsync<double>(
                    """
                    (c,pan) => {
                        const p=gpuProof.proofPixels(c),e=window.panEvidence; let changed=0,total=0;
                        for(let y=1;y<e.height-1;y++) for(let x=8;x<e.width-9;x++) {
                            const i=(y*e.width+x)*4,j=(y*e.width+x+pan)*4;
                            if(Math.abs(p[i]-e.pixels[j])+Math.abs(p[i+1]-e.pixels[j+1])+Math.abs(p[i+2]-e.pixels[j+2])>3) changed++;
                            total++;
                        }
                        return changed/total;
                    }
                    """, pan);
                comparisons.Add(new { focus, panPixels = pan, translationMismatchFraction = changedFraction });
                Assert.IsLessThan(.01, changedFraction,
                    "An integer camera pan must translate the existing lit/shadow image; more than 1% changed interior pixels indicates instability.");
            }
            await CaptureAsync(width, $"temporal-{focus}-pan1");
            await ConfigureAsync(canvas, new { panPixels = 0 });
            Assert.AreEqual(original, await PixelHashAsync(canvas), "Returning the camera must restore the exact image.");
            var fractional = new Dictionary<double, string>();
            foreach (var pan in new[] { .25, .5, .75, .75, .5, .25 })
            {
                await ConfigureAsync(canvas, new { panPixels = pan });
                var hash = await PixelHashAsync(canvas);
                Assert.AreNotEqual(original, hash, "Fractional motion must move the camera rather than silently snap to the origin.");
                if (fractional.TryGetValue(pan, out var previous)) Assert.AreEqual(previous, hash, "Returning to a fractional offset must reproduce the exact frame.");
                else
                {
                    fractional.Add(pan, hash);
                    comparisons.Add(new { focus, fractionalPanPixels = pan, hash });
                    if (pan == .5) await CaptureAsync(width, $"temporal-{focus}-half-pixel");
                }
            }
            await ConfigureAsync(canvas, new { panPixels = 0 });
            Assert.AreEqual(original, await PixelHashAsync(canvas));
        }
        await ConfigureAsync(canvas, new { focus = "actors" });
        var expected = new List<string>();
        for (var pass = 0; pass < 2; pass++)
        {
            for (var frame = 0; frame < 16; frame++)
            {
                await ConfigureAsync(canvas, new { frame, progress = frame / 20.0 });
                var hash = await PixelHashAsync(canvas);
                if (pass == 0) expected.Add(hash);
                else Assert.AreEqual(expected[frame], hash, "A repeated pose/light sequence must reproduce each frame exactly.");
            }
        }
        Assert.IsGreaterThan(1, expected.Distinct().Count(), "Replay must include actual pose/light changes.");
        await ConfigureAsync(canvas, new { frame = 0, progress = .25 });
        var beforeResize = await PixelHashAsync(canvas);
        var resources = await canvas.EvaluateAsync<string>("c => { const d=gpuProof.proofDiagnostics(c); return JSON.stringify([d.textures,d.geometries,d.lights]); }");
        var height = width == 320 ? 568 : 844;
        await Page.SetViewportSizeAsync(width + 16, height);
        await Page.WaitForFunctionAsync("() => { const c=document.querySelector('.gpu-proof canvas'); return c.width===Math.min(390,Math.round(c.clientWidth)); }");
        await Page.SetViewportSizeAsync(width, height);
        await Page.WaitForFunctionAsync("() => { const c=document.querySelector('.gpu-proof canvas'); return c.width===Math.min(390,Math.round(c.clientWidth)); }");
        Assert.AreEqual(beforeResize, await PixelHashAsync(canvas), "Resize/restore must preserve the frozen scene.");
        Assert.AreEqual(resources, await canvas.EvaluateAsync<string>("c => { const d=gpuProof.proofDiagnostics(c); return JSON.stringify([d.textures,d.geometries,d.lights]); }"));
        var stoppedTicks = await canvas.EvaluateAsync<int>("c => gpuProof.proofDiagnostics(c).animation.ticks");
        await ConfigureAsync(canvas, new { animate = true });
        await Page.WaitForFunctionAsync("start => { const d=gpuProof.proofDiagnostics(document.querySelector('.gpu-proof canvas')); return d.animation.ticks>start+2 && d.animation.frames.hollowed>0 && d.animation.frames.ashling>0; }", stoppedTicks);
        var playback = await canvas.EvaluateAsync<System.Text.Json.JsonElement>("c => gpuProof.proofDiagnostics(c).animation");
        await ConfigureAsync(canvas, new { animate = false });
        Assert.AreEqual(beforeResize, await PixelHashAsync(canvas), "Stopping playback returns to the selected manual pose.");
        var stopped = await canvas.EvaluateAsync<int>("c => gpuProof.proofDiagnostics(c).animation.ticks");
        await Page.EvaluateAsync("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
        Assert.AreEqual(stopped, await canvas.EvaluateAsync<int>("c => gpuProof.proofDiagnostics(c).animation.ticks"), "Stopped playback must not retain a queued update.");
        Assert.IsFalse(await canvas.EvaluateAsync<bool>("c => gpuProof.proofDiagnostics(c).animation.scheduled"));
        await ConfigureAsync(canvas, new { animate = true });
        await Page.WaitForFunctionAsync("start => gpuProof.proofDiagnostics(document.querySelector('.gpu-proof canvas')).animation.ticks>start+2", stopped);
        await ConfigureAsync(canvas, new { animate = false });
        Assert.AreEqual(beforeResize, await PixelHashAsync(canvas));
        await RecordComparisonAsync(width, "temporal", new { camera = comparisons, replayHashes = expected,
            exactReplay = true, exactResizeRestore = true, playback, stoppedWithoutQueuedUpdates = true, resumedPlayback = true });
    }

    private static Task<double> ReceiverMeanRgbAsync(ILocator canvas) => canvas.EvaluateAsync<double>(
        "c => { const p=gpuProof.proofPixels(c), e=window.receiverEvidence; return e.indices.reduce((sum,i) => sum+p[i]+p[i+1]+p[i+2],0)/(3*e.indices.length); }");

    private static async Task RecordComparisonAsync(int width, string name, object evidence)
    {
        var directory = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-gpu-proof");
        await File.WriteAllTextAsync(Path.Combine(directory, $"gpu-{width}-{name}-comparison.json"),
            System.Text.Json.JsonSerializer.Serialize(evidence, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
    }

    private async Task SaveReceiverBaselineAsync(ILocator canvas)
    {
        await ConfigureAsync(canvas, new { view = "object-mask" });
        var count = await canvas.EvaluateAsync<int>("c => { const p=gpuProof.proofPixels(c), indices=[]; for(let i=0;i<p.length;i+=4) if(p[i]===255) indices.push(i); window.receiverEvidence={indices}; return indices.length; }");
        Assert.IsGreaterThan(20, count, "Receiver must have enough visible pixels for a meaningful comparison.");
        await ConfigureAsync(canvas, new { view = "lit" });
        await canvas.EvaluateAsync("c => { window.receiverEvidence.pixels=gpuProof.proofPixels(c); }");
    }

    private static Task<int> ReceiverChangedPixelsAsync(ILocator canvas) => canvas.EvaluateAsync<int>(
        "c => { const p=gpuProof.proofPixels(c), e=window.receiverEvidence; return e.indices.filter(i => Math.abs(p[i]-e.pixels[i])+Math.abs(p[i+1]-e.pixels[i+1])+Math.abs(p[i+2]-e.pixels[i+2])>3).length; }");

    private async Task ConfigureAsync(ILocator canvas, object options)
    {
        var labels = new Dictionary<string, string>
        {
            ["cutouts"] = "Cutout test fixture", ["cutoutAlpha"] = "Cutout alpha", ["lighting"] = "Lighting rig", ["behind"] = "Light behind receiver", ["profile"] = "Environment", ["view"] = "Diagnostic", ["focus"] = "Camera",
            ["fireball"] = "Fireball", ["torch"] = "Torch", ["spot"] = "Spot", ["rune"] = "Register rune",
            ["shadows"] = "Shadows", ["reflections"] = "Direct specular", ["normals"] = "Authored normals",
            ["panPixels"] = "Camera pan", ["aboveRoof"] = "Fixture above roof", ["townActive"] = "Town active", ["school"] = "Fixture school", ["mastery"] = "Fixture mastery",
            ["sourceDistance"] = "Source distance", ["progress"] = "Light position", ["frame"] = "Walk frame", ["animate"] = "Animate walk",
            ["inspectObject"] = "Inspect object", ["castsShadow"] = "Casts shadow",
            ["receivesShadow"] = "Receives shadow", ["receivesLight"] = "Receives light"
        };
        var values = System.Text.Json.JsonSerializer.SerializeToElement(options);
        foreach (var property in values.EnumerateObject())
        {
            var control = Page.GetByLabel(labels[property.Name], new() { Exact = true });
            if (property.Value.ValueKind is System.Text.Json.JsonValueKind.True or System.Text.Json.JsonValueKind.False)
                await control.SetCheckedAsync(property.Value.GetBoolean());
            else if (property.Value.ValueKind == System.Text.Json.JsonValueKind.Number)
                await control.EvaluateAsync("(input,value) => { input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); }",
                    property.Value.GetDouble() * (property.Name is "progress" or "mastery" ? 100 : 1));
            else await control.SelectOptionAsync(property.Value.GetString()!);
            object expected = property.Value.ValueKind switch
            {
                System.Text.Json.JsonValueKind.True or System.Text.Json.JsonValueKind.False => property.Value.GetBoolean(),
                System.Text.Json.JsonValueKind.Number => property.Value.GetDouble(),
                _ => property.Value.GetString()!
            };
            await Page.WaitForFunctionAsync("([key,value]) => { const c=document.querySelector('.gpu-proof canvas'); return gpuProof.proofOptions(c)[key]===value; }",
                new object[] { property.Name, expected });
        }
    }

    private static Task<string> PixelHashAsync(ILocator canvas) => canvas.EvaluateAsync<string>(
        "c => { let hash=2166136261; for(const x of gpuProof.proofPixels(c)) hash=Math.imul(hash^x,16777619); return String(hash>>>0); }");

    private async Task CaptureAsync(int width, string name)
    {
        var directory = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-gpu-proof");
        Directory.CreateDirectory(directory);
        var measurements = await Page.Locator(".gpu-proof canvas").EvaluateAsync<string>(
            """
            c => {
                const pixels = gpuProof.proofPixels(c); let maxRgb=0, nonzeroPixels=0, hash=2166136261;
                for(let i=0;i<pixels.length;i++) hash=Math.imul(hash^pixels[i],16777619);
                for(let i=0;i<pixels.length;i+=4) {
                    const maximum=Math.max(pixels[i],pixels[i+1],pixels[i+2]);
                    maxRgb=Math.max(maxRgb,maximum); if(maximum>0) nonzeroPixels++;
                }
                return JSON.stringify({ framebuffer:[c.width,c.height], rgbChannels:pixels.length/4*3,
                    maxRgb,nonzeroPixels,hash:hash>>>0,options:gpuProof.proofOptions(c),diagnostics:gpuProof.proofDiagnostics(c) },null,2);
            }
            """);
        await File.WriteAllTextAsync(Path.Combine(directory, $"gpu-{width}-{name}.json"), measurements);
        await Page.ScreenshotAsync(new() { Path = Path.Combine(directory, $"gpu-{width}-{name}.png"), FullPage = true });
    }
}
