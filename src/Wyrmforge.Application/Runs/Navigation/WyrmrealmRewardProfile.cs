using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmRewardProfile(SpellSchool AttunementSchool, int ScoreBonus = 0, double RecoveryFraction = 0, WyrmrealmRelicRewardProfile? Relic = null);
