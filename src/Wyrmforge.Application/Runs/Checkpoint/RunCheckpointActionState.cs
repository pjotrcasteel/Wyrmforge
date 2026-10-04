namespace Wyrmforge.Application.Runs.Checkpoint;

public sealed record RunCheckpointActionState(RunCheckpointActionId Id, bool Enabled, bool Used = false);
