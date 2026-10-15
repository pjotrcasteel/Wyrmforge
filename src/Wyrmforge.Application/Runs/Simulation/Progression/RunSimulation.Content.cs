using Wyrmforge.Application.Runs.Progression;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private IReadOnlySet<RelicId>? availableRelics;

    internal void InitializeContentProfile(RunContentProfile content)
    {
        ArgumentNullException.ThrowIfNull(content);
        availableRelics = content.Relics;
        availablePrimarySpells = content.Spells;
    }
}
