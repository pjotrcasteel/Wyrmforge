namespace Wyrmforge.Domain.Combat.Enemies;

public enum EnemyRole
{
    Pressure,
    Ambusher,
    /// <summary>Telegraphed ranged harassers. Only habitat ecology places them; legacy role waves never do.</summary>
    Artillery,
    /// <summary>Back-line casters that heal or raise allies. Habitat ecology only, and only behind a pack they can support.</summary>
    Support,
}
