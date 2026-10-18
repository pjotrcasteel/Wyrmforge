using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Application.Runs.Simulation.Snapshots;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// The Frost roster's shared ground rules: the hunter's Chill, straight ice lances, delayed splinter blooms and slick black
/// ice. Fire pressures the hunter with speed and numbers; Frost boxes the hunter in by taking away footing and pace.
/// </summary>
public sealed partial class RunSimulation
{
    public const double BlackIceGrip = 2.6;
    public const double BlackIceChillIntervalSeconds = 0.6;
    public const int MaxBlackIcePatches = 4;
    private const double PacklingSlotEaseDistance = 24;

    private readonly List<IceLanceState> iceLances = [];
    private readonly List<SplinterBloomState> splinterBlooms = [];
    private readonly List<BlackIcePatchState> blackIcePatches = [];
    private Vector2D playerSlide = Vector2D.Zero;
    private double blackIceChillRemaining;

    /// <summary>Chill bypasses nothing a hit would not: the developer invulnerability switch keeps the hunter warm too.</summary>
    private void ChillPlayer(int stacks)
    {
        if (developmentInvulnerable) return;
        player.Chill.Apply(stacks);
    }

    private bool PlayerOnBlackIce => blackIcePatches.Any(patch => Vector2D.Distance(player.Position, patch.Center) <= patch.Radius);

    /// <summary>
    /// Chill slows the hunter's pace; black ice takes away grip, so velocity eases toward the input instead of snapping.
    /// Off the ice movement stays exactly as responsive as before.
    /// </summary>
    private Vector2D FrostMovementVelocity(Vector2D desired, double delta)
    {
        player.Chill.Tick(delta);
        desired *= player.Chill.SpeedMultiplier;
        if (!PlayerOnBlackIce)
        {
            playerSlide = desired;
            return desired;
        }
        playerSlide += (desired - playerSlide) * (1 - Math.Exp(-BlackIceGrip * Math.Max(0, delta)));
        return playerSlide;
    }

    private (Vector2D Direction, double Speed) UpdatePackling(EnemyState enemy, FrostlingPacklingBehaviorState packling, double delta, bool crossing,
        Vector2D direction, double speed, ref int committed, int committedCap)
    {
        if (packling.Tick(delta, enemy.Position, player.Position, player.Chill.IsChilled, !crossing && committed < committedCap)) committed++;
        switch (packling.Phase)
        {
            case FrostlingPhase.Windup:
                return (direction, 0);
            case FrostlingPhase.Skitter:
                return (packling.LungeDirection, FrostlingPacklingBehaviorState.SkitterSpeed);
            case FrostlingPhase.Recover:
                return (crossing ? direction : Vector2D.DirectionTo(player.Position, enemy.Position), speed * 0.45);
        }
        if (crossing) return (direction, speed);
        // Pack Circle: hold this Packling's own slot on the turning ring, easing in so the ring settles rather than jitters.
        var slot = packling.CirclePoint(player.Position, encounterSeconds);
        var gap = Vector2D.Distance(enemy.Position, slot);
        return (Vector2D.DirectionTo(enemy.Position, slot), speed * Math.Min(1, gap / PacklingSlotEaseDistance));
    }

    private void BitePlayer(EnemyState enemy, FrostlingPacklingBehaviorState packling)
    {
        // Hamstring Bite: one committed bite, harder against prey that is already cold.
        DamagePlayer(FrostlingPacklingBehaviorState.BiteDamageAgainst(player.Chill.IsChilled) * EliteImpact(enemy));
        ChillPlayer(FrostlingPacklingBehaviorState.BiteChill);
        packling.Land();
    }

    private (Vector2D Direction, double Speed) UpdateShardcaster(EnemyState enemy, ShardcasterBehaviorState caster, double delta, bool crossing,
        Vector2D direction, double speed, bool rangedAllowed, ref int committed, int committedCap)
    {
        var mayCast = rangedAllowed && rangedStaggerRemaining <= 0 && committed < committedCap && !crossing;
        switch (caster.Tick(delta, enemy.Position, player.Position, enemy.Health, enemy.MaxHealth, mayCast))
        {
            case ShardcasterEvent.AimStarted:
                committed++;
                rangedStaggerRemaining = EnemyStagePressure.RangedStaggerSeconds;
                break;
            case ShardcasterEvent.LanceReleased:
                iceLances.Add(new IceLanceState(enemy.Position, caster.Aim, EliteImpact(enemy)));
                break;
            case ShardcasterEvent.PatchReleased:
                AddBlackIcePatch(caster.Target);
                break;
        }
        var (intent, multiplier) = caster.Movement(enemy.Position, player.Position);
        if (multiplier <= 0) return (direction, 0);
        return crossing ? (direction, speed) : (intent, speed * multiplier);
    }

    private void AddBlackIcePatch(Vector2D center)
    {
        if (blackIcePatches.Count >= MaxBlackIcePatches) blackIcePatches.RemoveAt(0);
        blackIcePatches.Add(new BlackIcePatchState(center, ShardcasterBehaviorState.PatchRadius, ShardcasterBehaviorState.PatchSeconds));
    }

    private void UpdateFrostHazards(double delta)
    {
        if (delta <= 0) return;
        foreach (var lance in iceLances)
        {
            var previous = lance.Position;
            var step = Math.Min(ShardcasterBehaviorState.LanceSpeed * delta, ShardcasterBehaviorState.LanceRange - lance.Travelled);
            var next = previous + lance.Direction * step;
            if (mapState.EncounterActive && arenaEnvironment is not null)
            {
                var allowed = arenaEnvironment.RestrictMovement(previous, next, arenaWidth, arenaHeight, ShardcasterBehaviorState.LanceHalfWidth);
                if (allowed != next)
                {
                    // A wall stops the shard; the splinters still bloom where it shattered.
                    next = allowed;
                    lance.Stopped = true;
                }
            }
            var closest = ClosestPointOnSegment(previous, next, player.Position);
            if (Vector2D.Distance(closest, player.Position) <= player.Radius + ShardcasterBehaviorState.LanceHalfWidth)
            {
                DamagePlayer(ShardcasterBehaviorState.LanceDamage * lance.Impact);
                ChillPlayer(ShardcasterBehaviorState.LanceChill);
                next = closest;
                lance.Stopped = true;
            }
            lance.Advance(next, Vector2D.Distance(previous, next));
            if (lance.Travelled >= ShardcasterBehaviorState.LanceRange - 1e-6) lance.Stopped = true;
            if (lance.Stopped) splinterBlooms.Add(new SplinterBloomState(lance.Position, lance.Impact));
        }
        iceLances.RemoveAll(lance => lance.Stopped);

        foreach (var bloom in splinterBlooms)
        {
            bloom.Elapsed += delta;
            if (bloom.Burst || bloom.Elapsed < ShardcasterBehaviorState.BloomDelaySeconds) continue;
            bloom.Burst = true;
            if (Vector2D.Distance(player.Position, bloom.Center) > ShardcasterBehaviorState.BloomRadius + player.Radius * 0.5) continue;
            DamagePlayer(ShardcasterBehaviorState.BloomDamage * bloom.Impact);
            ChillPlayer(ShardcasterBehaviorState.BloomChill);
        }
        splinterBlooms.RemoveAll(bloom => bloom.Elapsed >= ShardcasterBehaviorState.BloomDelaySeconds + SplinterBloomState.FadeSeconds);

        foreach (var patch in blackIcePatches) patch.Remaining -= delta;
        blackIcePatches.RemoveAll(patch => patch.Remaining <= 0);
        blackIceChillRemaining = Math.Max(0, blackIceChillRemaining - delta);
        if (blackIceChillRemaining <= 0 && PlayerOnBlackIce)
        {
            ChillPlayer(1);
            blackIceChillRemaining = BlackIceChillIntervalSeconds;
        }
    }

    private void ClearFrostState()
    {
        iceLances.Clear();
        splinterBlooms.Clear();
        blackIcePatches.Clear();
        blackIceChillRemaining = 0;
        player.Chill.Clear();
        playerSlide = Vector2D.Zero;
    }

    private static Vector2D ClosestPointOnSegment(Vector2D start, Vector2D end, Vector2D point)
    {
        var segment = end - start;
        var lengthSquared = segment.X * segment.X + segment.Y * segment.Y;
        if (lengthSquared < 1e-9) return start;
        var t = Math.Clamp(((point.X - start.X) * segment.X + (point.Y - start.Y) * segment.Y) / lengthSquared, 0, 1);
        return start + segment * t;
    }

    private EnemyTelegraphRenderSnapshot? CreateFrostTelegraph(EnemyState enemy) => enemy switch
    {
        { Packling: { Phase: FrostlingPhase.Windup } packling } => new EnemyTelegraphRenderSnapshot("skitter", packling.WindupProgress,
            packling.LungeEnd.X, packling.LungeEnd.Y, enemy.Radius),
        { Shardcaster: { Phase: ShardcasterPhase.Aim, Cast: ShardcasterCast.IceLance } lane } => new EnemyTelegraphRenderSnapshot("ice-lance",
            lane.AimProgress, lane.LaneEnd(enemy.Position).X, lane.LaneEnd(enemy.Position).Y, ShardcasterBehaviorState.LanceHalfWidth),
        { Shardcaster: { Phase: ShardcasterPhase.Aim, Cast: ShardcasterCast.BlackIce } glaze } => new EnemyTelegraphRenderSnapshot("black-ice",
            glaze.AimProgress, glaze.Target.X, glaze.Target.Y, ShardcasterBehaviorState.PatchRadius),
        _ => null,
    };

    private IReadOnlyList<IceLanceRenderSnapshot> CreateIceLanceSnapshots() => iceLances
        .Select(lance => new IceLanceRenderSnapshot(lance.Position.X, lance.Position.Y, Math.Atan2(lance.Direction.Y, lance.Direction.X), lance.Origin.X,
            lance.Origin.Y)).ToArray();

    private IReadOnlyList<SplinterBloomRenderSnapshot> CreateSplinterBloomSnapshots() => splinterBlooms
        .Select(bloom => new SplinterBloomRenderSnapshot(bloom.Center.X, bloom.Center.Y, ShardcasterBehaviorState.BloomRadius,
            Math.Clamp(bloom.Elapsed / ShardcasterBehaviorState.BloomDelaySeconds, 0, 1), bloom.Burst,
            bloom.Burst ? Math.Clamp((bloom.Elapsed - ShardcasterBehaviorState.BloomDelaySeconds) / SplinterBloomState.FadeSeconds, 0, 1) : 0)).ToArray();

    private IReadOnlyList<BlackIceRenderSnapshot> CreateBlackIceSnapshots() => blackIcePatches
        .Select(patch => new BlackIceRenderSnapshot(patch.Center.X, patch.Center.Y, patch.Radius,
            Math.Clamp(patch.Remaining / ShardcasterBehaviorState.PatchSeconds, 0, 1))).ToArray();

    private sealed class IceLanceState(Vector2D origin, Vector2D direction, double impact)
    {
        public Vector2D Origin { get; } = origin;

        public Vector2D Direction { get; } = direction;

        public double Impact { get; } = impact;

        public Vector2D Position { get; private set; } = origin;

        public double Travelled { get; private set; }

        public bool Stopped { get; set; }

        public void Advance(Vector2D position, double distance)
        {
            Position = position;
            Travelled += distance;
        }
    }

    private sealed class SplinterBloomState(Vector2D center, double impact)
    {
        public const double FadeSeconds = 0.3;

        public Vector2D Center { get; } = center;

        public double Impact { get; } = impact;

        public double Elapsed { get; set; }

        public bool Burst { get; set; }
    }

    private sealed class BlackIcePatchState(Vector2D center, double radius, double seconds)
    {
        public Vector2D Center { get; } = center;

        public double Radius { get; } = radius;

        public double Remaining { get; set; } = seconds;
    }
}
