using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.EndRun;

public sealed record RunSpellSummary(SpellId Id, int Rank);

public sealed record RunUpgradeSummary(RunUpgradeId Id, int Rank);

public sealed record RunResonanceSummary(SpellSchool School, int Value);

public sealed record RunRelicSummary(RelicId Id, bool Equipped);
