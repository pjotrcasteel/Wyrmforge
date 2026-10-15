namespace Wyrmforge.Domain.Combat.Interactions;

// Caps the secondary events (splashes, discharges) reactions may spawn in one simulation step, so a
// reaction chain can never recurse unboundedly or flood a crowded fight. Suppressed events are counted.
public sealed class ReactionBudget(int maxEventsPerStep)
{
    public int MaxEventsPerStep { get; } = maxEventsPerStep > 0 ? maxEventsPerStep : throw new ArgumentOutOfRangeException(nameof(maxEventsPerStep));
    public int SpentThisStep { get; private set; }
    public int PeakPerStep { get; private set; }
    public int Suppressed { get; private set; }

    public void BeginStep() => SpentThisStep = 0;

    public bool TrySpend()
    {
        if (SpentThisStep >= MaxEventsPerStep)
        {
            Suppressed++;
            return false;
        }
        SpentThisStep++;
        PeakPerStep = Math.Max(PeakPerStep, SpentThisStep);
        return true;
    }
}
