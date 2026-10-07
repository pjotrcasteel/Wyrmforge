using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Hunts;

public static class DragonHuntCatalog
{
    public static DragonHuntProfile Ashfang { get; } = new(
        DragonId.Ashfang,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.SkyDive, 0.55, 0.85, 0.70, new DragonHuntPoint(0.5, -0.12), new DragonHuntPoint(0.5, 0.2)),
        DragonHuntArenaTrait.CinderScar,
        1.05,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.Player,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.2, 3.15), new DragonPhaseValues(0.72, 0.52)),
            new DragonPhaseValues(82, 108),
            new DragonPhaseValues(20, 28),
            1,
            SpellId.FireBolt),
        new DragonHuntSignatureProfile(
            DragonHuntSignatureKind.CinderSweep,
            "Cinder Sweep",
            new DragonPhaseValues(9.2, 6.8),
            new DragonPhaseValues(0.95, 0.72),
            new DragonPhaseValues(54, 62),
            new DragonPhaseValues(26, 34),
            4,
            5,
            SpellId.FireBolt),
        "THE SCAR IGNITES");

    public static DragonHuntProfile Stormcoil { get; } = new(
        DragonId.Stormcoil,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.ThunderSweep, 0.55, 0.95, 0.70, new DragonHuntPoint(-0.12, 0.22), new DragonHuntPoint(0.5, 0.2)),
        DragonHuntArenaTrait.StormField,
        0.95,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.ArenaRandom,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.5, 3.2), new DragonPhaseValues(0.78, 0.55)),
            new DragonPhaseValues(70, 88),
            new DragonPhaseValues(16, 23),
            3,
            SpellId.ChainLightning),
        new DragonHuntSignatureProfile(
            DragonHuntSignatureKind.TempestCage,
            "Tempest Cage",
            new DragonPhaseValues(8.8, 6.2),
            new DragonPhaseValues(1.0, 0.75),
            new DragonPhaseValues(46, 54),
            new DragonPhaseValues(22, 30),
            6,
            8,
            SpellId.ChainLightning),
        "THE STORM CLOSES");

    public static DragonHuntProfile Rimeclaw { get; } = new(
        DragonId.Rimeclaw,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.IceBreak, 0.65, 1.00, 0.75, new DragonHuntPoint(0.5, -0.14), new DragonHuntPoint(0.5, 0.21)),
        DragonHuntArenaTrait.FrozenBasin,
        1.2,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.Player,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.8, 3.45), new DragonPhaseValues(1.05, 0.76)),
            new DragonPhaseValues(125, 158),
            new DragonPhaseValues(24, 33),
            1,
            SpellId.FrostShard),
        new DragonHuntSignatureProfile(
            DragonHuntSignatureKind.GlacialWall,
            "Glacial Wall",
            new DragonPhaseValues(10.2, 7.4),
            new DragonPhaseValues(1.15, 0.86),
            new DragonPhaseValues(54, 62),
            new DragonPhaseValues(28, 38),
            5,
            7,
            SpellId.FrostShard),
        "THE BASIN FREEZES");

    public static DragonHuntProfile Voidweaver { get; } = new(
        DragonId.Voidweaver,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.RiftPhase, 0.50, 0.80, 0.70, new DragonHuntPoint(1.12, 0.18), new DragonHuntPoint(0.62, 0.22)),
        DragonHuntArenaTrait.AetherFracture,
        0.85,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.ArenaRandom,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.1, 2.9), new DragonPhaseValues(0.68, 0.48)),
            new DragonPhaseValues(92, 122),
            new DragonPhaseValues(19, 27),
            2,
            SpellId.ArcaneOrb),
        new DragonHuntSignatureProfile(
            DragonHuntSignatureKind.RiftEcho,
            "Rift Echo",
            new DragonPhaseValues(8.4, 5.8),
            new DragonPhaseValues(0.82, 0.62),
            new DragonPhaseValues(62, 74),
            new DragonPhaseValues(24, 34),
            2,
            3,
            SpellId.ArcaneOrb),
        "THE RIFT ANSWERS");

    public static IReadOnlyList<DragonHuntProfile> All { get; } = [Ashfang, Stormcoil, Rimeclaw, Voidweaver];

    public static DragonHuntProfile Get(DragonId id) => All.Single(profile => profile.Dragon == id);
}
