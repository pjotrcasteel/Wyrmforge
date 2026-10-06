using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.Forge;

public static class ForgeMasteryCatalog
{
    public static IReadOnlyList<ForgeMasteryDefinition> All { get; } =
    [
        new(
            ForgeMasteryId.AshEmberKnowledge,
            ForgeDiscoveryId.Ashcraft,
            1,
            "Ember Knowledge",
            "Bind a Cinder Heart into the Forge and learn how to carry Ashfang's fire into a future run.",
            DragonEssenceId.CinderHeart,
            null,
            [new RunOfferingUnlock(DragonEssenceId.CinderHeart)]),
        new(
            ForgeMasteryId.AshMoltenSmithing,
            ForgeDiscoveryId.Ashcraft,
            2,
            "Molten Smithing",
            "Temper a Molten Fang into a permanent Cinder Needle blueprint and a second Ash offering recipe.",
            DragonEssenceId.MoltenFang,
            ForgeMasteryId.AshEmberKnowledge,
            [new RunOfferingUnlock(DragonEssenceId.MoltenFang), new SpellPoolUnlock(SpellId.CinderNeedle)]),
        new(
            ForgeMasteryId.AshenMasterwork,
            ForgeDiscoveryId.Ashcraft,
            3,
            "Ashen Masterwork",
            "Forge an Ashen Wing into a masterwork pattern that adds Emberheart Charm to future relic pools.",
            DragonEssenceId.AshenWing,
            ForgeMasteryId.AshMoltenSmithing,
            [new RunOfferingUnlock(DragonEssenceId.AshenWing), new RelicPoolUnlock(RelicId.EmberheartCharm)]),

        new(
            ForgeMasteryId.StormheartBinding,
            ForgeDiscoveryId.Stormcraft,
            1,
            "Stormheart Binding",
            "Ground a Storm Heart in the Forge and learn to begin future runs with its living charge.",
            DragonEssenceId.StormHeart,
            null,
            [new RunOfferingUnlock(DragonEssenceId.StormHeart)]),
        new(
            ForgeMasteryId.ChargedSmithing,
            ForgeDiscoveryId.Stormcraft,
            2,
            "Charged Smithing",
            "Break a Charged Scale into a permanent Ball Lightning blueprint and another Storm offering recipe.",
            DragonEssenceId.ChargedScale,
            ForgeMasteryId.StormheartBinding,
            [new RunOfferingUnlock(DragonEssenceId.ChargedScale), new SpellPoolUnlock(SpellId.BallLightning)]),
        new(
            ForgeMasteryId.TempestMasterwork,
            ForgeDiscoveryId.Stormcraft,
            3,
            "Tempest Masterwork",
            "Capture a Tempest Wing's momentum in a masterwork pattern that adds Stormhook to future relic pools.",
            DragonEssenceId.TempestWing,
            ForgeMasteryId.ChargedSmithing,
            [new RunOfferingUnlock(DragonEssenceId.TempestWing), new RelicPoolUnlock(RelicId.Stormhook)]),

        new(
            ForgeMasteryId.RimeheartBinding,
            ForgeDiscoveryId.Rimecraft,
            1,
            "Rimeheart Binding",
            "Anchor a Rime Heart inside the Forge and preserve its impossible cold as a future offering.",
            DragonEssenceId.RimeHeart,
            null,
            [new RunOfferingUnlock(DragonEssenceId.RimeHeart)]),
        new(
            ForgeMasteryId.GlacialSmithing,
            ForgeDiscoveryId.Rimecraft,
            2,
            "Glacial Smithing",
            "Carve a Glacial Scale into a permanent Ice Lance blueprint and another Rime offering recipe.",
            DragonEssenceId.GlacialScale,
            ForgeMasteryId.RimeheartBinding,
            [new RunOfferingUnlock(DragonEssenceId.GlacialScale), new SpellPoolUnlock(SpellId.IceLance)]),
        new(
            ForgeMasteryId.HoarfrostMasterwork,
            ForgeDiscoveryId.Rimecraft,
            3,
            "Hoarfrost Masterwork",
            "Shape a Hoarfrost Wing into a masterwork pattern that adds Ironbark Totem to future relic pools.",
            DragonEssenceId.HoarfrostWing,
            ForgeMasteryId.GlacialSmithing,
            [new RunOfferingUnlock(DragonEssenceId.HoarfrostWing), new RelicPoolUnlock(RelicId.IronbarkTotem)]),

        new(
            ForgeMasteryId.VoidheartBinding,
            ForgeDiscoveryId.Voidcraft,
            1,
            "Voidheart Binding",
            "Stabilize a Void Heart in the Forge and learn to carry its aether into a future run.",
            DragonEssenceId.VoidHeart,
            null,
            [new RunOfferingUnlock(DragonEssenceId.VoidHeart)]),
        new(
            ForgeMasteryId.NullSmithing,
            ForgeDiscoveryId.Voidcraft,
            2,
            "Null Smithing",
            "Etch a Null Scale into a permanent Aether Dart blueprint and another Void offering recipe.",
            DragonEssenceId.NullScale,
            ForgeMasteryId.VoidheartBinding,
            [new RunOfferingUnlock(DragonEssenceId.NullScale), new SpellPoolUnlock(SpellId.AetherDart)]),
        new(
            ForgeMasteryId.PhaseMasterwork,
            ForgeDiscoveryId.Voidcraft,
            3,
            "Phase Masterwork",
            "Fix a Phase Wing between realities to add Mirror Prism to future relic pools.",
            DragonEssenceId.PhaseWing,
            ForgeMasteryId.NullSmithing,
            [new RunOfferingUnlock(DragonEssenceId.PhaseWing), new RelicPoolUnlock(RelicId.MirrorPrism)]),
    ];

    public static ForgeMasteryDefinition Get(ForgeMasteryId id) => All.Single(definition => definition.Id == id);

    public static IReadOnlyList<ForgeMasteryDefinition> For(ForgeDiscoveryId lineage) => All.Where(definition => definition.Lineage == lineage).OrderBy(definition => definition.Tier).ToArray();
}
