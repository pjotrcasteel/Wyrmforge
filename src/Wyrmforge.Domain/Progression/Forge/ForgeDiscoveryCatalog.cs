using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Forge;

public static class ForgeDiscoveryCatalog
{
    public static IReadOnlyList<ForgeDiscoveryDefinition> All { get; } =
    [
        Create(
            ForgeDiscoveryId.Ashcraft,
            "Ashcraft",
            "Ashfang's stolen furnace teaches the Forge how to shape fire-aligned offerings.",
            [DragonEssenceId.CinderHeart, DragonEssenceId.MoltenFang, DragonEssenceId.AshenWing]),
        Create(
            ForgeDiscoveryId.Stormcraft,
            "Stormcraft",
            "Stormcoil's living charge teaches the Forge how to bind momentum and lightning into offerings.",
            [DragonEssenceId.StormHeart, DragonEssenceId.ChargedScale, DragonEssenceId.TempestWing]),
        Create(
            ForgeDiscoveryId.Rimecraft,
            "Rimecraft",
            "Rimeclaw's impossible frost teaches the Forge how to preserve glacial power between runs.",
            [DragonEssenceId.RimeHeart, DragonEssenceId.GlacialScale, DragonEssenceId.HoarfrostWing]),
        Create(
            ForgeDiscoveryId.Voidcraft,
            "Voidcraft",
            "Voidweaver's aether teaches the Forge how to anchor unstable arcane offerings.",
            [DragonEssenceId.VoidHeart, DragonEssenceId.NullScale, DragonEssenceId.PhaseWing]),
    ];

    public static ForgeDiscoveryDefinition Get(ForgeDiscoveryId id) => All.Single(definition => definition.Id == id);

    private static ForgeDiscoveryDefinition Create(ForgeDiscoveryId id, string name, string description, DragonEssenceId[] essences)
    {
        var essenceSet = new HashSet<DragonEssenceId>(essences);
        return new ForgeDiscoveryDefinition(id, name, description, new AnySecuredEssenceRequirement(essenceSet),
            essences.Select(essence => (ForgeFeatureUnlock)new RunOfferingUnlock(essence)).ToArray());
    }
}
