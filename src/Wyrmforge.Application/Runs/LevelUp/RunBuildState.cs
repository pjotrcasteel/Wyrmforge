using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.LevelUp;

public sealed class RunBuildState
{
    public RunUpgradeState RunUpgrades { get; } = new();

    public SpellBook Spells { get; } = new();

    public SynergySelection Synergies { get; } = new();

    public DragonEssenceSelection DragonEssences { get; } = new();
}
