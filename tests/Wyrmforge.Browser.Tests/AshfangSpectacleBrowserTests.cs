using System.Text.Json;
using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class AshfangSpectacleBrowserTests : PageTest
{
    /// <summary>The change itself over the real authored bodies: three moments of the Bell Warden and the Reliquary, drawn by the shipped modules on one sheet.</summary>
    [TestMethod]
    public async Task BossTransformation_DrawsTheChangeOverTheAuthoredBody()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/hunt-lab?wyrm=Ashfang&play=false&cast=false");
        var data = await Page.EvaluateAsync<string>("""
            async () => {
                const base = location.origin + '/js/';
                const authored = await import(base + 'authored-characters.js?v=20261108-voxel-actor-grounding-v1');
                const vfx = await import(base + 'arena-transformation-vfx.js');
                const sets = [['Bell-Warden-normal', 9, 36], ['Reliquary-normal', 7, 30]];
                await Promise.all(sets.map(([name]) => authored.preloadAuthoredCharacter(name)));
                for (let wait = 0; wait < 80 && !sets.every(([name]) => authored.authoredCharacter(name) && authored.loadedManifests().get(name)); wait++) await new Promise(r => setTimeout(r, 100));
                const canvas = document.createElement('canvas');
                canvas.width = 3 * 220; canvas.height = 2 * 240;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.fillStyle = '#0b0a0d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                const moments = [.25, .6, .97];
                sets.forEach(([name, kind, radius], row) => moments.forEach((p, col) => {
                    ctx.save();
                    ctx.beginPath(); ctx.rect(col * 220, row * 240, 220, 240); ctx.clip();
                    ctx.translate(col * 220 + 110, row * 240 + 150);
                    const manifest = authored.loadedManifests().get(name);
                    const frames = manifest.actions.phase_change.framesPerDirection;
                    authored.drawAuthoredCell(ctx, name, 'phase_change', 'S', Math.min(frames - 1, Math.floor(p * frames)), 0, 0, 1, 1.5);
                    vfx.drawTransformation(ctx, { kind, entityId: row + 3, x: 0, y: 0, radius, invulnerable: true }, p, 1.3 + col * .17, false);
                    ctx.restore();
                }));
                return canvas.toDataURL('image/png');
            }
            """);
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await File.WriteAllBytesAsync(Path.Combine(output, "boss-transformation-sheet.png"), Convert.FromBase64String(data[(data.IndexOf(',') + 1)..]));
    }

    /// <summary>The Drowned Wraith at four body opacities (C# lowers it only while it submerges or emerges), drawn by the shipped module over water.</summary>
    [TestMethod]
    public async Task DrownedWraith_SinksBehindTheWaterlineInsteadOfFading()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/hunt-lab?wyrm=Ashfang&play=false&cast=false");
        var data = await Page.EvaluateAsync<string>("""
            async () => {
                const authored = await import(location.origin + '/js/authored-characters.js');
                authored.preloadAuthoredCharacter('Drowned-Wraith');
                for (let wait = 0; wait < 80 && !authored.loadedManifests().get('Drowned-Wraith'); wait++) await new Promise(r => setTimeout(r, 100));
                const canvas = document.createElement('canvas');
                canvas.width = 4 * 160; canvas.height = 200;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.fillStyle = '#16262c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                [1, .7, .4, .12].forEach((opacity, column) => {
                    const state = authored.createAuthoredState();
                    const enemy = { kind: 6, entityId: 7, x: column * 160 + 80, y: 130, radius: 12, opacity, telegraph: null };
                    const snapshot = { enemies: [enemy], player: { x: column * 160 + 80, y: 400, radius: 12 }, deathBursts: [], hud: { seconds: 1 } };
                    authored.updateAuthoredEnemies(state, snapshot, authored.loadedManifests(), 1);
                    authored.updateAuthoredEnemies(state, snapshot, authored.loadedManifests(), 1.05);
                    authored.drawAuthoredEnemy(ctx, enemy, state);
                });
                return canvas.toDataURL('image/png');
            }
            """);
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await File.WriteAllBytesAsync(Path.Combine(output, "wraith-sink-sheet.png"), Convert.FromBase64String(data[(data.IndexOf(',') + 1)..]));
    }

    /// <summary>The enraged Ashfang fights on the real simulation; every new attack, the takeoff and the landing are grabbed from the canvas inside the animation frame they happen in.</summary>
    [TestMethod]
    public async Task EnragedAshfang_ShowsItsNewAttacksFlightAndLandingLive()
    {
        await Page.SetViewportSizeAsync(390, 844);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + "/hunt-lab?wyrm=Ashfang&ai5=true&phase=2&play=true&cast=true&invulnerable=true&seed=927");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Face the wyrm." })).ToBeVisibleAsync();
        await Page.EvaluateAsync("""
            async () => {
                const canvas = document.querySelector('.hunt-lab canvas');
                const arena = await import(canvas.dataset.arenaModule);
                const want = ['claw_combo', 'tail_left', 'tail_right', 'breath_sweep', 'stagger', 'pounce', 'breath', 'takeoff', 'overhead', 'land'];
                const shots = window.__shots = {};
                const loop = () => {
                    const d = arena.readArenaDiagnostics(canvas);
                    const dragon = d?.dragon;
                    if (dragon) {
                        const key = dragon.flightStage && dragon.flightStage !== 'ground' ? dragon.flightStage
                            : dragon.action && dragon.action !== 'idle' && dragon.actionPhase !== 'ready' ? dragon.action + ':' + dragon.actionPhase : null;
                        if (key) {
                            const name = key.split(':')[0];
                            if (want.includes(name) && !shots[key] && (key.includes(':strike') || !key.includes(':') || key.includes(':recover'))) shots[key] = canvas.toDataURL('image/png');
                        }
                        // The ground effects of takeoff and landing show a moment after the stage begins.
                        if (key && d.ashfangVfx?.effects > 0 && !shots['fx:' + key]) shots['fx:' + key] = canvas.toDataURL('image/png');
                    }
                    requestAnimationFrame(loop);
                };
                requestAnimationFrame(loop);
            }
            """);
        var deadline = DateTime.UtcNow.AddSeconds(150);
        var seen = new HashSet<string>();
        while (DateTime.UtcNow < deadline)
        {
            await Page.WaitForTimeoutAsync(2000);
            var keys = JsonSerializer.Deserialize<string[]>(await Page.EvaluateAsync<string>("() => JSON.stringify(Object.keys(window.__shots))"))!;
            foreach (var key in keys) seen.Add(key);
            if (new[] { "claw_combo", "tail", "breath_sweep", "takeoff", "land" }.All(need => seen.Any(key => key.Contains(need)))) break;
        }
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        foreach (var key in seen)
        {
            var data = await Page.EvaluateAsync<string>("key => window.__shots[key]", key);
            await File.WriteAllBytesAsync(Path.Combine(output, "ashfang-" + key.Replace(':', '-') + ".png"), Convert.FromBase64String(data[(data.IndexOf(',') + 1)..]));
        }
        Console.WriteLine("seen: " + string.Join(", ", seen.Order()));
        Assert.AreEqual(0, errors.Count, string.Join("\n", errors));
        Assert.IsTrue(seen.Any(key => key.Contains("claw_combo")) || seen.Any(key => key.Contains("tail")) || seen.Any(key => key.Contains("breath_sweep")),
            "at least one of the new attacks appears in a live enraged fight: " + string.Join(", ", seen));
    }
}
