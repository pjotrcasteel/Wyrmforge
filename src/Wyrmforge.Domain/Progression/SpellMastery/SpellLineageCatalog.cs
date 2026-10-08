using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Domain.Progression.SpellMastery;

public sealed record SpellLineageDefinition(SpellId Spell, DragonId Wyrm, SpellEvolutionId Evolution, string Clue, int RequiredRuns = 4);

public static class SpellLineageCatalog
{
    public static IReadOnlyList<SpellLineageDefinition> All { get; } =
    [
        new(SpellId.FireBolt, DragonId.Ashfang, SpellEvolutionId.Wyrmfire,
            "A flame tempered through repeated hunts must taste Ashfang's heart."),
        new(SpellId.FrostShard, DragonId.Rimeclaw, SpellEvolutionId.GlacialRequiem,
            "Only the hunter who masters the shard and overcomes Rimeclaw can command this winter."),
        new(SpellId.ChainLightning, DragonId.Stormcoil, SpellEvolutionId.TempestAscendant,
            "The storm remembers those who master lightning before felling Stormcoil."),
        new(SpellId.ArcaneOrb, DragonId.Voidweaver, SpellEvolutionId.VoidConstellation,
            "Confront Voidweaver with a mastered orb and the rift may answer."),
    ];

    public static SpellLineageDefinition Get(SpellId spell) => All.Single(definition => definition.Spell == spell);
}
