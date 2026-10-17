namespace Wyrmforge.Application.Runs.LevelUp;

public sealed record FateweaveSnapshot(int Charges, int Capacity, IReadOnlyList<FateweaveSlotSnapshot> Slots);

/// <summary>One card's reroll control: already rewoven this round, showing a golden opportunity, and whether it can be used now.</summary>
public sealed record FateweaveSlotSnapshot(bool Used, bool Golden, bool Available);