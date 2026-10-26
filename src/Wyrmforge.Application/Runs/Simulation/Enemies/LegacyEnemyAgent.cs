using System.Collections.Immutable;
using System.Globalization;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// AI0 migration adapter. Selects the existing execution module, not new combat tactics.
/// Exact target information is explicitly legacy; earned perception belongs to AI1.
/// Hunt coordinates are existing arena world units. No renderer or player-input dependency.
/// </summary>
internal sealed class LegacyEnemyAgent
{
    private readonly EnemyState enemy;
    public AgentRuntime Runtime { get; }

    public LegacyEnemyAgent(EnemyState enemy, int seed)
    {
        if (enemy.Kind is not (EnemyKind.Hollow or EnemyKind.MireHound))
            throw new ArgumentException("Only the two AI0 migration archetypes are supported.", nameof(enemy));
        this.enemy = enemy;
        Runtime = new(new(enemy.Id, enemy.Kind.ToString(), "hostile"), seed, new CompatibilityPolicy(enemy.Kind));
    }

    public (Vector2D Direction, double Speed, bool Committed) Step(double delta, Vector2D target,
        Vector2D navigationTarget, double speed, bool mayCommit)
    {
        Runtime.Resume();
        var tick = Runtime.Inspect().Tick + 1;
        var hound = enemy.MireHound;
        var request = Runtime.Step([
            new("target", FormattableString.Invariant($"{target.X:R},{target.Y:R}"), tick, "legacy-exact-target/world-units"),
            new("navigation", FormattableString.Invariant($"{navigationTarget.X:R},{navigationTarget.Y:R}"), tick, "existing-hunt-navigation"),
            new("phase", hound?.Phase.ToString() ?? "Chase", tick, "authoritative-executor"),
            new("cooldown", (hound?.CooldownRemaining ?? 0).ToString("R", CultureInfo.InvariantCulture), tick, "authoritative-executor"),
            new("may-commit", mayCommit.ToString(), tick, "existing-pressure-budget")
        ]);
        var direction = Vector2D.DirectionTo(enemy.Position, navigationTarget);
        var committed = false;
        if (request?.Action == "hound-cycle" && hound is not null)
        {
            // Do not throttle this executor: cooldowns and committed lanes advance every active step.
            committed = hound.Tick(delta, enemy.Position, target, mayCommit);
            switch (hound.Phase)
            {
                case MireHoundPhase.Windup or MireHoundPhase.Recover: speed = 0; break;
                case MireHoundPhase.Pounce:
                    direction = hound.PounceDirection;
                    speed = MireHoundBehaviorState.PounceSpeed;
                    break;
                case MireHoundPhase.Retreat:
                    direction = Vector2D.DirectionTo(target, enemy.Position);
                    speed *= MireHoundBehaviorState.StalkSpeedMultiplier;
                    break;
                default:
                    if (navigationTarget == target) direction = Vector2D.DirectionTo(enemy.Position, hound.StalkPoint(enemy.Position, target));
                    speed *= MireHoundBehaviorState.StalkSpeedMultiplier;
                    break;
            }
        }
        else if (request?.Action != "chase") speed = 0;
        if (request is not null)
            Runtime.Report(new(request.Sequence, AgentActionStatus.Running, hound?.Phase.ToString() ?? "Chase"));
        return (direction, speed, committed);
    }

    private sealed class CompatibilityPolicy(EnemyKind kind) : IAgentPolicy
    {
        public ImmutableArray<AgentAlternative> Evaluate(AgentContext context) =>
        [
            new("pursue", "chase", 1, kind == EnemyKind.Hollow, kind == EnemyKind.Hollow ? "instinctive-direct-pursuit" : "hound-retains-authored-cycle"),
            new("flank-and-pounce", "hound-cycle", 1, kind == EnemyKind.MireHound, kind == EnemyKind.MireHound ? "executor-owns-lane-cooldown-and-pressure" : "archetype-has-no-pounce"),
            new("idle", "wait", 0, true, "fallback-only")
        ];
    }
}
