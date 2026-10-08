using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.GreatHunt;

public sealed record GreatHuntOath(DragonId Wyrm, SpellId LineageSpell, ForgeDiscoveryId ForgeLineage, string Name, string Rune, string Legend);

public static class GreatHuntCatalog
{
    public static IReadOnlyList<GreatHuntOath> All { get; } =
    [
        new(DragonId.Ashfang, SpellId.FireBolt, ForgeDiscoveryId.Ashcraft, "Oath of the First Flame", "♨",
            "Cross the scar with living fire. The mountain remembers a hunter who dared to burn brighter."),
        new(DragonId.Stormcoil, SpellId.ChainLightning, ForgeDiscoveryId.Stormcraft, "Oath of the Unbroken Sky", "ϟ",
            "Move within the tempest, not against it. Every arc is a promise of the storm to come."),
        new(DragonId.Rimeclaw, SpellId.FrostShard, ForgeDiscoveryId.Rimecraft, "Oath of the Last Winter", "❆",
            "Where the glacier closes, find the one path forward and let the cold bear witness."),
        new(DragonId.Voidweaver, SpellId.ArcaneOrb, ForgeDiscoveryId.Voidcraft, "Oath Beyond the Veil", "✧",
            "Step through the echo and bring something back that the rift cannot forget."),
    ];

    public static GreatHuntOath Get(DragonId wyrm) => All.Single(oath => oath.Wyrm == wyrm);
}
