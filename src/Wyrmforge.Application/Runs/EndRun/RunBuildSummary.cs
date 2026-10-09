using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Runs.EndRun;

public sealed record RunSpellSummary(SpellId Id, int Rank, SpellEvolutionId? Evolution = null);

public sealed record RunUpgradeSummary(RunUpgradeId Id, int Rank);

public sealed record RunResonanceSummary(SpellSchool School, int Value);

public sealed record RunRelicSummary(RelicId Id, bool Equipped)
{
    public int Bursts { get; init; }
    public double BurstDamage { get; init; }
    public int BurstKills { get; init; }
}
