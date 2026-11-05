using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Wyrmforge.Browser.Tests;

[TestClass]
public sealed class HuntEntryContractBrowserTests : PageTest
{
    private string BaseUrl => Environment.GetEnvironmentVariable("WYRMFORGE_BASE_URL") ?? "http://127.0.0.1:4173/";

    [TestMethod]
    [DataRow(320, 568)]
    [DataRow(390, 844)]
    public async Task OfferingPreparation_CannotBypassWorldGateTierSelection(int width, int height)
    {
        await Page.SetViewportSizeAsync(width, height);
        await OpenTownAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Rites & offerings" }).ClickAsync();

        var launch = Page.GetByRole(AriaRole.Button, new() { Name = "CHOOSE HUNT AT WORLD GATE" });
        await Expect(launch).ToBeVisibleAsync();
        Assert.IsTrue(await launch.EvaluateAsync<bool>("button => button.getBoundingClientRect().height >= 44"));
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN ASCENDANT RITE" })).ToHaveCountAsync(0);
        Assert.IsTrue(await Page.EvaluateAsync<bool>("() => document.documentElement.scrollWidth <= innerWidth + 2"));

        await launch.ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "World Gate" })).ToBeVisibleAsync();
        await Expect(Page.Locator(".game-screen")).ToHaveCountAsync(0);

        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--fire").ClickAsync();
        await Page.Locator(".gate-tier--ready").First.ClickAsync();
        await Expect(Page.GetByText("FIRE · TIER 1", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.Locator("button.route-node.available")).ToHaveCountAsync(1);
    }

    [TestMethod]
    public async Task SealedRite_HasExplicitStartAndDoesNotPretendToBeFireTierTwo()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.greatHunt.v1',
            JSON.stringify([{Wyrm:0,Slain:true,EssenceSecured:true,DeepEvolvedDuel:true,AscendantDefeated:false}]));
            localStorage.setItem('wyrmforge.spellMastery.v1',
            JSON.stringify([{Spell:1,MeaningfulRuns:4,BestDepth:2,WyrmFeat:true}]));");
        await OpenTownAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Rites & offerings" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "INVOKE ASCENDANT RITE" }).ClickAsync();

        var launch = Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN ASCENDANT RITE" });
        await Expect(launch).ToBeVisibleAsync();
        await Expect(Page.GetByText("separate from the World Gate's Wyrm tiers", new() { Exact = false })).ToBeVisibleAsync();
        await launch.ClickAsync();
        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.GetByText("FIRE · TIER 2", new() { Exact = true })).ToHaveCountAsync(0);
    }

    [TestMethod]
    public async Task FrostExploration_DoesNotInheritAPreviouslyInvokedAscendantRite()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.AddInitScriptAsync(@"localStorage.setItem('wyrmforge.greatHunt.v1',
            JSON.stringify([{Wyrm:0,Slain:true,EssenceSecured:true,DeepEvolvedDuel:true,AscendantDefeated:false}]));
            localStorage.setItem('wyrmforge.spellMastery.v1',
            JSON.stringify([{Spell:1,MeaningfulRuns:4,BestDepth:2,WyrmFeat:true}]));");
        await OpenTownAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "More options" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Rites & offerings" }).ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "INVOKE ASCENDANT RITE" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "BEGIN ASCENDANT RITE" })).ToBeVisibleAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "Back to main menu" }).ClickAsync();
        await Page.Locator(".refuge-town-spot--gate").ClickAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Enter Free Play" }).ClickAsync();
        await Page.Locator(".gate-action--primary").ClickAsync();
        await Page.Locator(".gate-lineage--frost").ClickAsync();
        await Page.Locator(".gate-tier--ready").First.ClickAsync();

        await Expect(Page.GetByText("Choose your trail.", new() { Exact = true })).ToBeVisibleAsync();
        await Expect(Page.GetByText(new Regex("Snowbound vale|Rimewall heights|Glacier basin", RegexOptions.IgnoreCase)).First)
            .ToBeVisibleAsync();
        await Expect(Page.GetByText("FIRE · TIER 2", new() { Exact = true })).ToHaveCountAsync(0);
    }

    private async Task OpenTownAsync()
    {
        await Page.AddInitScriptAsync("localStorage.setItem('wyrmforge.firstHunt.v1','3');");
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        await Page.GetByRole(AriaRole.Button, new() { Name = "START GAME" }).ClickAsync();
        if (await Page.Locator(".character-creation").IsVisibleAsync())
        {
            await Page.GetByRole(AriaRole.Button, new() { Name = "Choose Pyromancer" }).ClickAsync();
        }
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Town square" })).ToBeVisibleAsync();
    }
}
