namespace Wyrmforge.Domain.Combat.Enemies;

public enum EnemyRole
{
    Pressure,
    Ambusher,
    /// <summary>Telegraphed ranged harassers. Only habitat ecology places them; legacy role waves never do.</summary>
    Artillery,
}
