using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Dragons;

public static class DragonCatalog
{
    public static DragonDefinition Ashfang { get; } = new(
        DragonId.Ashfang,
        "Ashfang",
        "Cinder Wyrm",
        SpellSchool.Fire,
        new DragonStats(34, 1100, 78),
        new DragonCombatProfile(
            new DragonMovementProfile(DragonMovementStyle.Pursue, 120, 190, 0, new DragonPhaseValues(1, 1.25)),
            new DragonAttackProfile(
                DragonAttackPattern.Cone,
                SpellId.FireBolt,
                new DragonPhaseValues(0.8, 0.55),
                new DragonPhaseValues(3.2, 2.4),
                new DragonPhaseValues(38, 50),
                DragonAttackGeometry.Cone(340, 0.4)),
            24,
            new DragonRewardProfile(2500, 10, 5)));

    public static DragonDefinition Stormcoil { get; } = new(
        DragonId.Stormcoil,
        "Stormcoil",
        "Tempest Wyrm",
        SpellSchool.Storm,
        new DragonStats(32, 1500, 92),
        new DragonCombatProfile(
            new DragonMovementProfile(DragonMovementStyle.Orbit, 160, 235, 0.55, new DragonPhaseValues(1, 1.2)),
            new DragonAttackProfile(
                DragonAttackPattern.SelfBurst,
                SpellId.ChainLightning,
                new DragonPhaseValues(0.9, 0.65),
                new DragonPhaseValues(2.8, 2.2),
                new DragonPhaseValues(34, 48),
                DragonAttackGeometry.Circle(235, 300)),
            30,
            new DragonRewardProfile(4000, 12, 8)));

    public static DragonDefinition Rimeclaw { get; } = new(
        DragonId.Rimeclaw,
        "Rimeclaw",
        "Glacier Wyrm",
        SpellSchool.Frost,
        new DragonStats(35, 1350, 72),
        new DragonCombatProfile(
            new DragonMovementProfile(DragonMovementStyle.Kite, 210, 305, 0.32, new DragonPhaseValues(1, 1.16)),
            new DragonAttackProfile(
                DragonAttackPattern.TargetBurst,
                SpellId.FrostShard,
                new DragonPhaseValues(1.05, 0.76),
                new DragonPhaseValues(3, 2.25),
                new DragonPhaseValues(42, 58),
                DragonAttackGeometry.Circle(118, 152)),
            22,
            new DragonRewardProfile(3200, 11, 6)));

    public static DragonDefinition Voidweaver { get; } = new(
        DragonId.Voidweaver,
        "Voidweaver",
        "Aether Wyrm",
        SpellSchool.Arcane,
        new DragonStats(31, 1425, 88),
        new DragonCombatProfile(
            new DragonMovementProfile(DragonMovementStyle.Orbit, 145, 255, 0.88, new DragonPhaseValues(1, 1.3)),
            new DragonAttackProfile(
                DragonAttackPattern.TargetBurst,
                SpellId.ArcaneOrb,
                new DragonPhaseValues(0.74, 0.5),
                new DragonPhaseValues(2.55, 1.85),
                new DragonPhaseValues(36, 54),
                DragonAttackGeometry.Circle(148, 195)),
            27,
            new DragonRewardProfile(3600, 11.5, 7)));

    public static IReadOnlyList<DragonDefinition> All { get; } = [Ashfang, Stormcoil, Rimeclaw, Voidweaver];

    public static DragonDefinition Get(DragonId id) => All.Single(dragon => dragon.Id == id);
}
