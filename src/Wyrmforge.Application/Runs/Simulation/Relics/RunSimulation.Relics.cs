using Wyrmforge.Application.Runs.Relics;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly RelicChoiceService relicChoiceService = new();
    private IReadOnlyList<RelicDefinition> pendingRelicChoices = [];

    public IReadOnlyList<RelicDefinition> PendingRelicChoices => pendingRelicChoices;
    public IReadOnlyList<RelicDefinition> OwnedRelics => build.Relics.Owned.Select(RelicCatalog.Get).ToArray();
    public IReadOnlyList<RelicDefinition> EquippedRelics => build.Relics.Equipped.Select(RelicCatalog.Get).ToArray();
    public int RelicSlots => RelicInventoryState.MaxEquipped;

    public bool ApplyRelicChoice(RelicId id, RelicId? replacement = null)
    {
        var choice = pendingRelicChoices.SingleOrDefault(candidate => candidate.Id == id);
        if (!build.Relics.HasFreeSlot && (replacement is null || !build.Relics.IsEquipped(replacement.Value))) return false;
        if (choice is null || !build.Relics.Acquire(id)) return false;
        pendingRelicChoices = [];
        if (build.Relics.HasFreeSlot) build.Relics.TryEquip(id);
        else build.Relics.TryReplace(replacement!.Value, id);
        RefreshRelicEffects();
        return true;
    }

    public bool EquipRelic(RelicId id)
    {
        if (!AtCheckpoint || !build.Relics.TryEquip(id)) return false;
        RefreshRelicEffects();
        return true;
    }

    public bool UnequipRelic(RelicId id)
    {
        if (!AtCheckpoint || !build.Relics.TryUnequip(id)) return false;
        RefreshRelicEffects();
        return true;
    }

    private void OfferRelicChoice()
    {
        if (pendingRelicChoices.Count > 0) return;
        pendingRelicChoices = relicChoiceService.Roll(build.Relics, randomSource, availableRelics);
    }

    public void OpenRewardCache() => OfferRelicChoice();

    private void RefreshRelicEffects() => RefreshBuildModifiers(true);
}
