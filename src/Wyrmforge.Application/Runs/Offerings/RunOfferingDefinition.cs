using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Offerings;

public sealed record RunOfferingDefinition(DragonEssenceId EssenceId, string Effect, SpellId? StartingSpell = null, RunUpgradeId? StartingUpgrade = null);
