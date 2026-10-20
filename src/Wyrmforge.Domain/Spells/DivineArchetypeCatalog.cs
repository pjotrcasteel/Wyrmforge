using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Domain.Spells;

/// <summary>
/// The six character creation archetypes originate from distinct Divine Wyrms.
/// Not the same thing as the encounter region selected at the World Gate.
/// </summary>
public enum DivineArchetype
{
    Pyromancer,
    Cryomancer,
    Stormcaller,
    Arcanist,
    Necromancer,
    Summoner,
}

/// <summary>
/// Future mutation progression requirement, independent of encounter WyrmTier and temporary spell rank.
/// Do not interpret a tier enum value as an unlocked feature without character progression evidence.
/// </summary>
public enum MutationMasteryTier
{
    TierI = 1,
    TierII = 2,
    TierIII = 3,
    TierIV = 4,
    TierV = 5,
}

/// <summary>
/// Defines the Divine magic fantasy; existing links are migration anchors, not a declaration
/// that character creation, Death/Binding, or higher-tier combat has shipped.
/// Divine Wyrm identities have intentionally not been named.
/// </summary>
public sealed record DivineArchetypeDefinition(
    DivineArchetype Id,
    string Name,
    string Domain,
    string CombatIdentity,
    SpellSchool? ExistingSchool,
    SpellId? ExistingSignature,
    DragonId? ExistingLesserWyrm);

public static class DivineArchetypeCatalog
{
    public static IReadOnlyList<DivineArchetypeDefinition> All { get; } =
    [
        new(DivineArchetype.Pyromancer, "Pyromancer", "Fire", "Burning, explosions and area denial",
            SpellSchool.Fire, SpellId.FireBolt, DragonId.Ashfang),
        new(DivineArchetype.Cryomancer, "Cryomancer", "Frost", "Freezing, shattering and protection",
            SpellSchool.Frost, SpellId.FrostShard, DragonId.Rimeclaw),
        new(DivineArchetype.Stormcaller, "Stormcaller", "Storm", "Chaining, disruption and tempo",
            SpellSchool.Storm, SpellId.ChainLightning, DragonId.Stormcoil),
        new(DivineArchetype.Arcanist, "Arcanist", "Arcane", "Echoes, redirection and spell shaping",
            SpellSchool.Arcane, SpellId.ArcaneOrb, DragonId.Voidweaver),
        new(DivineArchetype.Necromancer, "Necromancer", "Death", "Curses, corpses and reanimation",
            null, null, null),
        new(DivineArchetype.Summoner, "Summoner", "Binding", "Bound companions, formations and commands",
            null, null, null),
    ];

    public static DivineArchetypeDefinition Get(DivineArchetype id) => All.Single(definition => definition.Id == id);

    /// <summary>Migration bridge for the existing four-school implementation, not a character-school respec operation.</summary>
    public static DivineArchetypeDefinition FromExistingSchool(SpellSchool school) =>
        All.Single(definition => definition.ExistingSchool == school);
}
