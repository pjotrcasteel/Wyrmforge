using Microsoft.Playwright;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>Polls the live arena diagnostics from C#; unlike an async WaitForFunction it really waits for the resolved value.</summary>
internal static class ArenaBrowserWait
{
    /// <param name="body">JavaScript statements with <c>state</c> (the arena diagnostics, possibly null) in scope; must return a boolean.</param>
    public static async Task UntilAsync(IPage page, string body, int timeoutMilliseconds, string description, int pollMilliseconds = 250)
    {
        var script = "async () => { const module = await import('/js/arena-performance.js'); " +
            "const canvas = document.querySelector('canvas.game-canvas'); const state = canvas ? module.readArenaDiagnostics(canvas) : null; " + body + " }";
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMilliseconds);
        while (DateTime.UtcNow < deadline)
        {
            if (await page.EvaluateAsync<bool>(script)) return;
            await page.WaitForTimeoutAsync(pollMilliseconds);
        }
        var last = await page.EvaluateAsync<string>("async () => { const module = await import('/js/arena-performance.js'); " +
            "const canvas = document.querySelector('canvas.game-canvas'); const s = canvas ? module.readArenaDiagnostics(canvas) : null; " +
            "return JSON.stringify({ player: s?.player && { x: Math.round(s.player.x), y: Math.round(s.player.y) }, enemies: s?.enemies?.length, hunt: s?.hunt, exit: !!(s?.exit || s?.exitPorts?.length), ambush: s?.fieldAmbush, kills: (document.body.innerText.match(/\\d+\\/\\d+ kills/i) ?? [])[0] }); }");
        Assert.Fail($"Timed out after {timeoutMilliseconds} ms waiting for: {description}. Last state: {last}");
    }
}
