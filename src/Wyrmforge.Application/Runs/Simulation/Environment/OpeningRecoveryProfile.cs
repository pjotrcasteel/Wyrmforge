namespace Wyrmforge.Application.Runs.Simulation;

// A visible, earned environmental recovery cache; depth-one hunters have no Forge investment.
// It is not automatic regeneration: the cache must unlock and the mage must physically collect it.
public static class OpeningRecoveryProfile
{
    public static double HealthCacheFraction(int depth) => depth <= 1 ? 0.16 : 0.08;
}
