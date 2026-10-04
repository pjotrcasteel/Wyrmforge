namespace Wyrmforge.Application.Runs.Checkpoint;

public sealed class RunCheckpointState
{
    public const double MendFraction = 0.35;

    private readonly HashSet<RunCheckpointActionId> usedActions = [];

    public bool IsOpen { get; private set; }

    public int Visit { get; private set; }

    public bool CanUse(RunCheckpointActionId action) => action switch
    {
        RunCheckpointActionId.MendWounds => IsOpen && !usedActions.Contains(action),
        RunCheckpointActionId.Descend or RunCheckpointActionId.LeaveRealm => IsOpen,
        _ => false,
    };

    public bool HasUsed(RunCheckpointActionId action) => usedActions.Contains(action);

    public void Enter()
    {
        IsOpen = true;
        Visit++;
        usedActions.Clear();
    }

    public bool TryUse(RunCheckpointActionId action)
    {
        if (!CanUse(action)) return false;
        if (action == RunCheckpointActionId.MendWounds)
        {
            usedActions.Add(action);
            return true;
        }

        IsOpen = false;
        return true;
    }
}
