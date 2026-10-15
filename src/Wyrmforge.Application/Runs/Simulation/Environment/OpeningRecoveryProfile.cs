namespace Wyrmforge.Application.Runs.Simulation;

// A visible, earned recovery cache. This ablation keeps original healing potency while testing proper retrieval.
// It is not automatic regeneration: the cache must unlock and the mage must physically collect it.
public static class OpeningRecoveryProfile
{
    public static double HealthCacheFraction(int depth) => depth <= 1 ? 0.08 : 0.08;
}
