using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.Hunts;

public static class AscendantAshfangRule
{
    public static bool ShouldForceAshfang(bool riteSelected, bool alreadyAttempted, int depth) => riteSelected && !alreadyAttempted && depth >= 2;
    public static bool IsEncounter(bool riteSelected, bool alreadyAttempted, int depth, DragonId wyrm) =>
        wyrm == DragonId.Ashfang && ShouldForceAshfang(riteSelected, alreadyAttempted, depth);
}
