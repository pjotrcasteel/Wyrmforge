using Wyrmforge.Application.Abstractions.Randomness;

namespace Wyrmforge.Application.Runs.LevelUp;

/// <summary>
/// Fateweave (amendment §10): per-card rerolls. Charges are shared by the whole hunt and never refill on their own; every card slot
/// can be rewoven once per reward round. A rare slot shows a Gilded Fateweave instead: same charge, same once-per-slot rule, but a
/// chance at a stronger card within the same milestone. Golden flags are rolled once when the round opens, from a dedicated
/// stream seeded by the run, so re-rendering can never mint more of them and the main reward stream is never disturbed.
/// </summary>
/// <remarks>Starting charges, capacity and golden chance are provisional tuning, not product-owner-approved values.</remarks>
public sealed class FateweaveState(IRandomSource stream, int startingCharges = FateweaveState.DefaultStartingCharges, int capacity = FateweaveState.DefaultCapacity)
{
    public const int DefaultStartingCharges = 2;
    public const int DefaultCapacity = 4;
    public const double GoldenChance = 0.06;

    private bool[] used = [];
    private bool[] golden = [];

    public IRandomSource Stream { get; } = stream;

    public int Capacity { get; private set; } = Math.Max(0, capacity);

    public int Charges { get; private set; } = Math.Clamp(startingCharges, 0, Math.Max(0, capacity));

    public int Spent { get; private set; }

    public int GoldenOffered { get; private set; }

    public int GoldenSpent { get; private set; }

    public int Round { get; private set; }

    public int SlotCount => used.Length;

    /// <summary>Opens a new reward round. One golden draw per slot is always consumed, so the stream stays aligned across builds.</summary>
    public void BeginRound(int slots, Func<int, bool> canGild)
    {
        Round++;
        used = new bool[Math.Max(0, slots)];
        golden = new bool[used.Length];
        for (var slot = 0; slot < used.Length; slot++)
        {
            var lucky = Stream.NextDouble() < GoldenChance;
            golden[slot] = lucky && canGild(slot);
            if (golden[slot]) GoldenOffered++;
        }
    }

    public void EndRound()
    {
        used = [];
        golden = [];
    }

    public bool IsUsed(int slot) => slot >= 0 && slot < used.Length && used[slot];

    public bool IsGolden(int slot) => slot >= 0 && slot < golden.Length && golden[slot] && !used[slot];

    public bool CanSpend(int slot) => Charges > 0 && slot >= 0 && slot < used.Length && !used[slot];

    public void Spend(int slot)
    {
        if (!CanSpend(slot)) throw new InvalidOperationException("No Fateweave charge or the slot was already rewoven this round.");
        if (golden[slot]) GoldenSpent++;
        used[slot] = true;
        golden[slot] = false;
        Charges--;
        Spent++;
    }

    /// <summary>Hunt pickups and future Nexus nodes. Never exceeds the capacity; returns the charges actually granted.</summary>
    public int Grant(int amount = 1)
    {
        var granted = Math.Clamp(amount, 0, Capacity - Charges);
        Charges += granted;
        return granted;
    }

    public void RaiseCapacity(int amount) => Capacity += Math.Max(0, amount);
}