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
        // A frozen Wyrm cannot keep sensing or learning while its executor is paused.
        if (delta <= 0) return;
        ashfangAgent?.Tick(delta, active, ashfangBehavior, ashfangFlight.Stage, player.Position,
            (a, b) => arenaEnvironment?.HasLineOfSight(a, b, arenaWidth, arenaHeight) ?? true,
            target => (arenaEnvironment?.EnemyNavigationTarget(active.Position, target, arenaWidth, arenaHeight, active.Radius) ?? target) == target);
    }
    private readonly AshfangBehaviorState ashfangBehavior = new();

    private bool ashfangComboFollowUp;
    private double ashfangScorchTimer, ashfangPoise, ashfangStaggerLockout;
    private int ashfangScorchCount;
    /// <summary>Burst damage inside one wind-up, as a fraction of its health, that breaks the attack and staggers it.</summary>
    public const double AshfangPoiseFraction = .04;
    private const double AshfangPoiseDecayPerSecond = .015, AshfangStaggerLockoutSeconds = 6;

    /// <summary>Called from the damage path: enough hurt in the middle of a wind-up breaks the swing and leaves the Wyrm reeling, exposed.</summary>
    private void AshfangTakesDamage(DragonState hurt, double damage)
    {
        if (ashfangFlight.Active || ashfangStaggerLockout > 0) return;
        ashfangPoise += damage;
        if (ashfangPoise < hurt.MaxHealth * AshfangPoiseFraction || ashfangBehavior.Phase != "windup") return;
        ashfangPoise = 0;
        ashfangStaggerLockout = AshfangStaggerLockoutSeconds;
        ashfangBehavior.Interrupt();
        ashfangBehavior.Stagger();
        hurt.TelegraphRemaining = 0;
        hurt.AttackCooldown = AshfangBehaviorState.StaggerSeconds;
        RegisterAshfangEffect("stagger", hurt.Position, hurt.Radius * 1.3);
        EnemyTerrainBlast(hurt.Position, 2);
    }

    // The flame scours the ground it passes over: a scratch every fifth of a second, walking out along the beam, so a sweep leaves a burnt arc.
    private void ScorchBreathGround(DragonState active, double delta)
    {
        ashfangScorchTimer -= delta;
        if (ashfangScorchTimer > 0) return;
        ashfangScorchTimer = .2;
        var reach = ashfangBehavior.Range * (.35 + .3 * (ashfangScorchCount++ % 3));
        EnemyTerrainBlast(active.Position + ashfangBehavior.BeamDirection * reach, ashfangScorchCount % 3 == 0 ? 2 : 1);
    }

    private void UpdateAshfangCombat(DragonState active, double delta)
    {
        if (delta <= 0) return;
        ashfangStaggerLockout = Math.Max(0, ashfangStaggerLockout - delta);
        ashfangPoise = Math.Max(0, ashfangPoise - active.MaxHealth * AshfangPoiseDecayPerSecond * delta);
        if (ashfangBehavior.Committed)
        {
            var completed = ashfangBehavior.Tick(delta);
            active.TelegraphRemaining = ashfangBehavior.Phase == "windup" ? ashfangBehavior.Remaining : 0;
            if (ashfangBehavior.IsBreath && ashfangBehavior.Phase != "strike") active.BreathDirection = ashfangBehavior.BeamDirection;
            if (ashfangBehavior.Phase == "strike" && ashfangBehavior.Action == "pounce")
            {
                var destination = ashfangBehavior.Target - ashfangBehavior.Direction * (active.Radius + player.Radius);
                var progress = ashfangBehavior.Progress;
                var proposed = ashfangBehavior.Origin + (destination - ashfangBehavior.Origin) * progress;
                active.Position = arenaEnvironment is null ? proposed : arenaEnvironment.RestrictMovement(active.Position, proposed, arenaWidth, arenaHeight, active.Radius);
            }
            if (ashfangBehavior.Phase == "strike" && ashfangBehavior.IsBreath)
            {
                active.BreathDirection = ashfangBehavior.BeamDirection;
                ScorchBreathGround(active, delta);
                if (!ashfangBreathHit) ashfangBreathHit = ResolveAshfangStrike(active);
            }
            if (ashfangBehavior.Phase == "strike" && ashfangBehavior.Action == "claw_combo" && !ashfangComboFollowUp && ashfangBehavior.Progress >= .5)
            {
                ashfangComboFollowUp = true;
                RegisterAshfangEffect("claw_combo", active.Position + ashfangBehavior.Direction * (ashfangBehavior.Range * .65), ashfangBehavior.Range, ashfangBehavior.Direction);
                ResolveAshfangStrike(active);
            }
            if (!completed) return;
            if (ashfangBehavior.Phase == "windup")
            {
                ashfangBehavior.Strike();
                dragonLastAttackAt = elapsed;
                if (ashfangBehavior.Action != "pounce")
                {
                    if (!ashfangBehavior.IsBreath) RegisterAshfangEffect(ashfangBehavior.Action,
                        active.Position + ashfangBehavior.Direction * (ashfangBehavior.Range * .65), ashfangBehavior.Range, ashfangBehavior.Direction);
                    // A tail slam or a raking claw chews the ground where it lands.
                    if (ashfangBehavior.Action.StartsWith("tail", StringComparison.Ordinal)) EnemyTerrainBlast(active.Position + ashfangBehavior.Direction * (ashfangBehavior.Range * .8), 2);
                    else if (ashfangBehavior.IsMelee) EnemyTerrainBlast(active.Position + ashfangBehavior.Direction * (ashfangBehavior.Range * .75), 1);
                    ashfangBreathHit = ResolveAshfangStrike(active);
                }
            }
            else if (ashfangBehavior.Phase == "strike")
            {
                if (ashfangBehavior.Action == "pounce")
                {
                    RegisterAshfangEffect("pounce", active.Position, 74);
                    EnemyTerrainBlast(active.Position, 3);
                    ResolveAshfangStrike(active);
                }
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
                ashfangComboFollowUp = false;
                ashfangScorchTimer = 0;
                ashfangScorchCount = 0;
                ashfangBehavior.Begin(action, active.Position, target, active.Definition.Combat.Attack.TelegraphSeconds.For(active.Phase));
                active.BreathDirection = ashfangBehavior.BeamDirection;
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
              (offset.X * ashfangBehavior.BeamDirection.X + offset.Y * ashfangBehavior.BeamDirection.Y) / distance >= Math.Cos(ashfangBehavior.HalfAngle));
        if (!hits) return false;
        var attack = active.Definition.Combat.Attack;
        RegisterElementalImpact(player.Position, attack.VisualSpell);
        var weight = ashfangBehavior.Action switch { "claw_combo" => .7, "tail_left" or "tail_right" => .9, "breath_sweep" => 1.15, _ => 1.0 };
        DamagePlayer(attack.Damage.For(active.Phase) * weight * depthState.DragonDamageMultiplier);
        return true;
    }
}
