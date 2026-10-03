using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Offerings;

public static class RunOfferingCatalog
{
    public static IReadOnlyList<RunOfferingDefinition> All { get; } =
    [
        new(DragonEssenceId.CinderHeart, "Begin the run with Fire Bolt I already learned.", StartingSpell: SpellId.FireBolt),
        new(DragonEssenceId.MoltenFang, "Begin the run with Potency I: +18% spell damage.", StartingUpgrade: RunUpgradeId.Potency),
        new(DragonEssenceId.AshenWing, "Begin the run with Fleetfoot I: +10% movement speed.", StartingUpgrade: RunUpgradeId.Fleetfoot),
    ];

    public static RunOfferingDefinition Get(DragonEssenceId id) => All.Single(offering => offering.EssenceId == id);
}
