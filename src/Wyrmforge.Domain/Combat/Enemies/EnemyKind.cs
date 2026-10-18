namespace Wyrmforge.Domain.Combat.Enemies;

public enum EnemyKind
{
    Hollow,
    MireHound,
    Ashling,
    Penitent,
    AshSlinger,
    AshPriest,
    DrownedWraith,
    /// <summary>Roster step 6: the ultra-rare unique miniboss. Never drawn by composition plans.</summary>
    Reliquary,
    /// <summary>A breakable ward the Reliquary plants. A ritual object, not a creature: no bestiary entry, no payout.</summary>
    ReliquaryWard,
    /// <summary>Roster step 7: the named pre-lair set piece. Only the pre-lair road spawns it, every hunt.</summary>
    BellWarden,
    /// <summary>Frost roster (Rimeclaw's region): a small pack hunter that circles and bites chilled prey.</summary>
    FrostlingPackling,
    /// <summary>Frost roster: a planted caster of straight ice lances, delayed splinter blooms and black ice.</summary>
    Shardcaster,
    /// <summary>Frost roster: a wide-prowling flanker that feints behind a snow cloud and pounces from the side.</summary>
    WhitefangStalker,
    /// <summary>Frost roster: a heavy guardian whose Frost Brace soaks frontal hits before an Avalanche Step shock ring.</summary>
    CairnSentinel,
}
