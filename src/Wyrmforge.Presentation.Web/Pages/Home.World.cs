using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Application.Persistence;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.World;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private readonly RegionDiscoveryState world = new();

    // Today every hunt runs in the starting region; a region choice arrives when a second region becomes playable.
    private RegionDefinition CurrentRegion => RegionCatalog.Starting;

    private async Task TryLoadWorldAsync()
    {
        try
        {
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, SaveLayout.World);
            if (!string.IsNullOrWhiteSpace(stored)) world.Restore(JsonSerializer.Deserialize<WorldSave>(stored)?.Discovered);
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
                JsonSerializer.Serialize(new WorldSave(world.Save())));
        }
        catch (JSException) { }
    }

    private sealed record WorldSave(string[]? Discovered);
}
