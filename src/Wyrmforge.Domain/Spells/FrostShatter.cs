namespace Wyrmforge.Domain.Spells;

/// <summary>
/// Frost's kill payoff (Diablo IV Shatter, Path of Exile freeze-shatter): an enemy that Frost Shard kills while Frozen
/// bursts into shards that deal a share of its maximum health to nearby foes, so the payoff keeps pace with depth. Only Frost Shard triggers it, so freeze lent by other schools
/// (Stormglass, Frostfire) does not borrow the payoff, and a shatter never triggers another shatter.
/// </summary>
public static class FrostShatter
{
    public const double DamageFraction = 0.5;
    public const double Radius = 72;

    public static bool Triggers(SpellId killingSpell, bool targetFrozen) => targetFrozen && killingSpell == SpellId.FrostShard;

    public static double Damage(double shatteredMaxHealth) => Math.Max(0, shatteredMaxHealth) * DamageFraction;
}
