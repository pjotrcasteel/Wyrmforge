using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string LoadoutsKey = "wyrmforge.loadouts.v1";
    private const string PreferredPrimaryKey = "wyrmforge.preferredPrimary.v1";
    private const string CharacterSchoolKey = "wyrmforge.characterSchool.v1";
    private readonly HuntLoadoutBook loadouts = new();
    // The character's permanent school chooses their signature spell, independently of the Wyrm being hunted.
    private DivineArchetype? characterSchool;
    private SpellId? preferredPrimary;

    private async Task SaveLoadoutAsync(int index)
    {
        loadouts.Save(index, selection, laboratory, primary: preferredPrimary, offering: selectedOffering, mutationAmplifiers: mutationAmplifiers);
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
        selection.SetKnownFireballMutations(fireballCore.Discovered);
        if (loadouts.Apply(index, selection, laboratory, CanSelectOffering, mutationAmplifiers) is not { } result) return null;
        await SaveArcaneBuildAsync();
        await TrySetLaboratoryAsync();
        // A loadout cannot silently respec a character into another Divine Wyrm lineage.
        var skippedPrimary = result.Primary is { } primary && primary != preferredPrimary;
        selectedOffering = result.Offering;
        var missing = result.Skipped.Select(id => LaboratoryCatalog.Get(id).Name).ToList();
        if (skippedPrimary) missing.Add("a primary spell from another Divine school");
        if (result.OfferingSkipped is { } offering) missing.Add($"the {DragonEssenceCatalog.Get(offering).Name} offering");
        laboratoryNotice = missing.Count == 0 ? null
            : $"{string.Join(" and ", missing)} could not be restored from {loadouts[index]!.Name}; nothing was spent.";
        StateHasChanged();
        return result;
    }

    private bool CanSelectOffering(DragonEssenceId id) => essenceVault.Count(id) > 0 && RunOfferingCatalog.CanOffer(id, forgeProgression);

    private async Task ChooseCharacterSchoolAsync(DivineArchetype school)
    {
        if (characterSchool is not null || !DivineArchetypeCatalog.CanCreateCharacter(school)) return;
        var definition = DivineArchetypeCatalog.Get(school);
        if (definition.ExistingSignature is not { } signature) return;
        characterSchool = school;
        selection.SetActiveSchool(ArcaneSchoolCatalog.For(school));
        await SetPreferredPrimaryAsync(signature);
        await SaveCharacterSchoolAsync();
    }

    private async Task SetPreferredPrimaryAsync(SpellId id)
    {
        if (preferredPrimary == id) return;
        preferredPrimary = id;
        try { await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, PreferredPrimaryKey, id.ToString()); }
        catch (JSException) { }
    }

    private async Task SaveCharacterSchoolAsync()
    {
        if (characterSchool is null) return;
        try { await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, CharacterSchoolKey, characterSchool.Value.ToString()); }
        catch (JSException) { }
    }

    private async Task TryLoadLoadoutsAsync()
    {
        try
        {
            var primary = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, PreferredPrimaryKey);
            preferredPrimary = Enum.TryParse<SpellId>(primary, out var spell) && Enum.IsDefined(spell) ? spell : null;
            var savedSchool = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, CharacterSchoolKey);
            if (Enum.TryParse<DivineArchetype>(savedSchool, out var parsed) && Enum.IsDefined(parsed)
                && DivineArchetypeCatalog.Get(parsed).ExistingSignature is not null)
            {
                characterSchool = parsed;
            }
            else if (preferredPrimary is { } oldPrimary)
            {
                // Preserve pre-0.0.135 players' last committed primary instead of forcing another choice.
                characterSchool = DivineArchetypeCatalog.All.FirstOrDefault(definition => definition.ExistingSignature == oldPrimary)?.Id;
                if (characterSchool is not null) await SaveCharacterSchoolAsync();
            }
            if (characterSchool is { } school)
            {
                selection.SetActiveSchool(ArcaneSchoolCatalog.For(school));
                await SetPreferredPrimaryAsync(DivineArchetypeCatalog.Get(school).ExistingSignature!.Value);
            }
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
