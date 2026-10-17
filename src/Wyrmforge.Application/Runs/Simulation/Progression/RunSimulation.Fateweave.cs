using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const int FateweaveSalt = 0x0FA7E5;
    private FateweaveState fateweave = new(new SeededRandomSource(FateweaveSalt));
    private readonly HashSet<string> fateweaveRetired = new(StringComparer.Ordinal);
    private bool fateweaveHasAlternative;

    public FateweaveSnapshot Fateweave => new(fateweave.Charges, fateweave.Capacity,
        Enumerable.Range(0, pendingChoices.Count).Select(slot => new FateweaveSlotSnapshot(
            fateweave.IsUsed(slot), fateweave.IsGolden(slot), fateweaveHasAlternative && fateweave.CanSpend(slot))).ToArray());

    public FateweaveState FateweaveLedger => fateweave;

    private void InitializeFateweave(int seed) =>
        fateweave = new FateweaveState(new SeededRandomSource(unchecked(seed * 31 + FateweaveSalt) & int.MaxValue));

    /// <summary>Spends one hunt-wide charge to replace only the card in <paramref name="slot"/>; the other cards stay put.</summary>
    public bool RerollChoice(int slot)
    {
        if (slot < 0 || slot >= pendingChoices.Count || !fateweaveHasAlternative || !fateweave.CanSpend(slot)) return false;
        var trail = PendingRewardSchool.HasValue;
        var replacement = levelChoiceService.Reweave(build, pendingChoices, slot, fateweaveRetired, level + 1, trail, Resonance,
            fateweave.IsGolden(slot), fateweave.Stream);
        if (replacement is null) return false;
        fateweave.Spend(slot);
        fateweaveRetired.Add(pendingChoices[slot].Id);
        var choices = pendingChoices.ToArray();
        choices[slot] = replacement;
        pendingChoices = choices;
        RefreshFateweaveAlternatives();
        return true;
    }

    private void OpenFateweaveRound()
    {
        fateweaveRetired.Clear();
        if (pendingChoices.Count == 0)
        {
            fateweave.EndRound();
            fateweaveHasAlternative = false;
            return;
        }
        var trail = PendingRewardSchool.HasValue;
        fateweave.BeginRound(pendingChoices.Count, slot => levelChoiceService.CanGild(build, pendingChoices, slot, fateweaveRetired, level + 1, trail));
        RefreshFateweaveAlternatives();
    }

    private void CloseFateweaveRound()
    {
        fateweave.EndRound();
        fateweaveRetired.Clear();
        fateweaveHasAlternative = false;
    }

    private void RefreshFateweaveAlternatives() => fateweaveHasAlternative = pendingChoices.Count > 0
        && levelChoiceService.CanReweave(build, pendingChoices, fateweaveRetired, level + 1, PendingRewardSchool.HasValue);
}