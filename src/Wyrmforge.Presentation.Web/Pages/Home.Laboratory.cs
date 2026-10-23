using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string LaboratoryKey = "wyrmforge.laboratory.v1";
    private const string FireballCoreKey = "wyrmforge.fireballCore.v1";
    private readonly FireballCoreState fireballCore = new();
    private IReadOnlyList<FireballMutationId> activeFireballMutations = [];
    private int activeFireballLevel = 1;
    private IReadOnlyList<MutationAmplifierAssignment> activeMutationAmplifiers = [];

    private readonly LaboratoryState laboratory = new();
    private IReadOnlyList<LaboratoryMutationId> activeLaboratoryMutations = [];
    private string? laboratoryNotice;
    private DragonId? activeResearchLead;
    private Wyrmforge.Domain.Progression.DragonEssences.DragonEssenceId? activeResearchSpecimen;
    private LaboratoryPrompt? researchPrompt;
    private bool openLaboratoryOnReturn;
    private LaboratoryMutationId? laboratoryFocus;

    private void DismissLaboratoryNotice() => laboratoryNotice = null;

    private void PrepareLaboratoryRun()
    {
        activeLaboratoryMutations = laboratory.PreparedFor(selection.Selected);
        activeFireballLevel = fireballCore.Level;
        activeFireballMutations = fireballCore.Equipped;
        activeMutationAmplifiers = mutationAmplifiers.ToSave();
        activeResearchLead = laboratory.LeadWyrm(essenceVault);
        activeResearchSpecimen = activeResearchLead is not null && laboratory.Tracked is { } tracked ? LaboratoryCatalog.Get(tracked).Stabilizer : null;
        researchPrompt = null;
    }

    private async Task TrackLaboratoryMutationAsync(LaboratoryMutationId? id)
    {
        if (id is { } mutation) { if (!laboratory.Track(mutation, essenceVault)) return; }
        else laboratory.Untrack();
        await TrySetLaboratoryAsync();
    }

    // Runs after the hunt's Essences are stored: a secured specimen ends its lead, a finished hunt that
    // missed it uses one of the lead's hunts, then the summary points at the most useful research step.
    private async Task RefreshResearchPromptAsync(bool leadHunted = false)
    {
        var changed = laboratory.ReconcileLead(essenceVault);
        if (leadHunted && laboratory.RecordLeadHunt(essenceVault) is { } lapsed)
        {
            var mutation = LaboratoryCatalog.Get(lapsed);
            laboratoryNotice = $"The {DragonCatalog.Get(mutation.SpecimenWyrm).Name} trail went cold after {LaboratoryState.LeadHuntLimit} hunts. Track {mutation.Name} again to renew it.";
            changed = true;
        }
        else changed |= leadHunted;
        if (changed) await TrySetLaboratoryAsync();
        researchPrompt = ForgeAvailable ? LaboratoryAdvisor.Next(laboratory, essenceVault, selection.Selected) : null;
    }

    private void OpenLaboratoryFromSummary()
    {
        laboratoryFocus = researchPrompt?.Mutation;
        ReturnToForge();
        openLaboratoryOnReturn = true;
    }

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

    // A socket equips (moving or swapping as needed); no socket unequips the mutation.
    private async Task EquipLaboratoryMutationAsync(LaboratoryMutationId id, ArcaneMutationSocketId? socket)
    {
        if (socket is { } target)
        {
            if (laboratory.Equip(id, target, selection.Selected) != MutationEquipResult.Equipped) return;
        }
        else if (!laboratory.Unequip(id)) return;
        laboratoryNotice = null;
        await TrySetLaboratoryAsync();
    }

    private async Task<bool> AssignFireballAmplifierAsync(string nodeId, FireballMutationId? mutation)
    {
        if (mutation is null)
        {
            if (!mutationAmplifiers.Clear(nodeId)) return false;
        }
        else
        {
            var descriptor = MutationAmplifierCatalog.ForFireball(mutation.Value);
            if (descriptor is null || !mutationAmplifiers.Assign(nodeId, descriptor, selection.Selected,
                MutationAmplifierCatalog.EquippedFireball(fireballCore))) return false;
        }

        await SaveArcaneBuildAsync();
        return true;
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

    private async Task TryLoadFireballCoreAsync()
    {
        try
        {
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, FireballCoreKey);
            if (!string.IsNullOrWhiteSpace(stored)) fireballCore.Restore(JsonSerializer.Deserialize<FireballCoreSave>(stored));
        }
        catch (JSException) { }
        catch (JsonException) { }
        if (fireballCore.DiscoverSecured(essenceVault.SecuredEssences)) await TrySetFireballCoreAsync();
    }

    private async Task TrySetFireballCoreAsync()
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, FireballCoreKey,
                JsonSerializer.Serialize(fireballCore.ToSave()));
        }
        catch (JSException) { }
    }

    private async Task<bool> CraftCinderNeedleAsync()
    {
        if (characterSchool != Wyrmforge.Domain.Spells.DivineArchetype.Pyromancer ||
            !fireballCore.CraftCinderNeedle(huntMaterials)) return false;
        // Save the permanent discovery before the materials, so interrupted writes
        // never consume the recipe without granting the mutator.
        await TrySetFireballCoreAsync();
        await TrySetHuntMaterialsAsync();
        return true;
    }

    private async Task<bool> UpgradeFireballCoreAsync()
    {
        if (characterSchool != Wyrmforge.Domain.Spells.DivineArchetype.Pyromancer) return false;
        if (!fireballCore.Upgrade(essenceVault, huntMaterials)) return false;
        // Match existing research saves: never lose resources if interrupted between writes.
        await TrySetFireballCoreAsync();
        await TrySetEssenceVaultAsync();
        await TrySetHuntMaterialsAsync();
        return true;
    }

    private async Task<bool> EquipFireballCoreAsync(int slot, FireballMutationId? mutation)
    {
        if (characterSchool != Wyrmforge.Domain.Spells.DivineArchetype.Pyromancer) return false;
        if (!fireballCore.Equip(slot, mutation)) return false;
        await TrySetFireballCoreAsync();
        return true;
    }

    private async Task RecordFireballDiscoveriesAsync(IEnumerable<Wyrmforge.Domain.Progression.DragonEssences.DragonEssenceId> secured)
    {
        if (fireballCore.DiscoverSecured(secured)) await TrySetFireballCoreAsync();
    }

}
