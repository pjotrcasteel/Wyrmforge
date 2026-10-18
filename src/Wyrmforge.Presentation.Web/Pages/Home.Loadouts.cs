using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string LoadoutsKey = "wyrmforge.loadouts.v1";
    private const string PreferredPrimaryKey = "wyrmforge.preferredPrimary.v1";
    private readonly HuntLoadoutBook loadouts = new();
    // The last primary the player committed to (or a loadout's). The hunt only highlights it; the player still chooses.
    private SpellId? preferredPrimary;

    private async Task SaveLoadoutAsync(int index)
    {
        loadouts.Save(index, selection, laboratory, primary: preferredPrimary, offering: selectedOffering);
        await TrySetLoadoutsAsync();
    }

    private async Task ClearLoadoutAsync(int index)
    {
        loadouts.Clear(index);
        await TrySetLoadoutsAsync();
    }

    // A free respec: the Web and sockets are rebuilt from the loadout, then saved like any manual change.
    private async Task<HuntLoadoutApplyResult?> ApplyLoadoutAsync(int index)
    {
        if (loadouts.Apply(index, selection, laboratory, CanSelectOffering) is not { } result) return null;
        await SaveArcaneBuildAsync();
        await TrySetLaboratoryAsync();
        if (result.Primary is { } primary) await SetPreferredPrimaryAsync(primary);
        selectedOffering = result.Offering;
        var missing = result.Skipped.Select(id => LaboratoryCatalog.Get(id).Name).ToList();
        if (result.OfferingSkipped is { } offering) missing.Add($"the {DragonEssenceCatalog.Get(offering).Name} offering");
        laboratoryNotice = missing.Count == 0 ? null
            : $"{string.Join(" and ", missing)} could not be restored from {loadouts[index]!.Name}; nothing was spent.";
        StateHasChanged();
        return result;
    }

    private bool CanSelectOffering(DragonEssenceId id) => essenceVault.Count(id) > 0 && RunOfferingCatalog.CanOffer(id, forgeProgression);

    private async Task SetPreferredPrimaryAsync(SpellId id)
    {
        if (preferredPrimary == id) return;
        preferredPrimary = id;
        try { await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, PreferredPrimaryKey, id.ToString()); }
        catch (JSException) { }
    }

    private async Task TryLoadLoadoutsAsync()
    {
        try
        {
            var primary = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, PreferredPrimaryKey);
            preferredPrimary = Enum.TryParse<SpellId>(primary, out var spell) && Enum.IsDefined(spell) ? spell : null;
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, LoadoutsKey);
            if (string.IsNullOrWhiteSpace(stored)) return;
            loadouts.Restore(JsonSerializer.Deserialize<HuntLoadoutSave>(stored));
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task TrySetLoadoutsAsync()
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, LoadoutsKey, JsonSerializer.Serialize(loadouts.ToSave()));
        }
        catch (JSException) { }
    }
}
