using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.GreatHunt;

namespace Wyrmforge.Application.Runs.Hunts;

public static class AscendantHuntRule
{
    public static bool ShouldForce(DragonId? selected, bool alreadyAttempted, int depth) =>
        selected is { } wyrm && AscendantRiteCatalog.IsAvailable(wyrm) && !alreadyAttempted && depth >= 2;

    public static bool IsEncounter(DragonId? selected, bool alreadyAttempted, int depth, DragonId wyrm) =>
        selected == wyrm && ShouldForce(selected, alreadyAttempted, depth);
}
