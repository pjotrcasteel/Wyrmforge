namespace Wyrmforge.Domain.Combat.Modifiers;

public sealed record BuildStatModifier(BuildStatId Stat, BuildStatOperation Operation, double Value);
