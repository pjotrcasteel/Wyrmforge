using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Application.Persistence;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.World;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private readonly RegionDiscoveryState world = new();
    private RegionId? selectedRegion;
    private RegionId? activeRegion;
    private bool activeRegionOpening;

    private RegionAccessContext RegionAccess => new(
        firstHunt.CompletedRuns > 0,
        hunter.Level,
        greatHunt.Snapshot().Where(entry => entry.Slain).Select(entry => entry.Wyrm).ToHashSet());

    // The World Gate's choice, while it stays open. The First Hunt always walks the starting region.
    private RegionDefinition CurrentRegion =>
        !firstHunt.TutorialRun && selectedRegion is { } id && RegionCatalog.Find(id) is { } region && region.IsOpen(RegionAccess)
            ? region
            : RegionCatalog.Starting;

    private async Task SelectRegionAsync(RegionId id)
    {
        if (RegionCatalog.Find(id) is not { } region || !region.IsOpen(RegionAccess)) return;
        selectedRegion = id;
        await TrySetWorldAsync();
    }

    /// <summary>Fixes the hunt's region before it starts; an Ascendant rite only answers where its lineage hunts.</summary>
    private void PrepareRegionRun()
    {
        var region = CurrentRegion;
        activeRegion = region.Id;
        activeRegionOpening = !firstHunt.TutorialRun && !world.IsDiscovered(region.Id);
        if (activeAscendant is { } wyrm && region.InfluenceOf(wyrm) == WyrmInfluence.Absent) activeAscendant = null;
    }

    private async Task TryLoadWorldAsync()
    {
        try
        {
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, SaveLayout.World);
            if (!string.IsNullOrWhiteSpace(stored) && JsonSerializer.Deserialize<WorldSave>(stored) is { } save)
            {
                world.Restore(save.Discovered);
                selectedRegion = RegionCatalog.All.FirstOrDefault(region => region.Id.Value == save.Selected)?.Id;
            }
        }
        catch (JSException) { }
        catch (JsonException) { }
        catch (NotSupportedException) { }
        // Hunters from before the world save have already walked the starting region.
        if (firstHunt.CompletedRuns > 0 && world.Discover(RegionCatalog.Starting.Id)) await TrySetWorldAsync();
    }

    private async Task DiscoverCurrentRegionAsync()
    {
        if (world.Discover(CurrentRegion.Id)) await TrySetWorldAsync();
    }

    private async Task TrySetWorldAsync()
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, SaveLayout.World,
                JsonSerializer.Serialize(new WorldSave(world.Save(), selectedRegion?.Value)));
        }
        catch (JSException) { }
    }

    // Selected was added with the second playable region; older saves simply have none and start in the starting region.
    private sealed record WorldSave(string[]? Discovered, string? Selected = null);
}
