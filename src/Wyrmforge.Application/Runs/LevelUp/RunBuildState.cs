using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.LevelUp;

public sealed class RunBuildState
{
    public RunUpgradeState RunUpgrades { get; } = new();

    public SpellBook Spells { get; } = new();

    public SpellEvolutionSelection Evolutions { get; } = new();

    public SynergySelection Synergies { get; } = new();

    public DragonEssenceSelection DragonEssences { get; } = new();

    public RelicInventoryState Relics { get; } = new();
}
