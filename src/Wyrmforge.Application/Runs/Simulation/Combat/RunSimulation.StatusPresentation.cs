using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private static IReadOnlyList<CombatStatusRenderSnapshot> CreateStatusSnapshots(CombatStatusCollection statuses)
    {
        List<CombatStatusRenderSnapshot>? result = null;
        foreach (var definition in CombatStatusCatalog.All)
        {
            var stacks = statuses.Stacks(definition.Id);
            if (stacks <= 0) continue;
            (result ??= []).Add(new CombatStatusRenderSnapshot(definition.Id, stacks));
        }
        return result ?? Array.Empty<CombatStatusRenderSnapshot>();
    }

    private void UpdateStatusDamage(double delta)
    {
        foreach (var enemy in enemies)
        {
            if (enemy.Health > 0) ApplyStatusDamage(enemy, delta);
        }
        if (dragon is { Health: > 0 } activeDragon) ApplyStatusDamage(activeDragon, delta);
    }
}
