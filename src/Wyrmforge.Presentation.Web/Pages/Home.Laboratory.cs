using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Domain.Progression.Laboratory;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string LaboratoryKey = "wyrmforge.laboratory.v1";
    private readonly LaboratoryState laboratory = new();
    private LaboratoryMutationId? activeLaboratoryMutation;
    private string? laboratoryNotice;

    private void DismissLaboratoryNotice() => laboratoryNotice = null;

    private async Task<LaboratoryExperimentResult> RunLaboratoryExperimentAsync(LaboratoryExperimentId id)
    {
        var result = laboratory.Run(id, essenceVault);
        if (result.Novel) await TrySetLaboratoryAsync();
        return result;
    }

    // Consent is collected by the Laboratory UI; this is only invoked after the player confirms the exact spend.
    private async Task<bool> StabilizeLaboratoryMutationAsync(LaboratoryMutationId id)
    {
        var stabilizer = LaboratoryCatalog.Get(id).Stabilizer;
        if (!laboratory.Stabilize(id, essenceVault, consentToConsume: true)) return false;
        if (selectedOffering == stabilizer && essenceVault.Count(stabilizer) == 0) selectedOffering = null;
        // Save the recipe before the vault: an interrupted write can only leave the player with an extra Essence, never a lost one.
        await TrySetLaboratoryAsync();
        await TrySetEssenceVaultAsync();
        return true;
    }

    private async Task EquipLaboratoryMutationAsync(LaboratoryMutationId? id)
    {
        if (id is { } mutation)
        {
            if (laboratory.Equip(mutation, selection.Selected) != MutationEquipResult.Equipped) return;
        }
        else laboratory.Unequip();
        laboratoryNotice = null;
        await TrySetLaboratoryAsync();
    }

    private async Task SaveArcaneSelectionAsync()
    {
        await SaveArcaneBuildAsync();
        if (laboratory.ReconcileSocket(selection.Selected) is not { } message) return;
        laboratoryNotice = message;
        await TrySetLaboratoryAsync();
    }

    private async Task TryLoadLaboratoryAsync()
    {
        try
        {
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, LaboratoryKey);
            if (string.IsNullOrWhiteSpace(stored)) return;
            laboratory.Restore(JsonSerializer.Deserialize<LaboratorySave>(stored));
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task TrySetLaboratoryAsync()
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, LaboratoryKey, JsonSerializer.Serialize(laboratory.ToSave()));
        }
        catch (JSException) { }
    }
}
