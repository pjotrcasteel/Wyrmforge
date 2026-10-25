using System.Text.Json;
using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Agents;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class AgentFoundationBrowserTests : PageTest
{
    [TestMethod]
    [DataRow("Hollow", "chase")]
    [DataRow("MireHound", "hound-cycle")]
    public async Task RealEnemyLab_ExposesBoundedReadOnlyInspector_AndFallback(string kind, string action)
    {
        await Page.SetViewportSizeAsync(390, 844);
        var errors = new List<string>();
        Page.PageError += (_, error) => errors.Add(error);
        var baseUrl = Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";
        await Page.GotoAsync(baseUrl.TrimEnd('/') + $"/enemy-lab?kind={kind}&ai0=true&autoplay=false&cast=false&seconds=3");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Fire & Frost enemy lab" })).ToBeVisibleAsync();
        await Page.EvaluateAsync("async () => { window.ai0Arena = await import('./js/arena.js'); }");
        await Page.WaitForFunctionAsync("() => window.ai0Arena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'))?.hud?.seconds >= 3",
            null, new() { Timeout = 45000 });
        await Page.GetByRole(AriaRole.Button, new() { Name = "Refresh AI inspector" }).ClickAsync();
        var inspector = Page.GetByTestId("agent-inspector");
        await Expect(inspector).ToContainTextAsync("legacy-exact-target/world-units");
        var text = await inspector.InnerTextAsync();
        var agent = JsonSerializer.Deserialize<AgentSnapshot[]>(text)!.Single();
        Assert.AreEqual(action, agent.CurrentAction!.Action);
        Assert.AreEqual(kind, agent.Identity.Archetype);
        Assert.IsTrue(agent.Trace.Length > 1 && agent.Trace.Length <= AgentRuntime.TraceLimit);
        Assert.IsTrue(agent.Trace.Last().Alternatives.Any(a => !a.Allowed));
        await Page.GetByRole(AriaRole.Button, new() { Name = "Refresh AI inspector" }).ClickAsync();
        Assert.AreEqual(text, await inspector.InnerTextAsync(), "Inspection while paused must not advance decisions.");
        Assert.IsNull(await Page.EvaluateAsync<string?>("() => localStorage.getItem('wyrmforge.greatHunt.v1')"));
        Assert.IsFalse(await Page.EvaluateAsync<bool>("() => !!window.ai0Arena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'))?.renderingFailed"));
        var output = Environment.GetEnvironmentVariable("WYRMFORGE_BROWSER_ARTIFACTS") ?? Path.Combine(Path.GetTempPath(), "wyrmforge-browser");
        Directory.CreateDirectory(output);
        await Page.ScreenshotAsync(new() { Path = Path.Combine(output, $"ai0-{kind}-390.png"), FullPage = true });
        await File.WriteAllTextAsync(Path.Combine(output, $"ai0-{kind}-inspector.json"), text);
        await Page.GetByLabel("AI0 foundation (Hollow / Mire Hound)").UncheckAsync();
        await Expect(inspector).ToHaveCountAsync(0);
        Assert.AreEqual(0, errors.Count, string.Join("\n", errors));
    }
}
