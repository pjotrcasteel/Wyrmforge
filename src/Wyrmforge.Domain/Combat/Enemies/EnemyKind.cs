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
    /// <summary>Frost roster: a backline chanter whose interruptible rites armour the pack, reknit fallen Packlings and numb the near.</summary>
    HoarfrostCantor,
    /// <summary>Frost roster: a veiled ambusher that glass-steps beside the hunter, leaves a false double and strikes a Shiver Cut.</summary>
    MirrorWisp,
    /// <summary>A Mirror Wisp's Reflection Double: a false image, not a creature. No bestiary entry, no payout.</summary>
    MirrorDouble,
    /// <summary>Frost F4b: the named set piece on Rimeclaw's lair road. Its slam scars the ground, its toll rings box the hunter in.</summary>
    BellOfWinter,
    /// <summary>Frost F4c: the Reliquary's winter rite. Crystal Wards, a Refraction Veil of false forms, Glacial Prisons.</summary>
    ReliquaryOfGlass,
    /// <summary>A crystal pylon the Reliquary of Glass raises; a light tether binds it to the caster. A ritual object, not a creature.</summary>
    CrystalWard,
    /// <summary>A mirrored false form of the Reliquary of Glass: one hit breaks it. Not a creature: no bestiary entry, no payout.</summary>
    GlassFalseForm,
}
