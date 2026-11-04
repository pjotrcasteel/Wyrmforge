using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Wyrm Influence themes for Fire Hunts (owner delegated the design, 4 November 2026; see the canon roadmap). The habitat still decides who lives
/// in a place and the encounter stage still ramps health, speed, spawn rate and the alive cap; influence only decides which of the habitat's
/// packs are favoured, which pack the surge sends and how generous the threat budget is. Pure data: no spawn code is band-specific.
/// Values are starting points to be tuned by simulation and phone captures.
/// </summary>
public static class WyrmInfluencePacks
{
    /// <summary>Scales the pack's threat budget: larger packs (up to each recipe's maximum) and more filler texture deeper into the Wyrm's land.</summary>
    public static double BudgetMultiplier(WyrmInfluenceBand band) => band switch
    {
        WyrmInfluenceBand.Natural => 1.0,
        WyrmInfluenceBand.Tainted => 1.1,
        WyrmInfluenceBand.Ravaged => 1.2,
        _ => 1.3,
    };

    /// <summary>
    /// Multiplies a habitat's pack affinity. Wet land is shamblers and hounds slipping between trees; scorched land is Ashling rushes; burning land is
    /// priests and screening Penitents behind cover; volcanic land is almost only the Wyrm's own servants. Never makes an unhosted pack appear.
    /// </summary>
    public static double Bias(WyrmInfluenceBand band, EnemyPackRecipe recipe) => (band, recipe) switch
    {
        (WyrmInfluenceBand.Natural, EnemyPackRecipe.WanderingDead or EnemyPackRecipe.HuntingPack) => 1.5,
        (WyrmInfluenceBand.Natural, EnemyPackRecipe.AshlingMob) => 0.4,
        (WyrmInfluenceBand.Natural, EnemyPackRecipe.Bastion) => 0.5,
        (WyrmInfluenceBand.Natural, EnemyPackRecipe.PriestWarband) => 0.2,
        (WyrmInfluenceBand.Tainted, EnemyPackRecipe.AshlingMob) => 2,
        (WyrmInfluenceBand.Tainted, EnemyPackRecipe.PriestWarband) => 1.2,
        (WyrmInfluenceBand.Tainted, EnemyPackRecipe.WanderingDead) => 0.6,
        (WyrmInfluenceBand.Ravaged, EnemyPackRecipe.PriestWarband) => 2,
        (WyrmInfluenceBand.Ravaged, EnemyPackRecipe.Bastion) => 1.8,
        (WyrmInfluenceBand.Ravaged, EnemyPackRecipe.AshlingMob) => 1.2,
        (WyrmInfluenceBand.Ravaged, EnemyPackRecipe.HuntingPack) => 0.6,
        (WyrmInfluenceBand.Ravaged, EnemyPackRecipe.WanderingDead or EnemyPackRecipe.DrownedWatch) => 0.3,
        (WyrmInfluenceBand.Domain, EnemyPackRecipe.PriestWarband) => 2.5,
        (WyrmInfluenceBand.Domain, EnemyPackRecipe.Bastion) => 2,
        (WyrmInfluenceBand.Domain, EnemyPackRecipe.WanderingDead or EnemyPackRecipe.DrownedWatch or EnemyPackRecipe.HuntingPack) => 0.15,
        _ => 1,
    };

    /// <summary>The pack the surge sends in a Fire habitat of this band, or null to keep the habitat's own signature pack.</summary>
    public static EnemyPackRecipe? SurgeFor(WyrmInfluenceBand band) => band switch
    {
        WyrmInfluenceBand.Tainted => EnemyPackRecipe.AshlingMob,
        WyrmInfluenceBand.Ravaged => EnemyPackRecipe.PriestWarband,
        WyrmInfluenceBand.Domain => EnemyPackRecipe.Bastion,
        _ => null,
    };
}
