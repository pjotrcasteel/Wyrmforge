using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Hunts;

public static class DragonHuntCatalog
{
    public static DragonHuntProfile Ashfang { get; } = new(
        DragonId.Ashfang,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.SkyDive, 0.55, 0.85, 1.20, new DragonHuntPoint(0.5, -0.12), new DragonHuntPoint(0.5, 0.2)),
        DragonHuntArenaTrait.CinderScar,
        1.8,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.Player,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.2, 3.15), new DragonPhaseValues(0.72, 0.85)),
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
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.ThunderSweep, 0.55, 0.95, 1.20, new DragonHuntPoint(-0.12, 0.22), new DragonHuntPoint(0.5, 0.2)),
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
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.IceBreak, 0.65, 1.00, 1.20, new DragonHuntPoint(0.5, -0.14), new DragonHuntPoint(0.5, 0.21)),
        DragonHuntArenaTrait.FrozenBasin,
        1.2,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.Player,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.8, 3.45), new DragonPhaseValues(1.05, 1.15)),
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
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.RiftPhase, 0.50, 0.80, 1.20, new DragonHuntPoint(1.12, 0.18), new DragonHuntPoint(0.62, 0.22)),
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

    // The first post-oath encounter: distinct crownfall lanes, a longer omen and a stronger second act.
    public static DragonHuntProfile AscendantAshfang { get; } = Ashfang with
    {
        Entrance = Ashfang.Entrance with { OmenSeconds = 1.0, TravelSeconds = 1.15, RevealSeconds = 1.6 },
        PhaseBreakSeconds = 1.7,
        Pressure = Ashfang.Pressure with
        {
            Cadence = new DragonHuntPressureCadence(new DragonPhaseValues(5.1, 3.8), new DragonPhaseValues(0.95, 0.75)),
        },
        Signature = Ashfang.Signature with
        {
            Kind = DragonHuntSignatureKind.Crownfall,
            Name = "Crownfall",
            IntervalSeconds = new DragonPhaseValues(10, 7.8),
            TelegraphSeconds = new DragonPhaseValues(1.1, 0.95),
            Radius = new DragonPhaseValues(40, 46),
            Damage = new DragonPhaseValues(26, 34),
            PhaseOneStrikes = 6,
            PhaseTwoStrikes = 9,
        },
        PhaseTwoCallout = "THE CROWN DIVIDES THE SKY",
    };


    // A moving three-beat lightning puzzle: transverse crossing, longitudinal crossing,
    // then a diagonal discharge during the second phase. Entirely separate from Tempest Cage.
    public static DragonHuntProfile AscendantStormcoil { get; } = Stormcoil with
    {
        Entrance = Stormcoil.Entrance with { OmenSeconds = 0.95, TravelSeconds = 1.1, RevealSeconds = 1.65 },
        PhaseBreakSeconds = 1.8,
        Pressure = Stormcoil.Pressure with
        {
            Cadence = new DragonHuntPressureCadence(new DragonPhaseValues(5.2, 4.0), new DragonPhaseValues(0.98, 0.8)),
        },
        Signature = Stormcoil.Signature with
        {
            Kind = DragonHuntSignatureKind.SkybreakCrossing,
            Name = "Skybreak Crossing",
            IntervalSeconds = new DragonPhaseValues(10.4, 7.6),
            TelegraphSeconds = new DragonPhaseValues(1.15, 0.95),
            Radius = new DragonPhaseValues(36, 40),
            Damage = new DragonPhaseValues(24, 32),
            PhaseOneStrikes = 10,
            PhaseTwoStrikes = 15,
        },
        PhaseTwoCallout = "THE STORM REVERSES ITS CURRENT",
    };

    // Fire Tier III. The Elder keeps the Crownfall but its own ground smoulders: each pressure beat ignites a wide ring under the Wyrm.
    // Ashfang pursues to 120-190 px, so the ring leaves only a narrow band beyond it: the hunter must keep moving at the edge of its reach.
    public static DragonHuntProfile ElderAshfang { get; } = AscendantAshfang with
    {
        Entrance = AscendantAshfang.Entrance with { OmenSeconds = 1.2, TravelSeconds = 1.25, RevealSeconds = 1.8 },
        PhaseBreakSeconds = 1.9,
        Pressure = AscendantAshfang.Pressure with
        {
            Origin = DragonHuntPressureOrigin.Dragon,
            Cadence = new DragonHuntPressureCadence(new DragonPhaseValues(4.6, 3.4), new DragonPhaseValues(1.05, 0.85)),
            Radius = new DragonPhaseValues(130, 165),
            Damage = new DragonPhaseValues(20, 28),
        },
        Signature = AscendantAshfang.Signature with { PhaseOneStrikes = 7, PhaseTwoStrikes = 10 },
        PhaseTwoCallout = "THE ELDER'S GROUND BURNS",
    };

    public static DragonHuntProfile GetElder(DragonId id) => id switch
    {
        DragonId.Ashfang => ElderAshfang,
        _ => throw new ArgumentOutOfRangeException(nameof(id), id, "Only Elder Ashfang is authored."),
    };

    public static DragonHuntProfile GetAscendant(DragonId id) => id switch
    {
        DragonId.Ashfang => AscendantAshfang,
        DragonId.Stormcoil => AscendantStormcoil,
        _ => throw new InvalidOperationException($"No Ascendant encounter has been implemented for {id}."),
    };

    public static IReadOnlyList<DragonHuntProfile> All { get; } = [Ashfang, Stormcoil, Rimeclaw, Voidweaver];

    public static DragonHuntProfile Get(DragonId id) => All.Single(profile => profile.Dragon == id);
}
