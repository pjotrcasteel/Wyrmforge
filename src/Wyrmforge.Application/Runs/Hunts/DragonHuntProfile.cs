using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Hunts;

public sealed record DragonHuntPoint(double X, double Y);

public sealed record DragonHuntEntranceProfile(DragonHuntEntranceStyle Style, double DurationSeconds, DragonHuntPoint Start, DragonHuntPoint Destination);

public sealed record DragonHuntPressureCadence(DragonPhaseValues IntervalSeconds, DragonPhaseValues TelegraphSeconds);

public sealed record DragonHuntPressureProfile(
    DragonHuntPressureOrigin Origin,
    DragonHuntPressureCadence Cadence,
    DragonPhaseValues Radius,
    DragonPhaseValues Damage,
    int Strikes,
    SpellId VisualSpell);

public sealed record DragonHuntProfile(
    DragonId Dragon,
    DragonHuntEntranceProfile Entrance,
    DragonHuntArenaTrait Arena,
    double PhaseBreakSeconds,
    DragonHuntPressureProfile Pressure);
