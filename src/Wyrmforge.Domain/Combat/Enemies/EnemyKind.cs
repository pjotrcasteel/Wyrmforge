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
}
