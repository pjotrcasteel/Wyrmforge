using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private bool agentFoundationEnabled;
    private bool agentPerceptionEnabled;
    private int agentFoundationSeed;
    private readonly Dictionary<int, LegacyEnemyAgent> enemyAgents = [];

    /// <summary>On-demand developer inspector, separate from per-frame render snapshots and saves.</summary>
    public IReadOnlyList<AgentSnapshot> InspectEnemyAgents() => enemyAgents.Values
        .OrderBy(a => a.Runtime.Inspect().Identity.Id).Select(a => a.Runtime.Inspect()).ToArray();

    private void PruneEnemyAgents()
    {
        if (!agentFoundationEnabled) return;
        foreach (var id in enemyAgents.Keys.Where(id => !enemies.Any(e => e.Id == id && e.Health > 0)).ToArray())
        {
            enemyAgents[id].Runtime.Despawn();
            enemyAgents.Remove(id);
        }
    }

    private LegacyEnemyAgent? FindEnemyAgent(EnemyState enemy)
    {
        if (!agentFoundationEnabled || enemy.Health <= 0 || enemy.Kind is not (EnemyKind.Hollow or EnemyKind.MireHound)) return null;
        if (!enemyAgents.TryGetValue(enemy.Id, out var agent))
            enemyAgents.Add(enemy.Id, agent = new(enemy, agentFoundationSeed));
        return agent;
    }
}
