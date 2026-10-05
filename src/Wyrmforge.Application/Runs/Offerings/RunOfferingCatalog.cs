using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;
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
        new(DragonEssenceId.StormHeart, "Begin the run with Chain Lightning I already learned.", StartingSpell: SpellId.ChainLightning),
        new(DragonEssenceId.ChargedScale, "Begin the run with Vitality I: +18 maximum vitality.", StartingUpgrade: RunUpgradeId.Vitality),
        new(DragonEssenceId.TempestWing, "Begin the run with Fleetfoot I: +10% movement speed.", StartingUpgrade: RunUpgradeId.Fleetfoot),
        new(DragonEssenceId.RimeHeart, "Begin the run with Frost Shard I already learned.", StartingSpell: SpellId.FrostShard),
        new(DragonEssenceId.GlacialScale, "Begin the run with Frost Touch I: repeated hits can freeze enemies.", StartingUpgrade: RunUpgradeId.FrostTouch),
        new(DragonEssenceId.HoarfrostWing, "Begin the run with Fleetfoot I: +10% movement speed.", StartingUpgrade: RunUpgradeId.Fleetfoot),
        new(DragonEssenceId.VoidHeart, "Begin the run with Arcane Orb I already learned.", StartingSpell: SpellId.ArcaneOrb),
        new(DragonEssenceId.NullScale, "Begin the run with Quickening I: cast 12% faster.", StartingUpgrade: RunUpgradeId.Quickening),
        new(DragonEssenceId.PhaseWing, "Begin the run with Multicast I: +1 projectile per cast.", StartingUpgrade: RunUpgradeId.Multicast),
    ];

    public static bool CanOffer(DragonEssenceId id, ForgeProgressionState progression) => All.Any(offering => offering.EssenceId == id) && progression.UnlocksOffering(id);

    public static RunOfferingDefinition Get(DragonEssenceId id) => All.Single(offering => offering.EssenceId == id);
}
