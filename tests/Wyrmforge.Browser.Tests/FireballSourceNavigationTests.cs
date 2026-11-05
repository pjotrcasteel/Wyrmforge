using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class FireballSourceNavigationTests : PageTest
{
    private string BaseUrl => Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_FireballMaterialSource_OpensRealTierOneHuntInTwoTaps(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.setItem('wyrmforge.fireballCore.v1',JSON.stringify({Level:2,Discovered:[],Slots:[]}));");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await OpenArcaneNexusAsync();

        var find = Page.GetByRole(AriaRole.Button, new() { Name = "Find Ember Residue" });
        await Expect(find).ToHaveAttributeAsync("aria-expanded", "false");
        Assert.IsTrue(await find.EvaluateAsync<bool>("button => button.getBoundingClientRect().height >= 44"));
        await find.ClickAsync(); // Tap 1: reveal authoritative sources inline.

        var guide = Page.GetByRole(AriaRole.Region, new() { Name = "Where to find Ember Residue" });
        await Expect(guide).ToBeVisibleAsync();
        await Expect(guide).ToContainTextAsync("Ashlings");
        await Expect(guide).ToContainTextAsync("Ash Slingers");
        await Expect(guide).ToContainTextAsync("occasional enemy drop");
        await Expect(find).ToHaveAttributeAsync("aria-expanded", "true");
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= window.innerWidth + 2"));

        await guide.GetByRole(AriaRole.Button, new() { Name = "Hunt Fire Tier 1 now" }).ClickAsync(); // Tap 2: start playable Hunt.
        await Expect(Page.GetByText("FIRE · TIER 1", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator("button.route-node.available")).ToHaveCountAsync(1);
    }

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task Mobile_FireballRareSource_RespectsLockedTierAndRoutesToWorldGate(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.setItem('wyrmforge.fireballCore.v1',JSON.stringify({Level:3,Discovered:[],Slots:[]}));
            localStorage.removeItem('wyrmforge.world.v1');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await OpenArcaneNexusAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "Find Emberglass" }).ClickAsync(); // Tap 1.
        var guide = Page.GetByRole(AriaRole.Region, new() { Name = "Where to find Emberglass" });
        await Expect(guide).ToContainTextAsync("Elite enemies");
        await Expect(guide).ToContainTextAsync("Reclaimed refuge");
        await Expect(guide).ToContainTextAsync("Unlock Tier 2");
        await Expect(guide.GetByRole(AriaRole.Button, new() { Name = "Hunt Fire Tier 2 now" })).ToHaveCountAsync(0);
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= window.innerWidth + 2"));

        await guide.GetByRole(AriaRole.Button, new() { Name = "Open World Gate" }).ClickAsync(); // Tap 2.
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "World Gate" })).ToBeVisibleAsync();
    }

    [TestMethod]
    public async Task FireballFirstUpgrade_EssenceSourceStartsTierOneInTwoTaps()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.firstHunt.v1','3');
            localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:8,Nodes:[]}));
            localStorage.removeItem('wyrmforge.fireballCore.v1');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await OpenArcaneNexusAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "Find Ashfang Essences" }).ClickAsync(); // Tap 1.
        var guide = Page.GetByRole(AriaRole.Region, new() { Name = "Where to find Ashfang Essences" });
        await Expect(guide).ToContainTextAsync("Defeat Ashfang");
        await Expect(guide).ToContainTextAsync("select the Essence");
        await guide.GetByRole(AriaRole.Button, new() { Name = "Hunt Fire Tier 1 now" }).ClickAsync(); // Tap 2.
        await Expect(Page.GetByText("FIRE · TIER 1", new() { Exact = true })).ToBeVisibleAsync();
    }

    private async Task OpenArcaneNexusAsync()
    {
        // Complete Blazor's title-screen render before clicking into the persistent Refuge.
        var start = Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^START GAME") });
        await start.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 30000 });
        await start.ClickAsync();
        await Expect(Page.Locator(".character-creation, .town-square")).ToBeVisibleAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
        {
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        }
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
        await Page.Locator(".refuge-town-spot--nexus").ClickAsync();
        await Expect(Page.Locator(".fireball-ritual")).ToBeVisibleAsync();
    }
}
