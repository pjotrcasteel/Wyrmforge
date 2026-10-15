namespace Wyrmforge.Application.Runs.Simulation;

// A visible, earned recovery cache. First-depth potency is modestly raised; later depths retain the original.
// It is not automatic regeneration: the cache must unlock and the mage must physically collect it.
public static class OpeningRecoveryProfile
{
    public static double HealthCacheFraction(int depth) => depth <= 1 ? 0.12 : 0.08;
}
