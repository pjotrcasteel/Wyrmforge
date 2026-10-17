using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Contextual;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// The contextual second auto-cast (amendment §5, §11.4). One shared cast budget: the primary keeps its single cast clock,
/// and a contextual cast takes the primary's next cast rather than adding a parallel stream.
/// </summary>
public sealed partial class RunSimulation
{
    private readonly SpellDecisionTrace decisionTrace = new();
    private readonly List<KnockbackState> knockbacks = [];
    private ContextualTriggerPolicy? contextualPolicy;
    private double contextualRecovery;
    private bool contextualBlocked;
    private Vector2D wardPulsePosition;
    private double wardPulseLife;

    public bool ContextualSpellPrepared => contextualPolicy is not null;

    public int ContextualCasts { get; private set; }

    /// <summary>Primary casts given up to contextual casts: the price of the second spell.</summary>
    public int PrimaryCastsYielded { get; private set; }

    public IReadOnlyList<SpellDecisionTraceEntry> DecisionTrace => decisionTrace.Entries;

    internal void PrepareContextualSpell(bool prepared)
    {
        contextualPolicy = prepared ? ContextualTriggerPolicy.Guard : null;
        RefreshBuildHud();
    }

    /// <returns>True when the contextual spell took this tick's cast.</returns>
    private bool TryCastContextualSpell(double delta, SpellDefinition primary, int rank, bool moving)
    {
        if (contextualPolicy is null) return false;
        contextualRecovery = Math.Max(0, contextualRecovery - delta);
        if (!HasCombatTargets) return false;
        var read = ReadBattlefield();
        var decision = SpellArbiter.Decide(contextualPolicy, read, contextualRecovery);
        if (!decision.Cast)
        {
            // Trace only the first tick of a blocked need, so the record shows "wanted to, could not" without flooding.
            var blocked = decision.Reason is SpellDecisionReason.Recovering or SpellDecisionReason.NothingToMove;
            if (blocked && !contextualBlocked)
                decisionTrace.Record(new(elapsed, ContextualSpellId.WardingPulse, decision.Reason, decision.Score, read));
            contextualBlocked = blocked;
            return false;
        }

        contextualBlocked = false;
        decisionTrace.Record(new(elapsed, ContextualSpellId.WardingPulse, decision.Reason, decision.Score, read));
        CastWardingPulse();
        contextualRecovery = WardingPulse.RecoverySeconds;
        ContextualCasts++;
        PrimaryCastsYielded++;
        spellCooldowns[primary.Id] = Math.Max(spellCooldowns[primary.Id], GetSpellCooldown(primary, rank, moving));
        return true;
    }

    private BattlefieldRead ReadBattlefield()
    {
        int crowd = 0, movable = 0, contacts = 0, telegraphs = 0;
        foreach (var enemy in enemies)
        {
            if (enemy.Health <= 0 || enemy.Statuses.TimeScale(false) <= 0) continue;
            var distance = Vector2D.Distance(enemy.Position, player.Position);
            if (distance > WardingPulse.Radius + enemy.Radius) continue;
            crowd++;
            if (distance <= enemy.Radius + player.Radius + 2) contacts++;
            if (WardingPulse.IsImmovable(enemy.Kind)) continue;
            movable++;
            if (IsDefusableWindup(enemy)) telegraphs++;
        }
        return new BattlefieldRead(crowd, movable, contacts, telegraphs);
    }

    // Only windups a shove can actually spoil: a melee arc that would land on the hunter, or a pounce from close range.
    private bool IsDefusableWindup(EnemyState enemy) => enemy switch
    {
        { Penitent: { Phase: PenitentPhase.Windup } penitent } => penitent.InBashArc(enemy.Position, player.Position, player.Radius),
        { DrownedWraith: { Phase: DrownedWraithPhase.Windup } wraith } => wraith.StrikeHits(enemy.Position, player.Position, player.Radius),
        { MireHound: { Phase: MireHoundPhase.Windup } } => true,
        _ => false,
    };

    private void CastWardingPulse()
    {
        wardPulsePosition = player.Position;
        wardPulseLife = WardingPulse.PulseSeconds;
        foreach (var enemy in enemies)
        {
            if (enemy.Health <= 0 || WardingPulse.IsImmovable(enemy.Kind)) continue;
            if (Vector2D.Distance(enemy.Position, player.Position) > WardingPulse.Radius + enemy.Radius) continue;
            var direction = Vector2D.DirectionTo(player.Position, enemy.Position);
            if (direction == Vector2D.Zero) direction = new Vector2D(1, 0);
            var velocity = direction * (WardingPulse.PushFor(enemy.IsElite) / WardingPulse.PushSeconds);
            knockbacks.RemoveAll(knock => knock.Enemy == enemy);
            knockbacks.Add(new KnockbackState(enemy, velocity, WardingPulse.PushSeconds));
        }
    }

    private void UpdateContextualEffects(double delta)
    {
        wardPulseLife = Math.Max(0, wardPulseLife - delta);
        foreach (var knock in knockbacks)
        {
            var step = Math.Min(delta, knock.Remaining);
            knock.Remaining -= step;
            if (knock.Enemy.Health <= 0 || step <= 0) continue;
            var previous = knock.Enemy.Position;
            var proposed = previous + knock.Velocity * step;
            var radius = knock.Enemy.Radius;
            knock.Enemy.Position = mapState.EncounterActive && arenaEnvironment is not null
                ? arenaEnvironment.RestrictMovement(previous, proposed, arenaWidth, arenaHeight, radius)
                : new Vector2D(Math.Clamp(proposed.X, radius, Math.Max(radius, arenaWidth - radius)),
                    Math.Clamp(proposed.Y, radius, Math.Max(radius, arenaHeight - radius)));
            knock.Enemy.MireHound?.Displace(knock.Enemy.Position - previous);
        }
        knockbacks.RemoveAll(knock => knock.Remaining <= 0 || knock.Enemy.Health <= 0);
    }

    private WardPulseRenderSnapshot? CreateWardPulseSnapshot() => wardPulseLife <= 0 ? null
        : new WardPulseRenderSnapshot(wardPulsePosition.X, wardPulsePosition.Y, WardingPulse.Radius, 1 - wardPulseLife / WardingPulse.PulseSeconds);

    private double? WardCharge => contextualPolicy is null ? null : 1 - contextualRecovery / WardingPulse.RecoverySeconds;

    private sealed class KnockbackState(EnemyState enemy, Vector2D velocity, double remaining)
    {
        public EnemyState Enemy { get; } = enemy;
        public Vector2D Velocity { get; } = velocity;
        public double Remaining { get; set; } = remaining;
    }
}
