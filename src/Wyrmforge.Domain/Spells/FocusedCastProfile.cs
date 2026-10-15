namespace Wyrmforge.Domain.Spells;

public sealed record FocusedCastProfile(double DamageMultiplier = 1, double RadiusMultiplier = 1, int BonusPierces = 0, double SplashRadius = 0, int BonusChains = 0)
{
    public static FocusedCastProfile Identity { get; } = new();

    public static FocusedCastProfile For(SpellId spell, int rank)
    {
        if (rank <= 1) return Identity;
        var mastered = rank >= 3;
        var profile = new FocusedCastProfile(mastered ? 1.8 : 1.35, mastered ? 1.4 : 1.15);
        return spell switch
        {
            SpellId.ArcaneOrb => profile with { BonusPierces = mastered ? 1 : 0 },
            SpellId.FireBolt => profile with { SplashRadius = mastered ? 84 : 32 },
            SpellId.FrostShard or SpellId.IceLance or SpellId.AetherDart => profile with { BonusPierces = mastered ? 2 : 1 },
            SpellId.CinderNeedle => profile with { SplashRadius = mastered ? 44 : 28 },
            SpellId.ChainLightning or SpellId.BallLightning => profile with { BonusChains = mastered ? 2 : 1 },
            _ => profile,
        };
    }

    public static double CalculateDamage(SpellDefinition spell, int rank) => spell.Ability.CalculateDamage(rank) * For(spell.Id, rank).DamageMultiplier;
}
