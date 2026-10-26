using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private bool ashfangBreathHit;
    private AshfangAgent? ashfangAgent;
    public Wyrmforge.Domain.Agents.AgentSnapshot? InspectBossAgent() => ashfangAgent?.Runtime.Inspect();
    public Wyrmforge.Domain.Agents.AdaptationSnapshot? InspectBossAdaptation() => ashfangAgent?.Adaptation.Inspect();
    private Vector2D KnownAshfangTarget(DragonState active) => ashfangAgent is null ? player.Position
        : ashfangAgent.Perception.Inspect().Contact?.Position ?? active.Position;
    private void ObserveAshfangAgent(DragonState active, double delta)
    {
        ashfangAgent?.Tick(delta, active, ashfangBehavior, ashfangFlight.Stage, player.Position,
            (a, b) => arenaEnvironment?.HasLineOfSight(a, b, arenaWidth, arenaHeight) ?? true,
            target => (arenaEnvironment?.EnemyNavigationTarget(active.Position, target, arenaWidth, arenaHeight, active.Radius) ?? target) == target);
    }
    private readonly AshfangBehaviorState ashfangBehavior = new();

    private void UpdateAshfangCombat(DragonState active, double delta)
    {
        if (delta <= 0) return;
        if (ashfangBehavior.Committed)
        {
            var completed = ashfangBehavior.Tick(delta);
            active.TelegraphRemaining = ashfangBehavior.Phase == "windup" ? ashfangBehavior.Remaining : 0;
            if (ashfangBehavior.Phase == "strike" && ashfangBehavior.Action == "pounce")
            {
                var destination = ashfangBehavior.Target - ashfangBehavior.Direction * (active.Radius + player.Radius);
                var progress = ashfangBehavior.Progress;
                var proposed = ashfangBehavior.Origin + (destination - ashfangBehavior.Origin) * progress;
                active.Position = arenaEnvironment is null ? proposed : arenaEnvironment.RestrictMovement(active.Position, proposed, arenaWidth, arenaHeight, active.Radius);
            }
            if (ashfangBehavior.Phase == "strike" && ashfangBehavior.Action == "breath" && !ashfangBreathHit)
                ashfangBreathHit = ResolveAshfangStrike(active);
            if (!completed) return;
            if (ashfangBehavior.Phase == "windup")
            {
                ashfangBehavior.Strike();
                dragonLastAttackAt = elapsed;
                if (ashfangBehavior.Action != "pounce")
                {
                    if (ashfangBehavior.Action != "breath") RegisterAshfangEffect(ashfangBehavior.Action,
                        active.Position + ashfangBehavior.Direction * (ashfangBehavior.Range * .65), ashfangBehavior.Range, ashfangBehavior.Direction);
                    ashfangBreathHit = ResolveAshfangStrike(active);
                }
            }
            else if (ashfangBehavior.Phase == "strike")
            {
                if (ashfangBehavior.Action == "pounce") { RegisterAshfangEffect("pounce", active.Position, 74); ResolveAshfangStrike(active); }
                ashfangBehavior.Recover();
            }
            else { ashfangBehavior.Finish(); active.AttackCooldown = .8; }
            return;
        }
        active.AttackCooldown -= delta;
        var target = KnownAshfangTarget(active);
        var navigation = arenaEnvironment?.EnemyNavigationTarget(active.Position, target, arenaWidth, arenaHeight, active.Radius) ?? target;
        var clearPath = navigation == target;
        if (active.AttackCooldown <= 0)
        {
            var action = ashfangAgent?.Choose() ?? ashfangBehavior.Decide(Vector2D.Distance(active.Position, target), clearPath, active.Phase);
            if (action != "approach")
            {
                ashfangBreathHit = false;
                ashfangBehavior.Begin(action, active.Position, target, active.Definition.Combat.Attack.TelegraphSeconds.For(active.Phase));
                active.BreathDirection = ashfangBehavior.Direction;
                active.TelegraphRemaining = ashfangBehavior.Remaining;
                dragonAttackSequence++;
                return;
            }
        }
        // A predator closes while a target is outside its reach. It cannot
        // re-aim a committed attack or walk during its vulnerable recovery.
        if (!clearPath || Vector2D.Distance(active.Position, target) > 115)
        {
            var direction = Vector2D.DirectionTo(active.Position, navigation);
            var speed = active.Speed * active.Definition.Combat.Movement.SpeedMultiplier.For(active.Phase);
            var proposed = active.Position + direction * speed * delta;
            active.Position = arenaEnvironment is null ? proposed : arenaEnvironment.RestrictMovement(active.Position, proposed, arenaWidth, arenaHeight, active.Radius);
        }
    }

    private bool ResolveAshfangStrike(DragonState active)
    {
        var offset = player.Position - active.Position;
        var distance = offset.Length;
        var hits = ashfangBehavior.Action == "pounce"
            ? Vector2D.Distance(player.Position, ashfangBehavior.Target) <= 70 && Vector2D.Distance(active.Position, ashfangBehavior.Target) <= active.Radius + player.Radius + 12
            : distance <= ashfangBehavior.Range && (distance <= double.Epsilon ||
              (offset.X * ashfangBehavior.Direction.X + offset.Y * ashfangBehavior.Direction.Y) / distance >= Math.Cos(ashfangBehavior.HalfAngle));
        if (!hits) return false;
        var attack = active.Definition.Combat.Attack;
        RegisterElementalImpact(player.Position, attack.VisualSpell);
        DamagePlayer(attack.Damage.For(active.Phase) * depthState.DragonDamageMultiplier);
        return true;
    }
}
