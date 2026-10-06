using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record CombatStatusRenderSnapshot(CombatStatusId Id, int Stacks);
