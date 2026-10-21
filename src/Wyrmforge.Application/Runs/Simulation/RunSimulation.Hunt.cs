using Wyrmforge.Application.Runs.Hunts;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    public HuntSelection? SelectedHunt { get; private set; }

    internal void SelectHunt(HuntSelection? hunt)
    {
        hunt?.Validate();
        SelectedHunt = hunt;
        if (hunt is not null)
        {
            attractedDragon = hunt.Target;
            mapState = CreateSeededMapState(depthState.Depth);
        }
    }
}
