using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Hunts;

public static class DragonHuntCatalog
{
    public static DragonHuntProfile Ashfang { get; } = new(
        DragonId.Ashfang,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.SkyDive, 1.25, new DragonHuntPoint(0.5, -0.12), new DragonHuntPoint(0.5, 0.2)),
        DragonHuntArenaTrait.CinderScar,
        1.05,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.Player,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.2, 3.15), new DragonPhaseValues(0.72, 0.52)),
            new DragonPhaseValues(82, 108),
            new DragonPhaseValues(20, 28),
            1,
            SpellId.FireBolt));

    public static DragonHuntProfile Stormcoil { get; } = new(
        DragonId.Stormcoil,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.ThunderSweep, 1.4, new DragonHuntPoint(-0.12, 0.22), new DragonHuntPoint(0.5, 0.2)),
        DragonHuntArenaTrait.StormField,
        0.95,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.ArenaRandom,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.5, 3.2), new DragonPhaseValues(0.78, 0.55)),
            new DragonPhaseValues(70, 88),
            new DragonPhaseValues(16, 23),
            3,
            SpellId.ChainLightning));

    public static DragonHuntProfile Rimeclaw { get; } = new(
        DragonId.Rimeclaw,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.IceBreak, 1.55, new DragonHuntPoint(0.5, -0.14), new DragonHuntPoint(0.5, 0.21)),
        DragonHuntArenaTrait.FrozenBasin,
        1.2,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.Player,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.8, 3.45), new DragonPhaseValues(1.05, 0.76)),
            new DragonPhaseValues(125, 158),
            new DragonPhaseValues(24, 33),
            1,
            SpellId.FrostShard));

    public static DragonHuntProfile Voidweaver { get; } = new(
        DragonId.Voidweaver,
        new DragonHuntEntranceProfile(DragonHuntEntranceStyle.RiftPhase, 1.2, new DragonHuntPoint(1.12, 0.18), new DragonHuntPoint(0.62, 0.22)),
        DragonHuntArenaTrait.AetherFracture,
        0.85,
        new DragonHuntPressureProfile(
            DragonHuntPressureOrigin.ArenaRandom,
            new DragonHuntPressureCadence(new DragonPhaseValues(4.1, 2.9), new DragonPhaseValues(0.68, 0.48)),
            new DragonPhaseValues(92, 122),
            new DragonPhaseValues(19, 27),
            2,
            SpellId.ArcaneOrb));

    public static IReadOnlyList<DragonHuntProfile> All { get; } = [Ashfang, Stormcoil, Rimeclaw, Voidweaver];

    public static DragonHuntProfile Get(DragonId id) => All.Single(profile => profile.Dragon == id);
}
