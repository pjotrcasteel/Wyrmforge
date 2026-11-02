using Microsoft.Playwright;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

/// <summary>Polls the live arena diagnostics from C#; unlike an async WaitForFunction it really waits for the resolved value.</summary>
internal static class ArenaBrowserWait
{
    /// <param name="body">JavaScript statements with <c>state</c> (the arena diagnostics, possibly null) in scope; must return a boolean.</param>
    public static async Task UntilAsync(IPage page, string body, int timeoutMilliseconds, string description)
    {
        var script = "async () => { const module = await import('/js/arena-performance.js'); " +
            "const canvas = document.querySelector('canvas.game-canvas'); const state = canvas ? module.readArenaDiagnostics(canvas) : null; " + body + " }";
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMilliseconds);
        while (DateTime.UtcNow < deadline)
        {
            if (await page.EvaluateAsync<bool>(script)) return;
            await page.WaitForTimeoutAsync(250);
        }
        Assert.Fail($"Timed out after {timeoutMilliseconds} ms waiting for: {description}");
    }
}
