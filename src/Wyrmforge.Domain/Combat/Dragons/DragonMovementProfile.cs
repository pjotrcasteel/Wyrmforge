namespace Wyrmforge.Domain.Combat.Dragons;

public sealed record DragonMovementProfile(
    DragonMovementStyle Style,
    double MinimumRange,
    double MaximumRange,
    double TangentWeight,
    DragonPhaseValues SpeedMultiplier);
