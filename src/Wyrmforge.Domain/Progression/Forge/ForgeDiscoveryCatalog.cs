using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Forge;

public static class ForgeDiscoveryCatalog
{
    public static IReadOnlyList<ForgeDiscoveryDefinition> All { get; } =
    [
        Create(
            ForgeDiscoveryId.Ashcraft,
            "Ashcraft",
            "Ashfang's stolen furnace reveals a permanent craft lineage built from heart, fang, and wing.",
            [DragonEssenceId.CinderHeart, DragonEssenceId.MoltenFang, DragonEssenceId.AshenWing]),
        Create(
            ForgeDiscoveryId.Stormcraft,
            "Stormcraft",
            "Stormcoil's living charge reveals a permanent craft lineage built from heart, scale, and wing.",
            [DragonEssenceId.StormHeart, DragonEssenceId.ChargedScale, DragonEssenceId.TempestWing]),
        Create(
            ForgeDiscoveryId.Rimecraft,
            "Rimecraft",
            "Rimeclaw's impossible frost reveals a permanent craft lineage built from heart, scale, and wing.",
            [DragonEssenceId.RimeHeart, DragonEssenceId.GlacialScale, DragonEssenceId.HoarfrostWing]),
        Create(
            ForgeDiscoveryId.Voidcraft,
            "Voidcraft",
            "Voidweaver's aether reveals a permanent craft lineage built from heart, scale, and wing.",
            [DragonEssenceId.VoidHeart, DragonEssenceId.NullScale, DragonEssenceId.PhaseWing]),
    ];

    public static ForgeDiscoveryDefinition Get(ForgeDiscoveryId id) => All.Single(definition => definition.Id == id);

    private static ForgeDiscoveryDefinition Create(ForgeDiscoveryId id, string name, string description, DragonEssenceId[] essences) =>
        new(id, name, description, new AnySecuredEssenceRequirement(new HashSet<DragonEssenceId>(essences)), []);
}
