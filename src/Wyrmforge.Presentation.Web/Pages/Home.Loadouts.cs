using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Loadouts;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string LoadoutsKey = "wyrmforge.loadouts.v1";
    private readonly HuntLoadoutBook loadouts = new();

    private async Task SaveLoadoutAsync(int index)
    {
        loadouts.Save(index, selection, laboratory);
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
        if (loadouts.Apply(index, selection, laboratory) is not { } result) return null;
        await SaveArcaneBuildAsync();
        await TrySetLaboratoryAsync();
        laboratoryNotice = result.Skipped.Count == 0 ? null
            : $"{string.Join(" and ", result.Skipped.Select(id => LaboratoryCatalog.Get(id).Name))} could not be re-equipped from {loadouts[index]!.Name}; the recipe is kept.";
        StateHasChanged();
        return result;
    }

    private async Task TryLoadLoadoutsAsync()
    {
        try
        {
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
