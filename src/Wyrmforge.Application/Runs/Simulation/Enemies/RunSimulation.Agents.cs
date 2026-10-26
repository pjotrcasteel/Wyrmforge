using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private bool agentFoundationEnabled;
    private AgentTier? agentTier;
    private readonly PackCoordinator agentPack = new();
    public PackSnapshot InspectAgentPack() => agentPack.Inspect();

    private void UpdateAgentPack(double delta)
    {
        if (agentTier is not >= AgentTier.Tactical) return;
        var members = enemies.Where(e => e.Health > 0 && e.Kind == EnemyKind.MireHound)
            .Take(PackCoordinator.MemberLimit).Select(e => new PackMember(e.Id,
                e.RoutedRemaining <= 0 && e.Statuses.TimeScale(false) > 0 && e.MireHound!.CooldownRemaining <= .15
                    && enemyAgents.TryGetValue(e.Id, out var a) && a.Perception.Inspect().Visible,
                e.MireHound!.Phase != MireHoundPhase.Stalk)).ToArray();
        agentPack.Tick(delta, members);
    }
    private bool agentPerceptionEnabled;
    private long agentStimulusId;
    private long agentAdmissionTick;
    private AgentStimulus? agentSpellSound;

    private void EmitAgentSpellSound()
    {
        if (agentPerceptionEnabled)
            agentSpellSound = new(++agentStimulusId, 0, player.Position, 220, AgentStimulusKind.Sound);
    }
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
            enemyAgents.Add(enemy.Id, agent = new(enemy, agentFoundationSeed, agentTier));
        return agent;
    }
}
