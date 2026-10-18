using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Frost F4b: the Bell of Winter on Rimeclaw's lair road. It shares the Bell Warden's road (entrance toll, no horde, the road
/// opens when it falls) but fights the other way round: no reinforcements, only ground that closes in. Slam scars stay on the
/// floor as permafrost (no grip, Chill), toll rings can only be crossed through their open lanes, and Icicle Recall calls the
/// scars' shards down as marked icicles, clearing the floor again. All numbers are provisional until the final balancing pass.
/// </summary>
public sealed partial class RunSimulation
{
    public const double WinterSlamRadius = 90;
    public const double WinterSlamDamage = 24;
    public const int WinterSlamChill = 2;
    public const double PermafrostScarLength = 230;
    public const double PermafrostScarHalfWidth = 15;
    public const double PermafrostScarSeconds = 10;
    public const int MaxPermafrostScars = 8;
    public const double WinterRingStartRadius = 50;
    public const double WinterRingMaxRadius = 360;
    public const double WinterRingExpandSeconds = 1.3;
    public const double WinterRingStaggerSeconds = 0.45;
    public const double WinterRingThickness = 24;
    public const double WinterRingDamage = 9;
    public const int WinterRingChill = 1;
    public const double IcicleRadius = 40;
    public const double IcicleFallSeconds = 0.85;
    public const double IcicleFadeSeconds = 0.3;
    public const double IcicleDamage = 14;
    public const int IcicleChill = 2;
    public const double IcicleRingOffset = 110;
    public const int MaxIcicles = 10;

    private readonly List<PermafrostScarState> permafrostScars = [];
    private readonly List<WinterRingState> winterRings = [];
    private readonly List<IcicleState> icicles = [];

    public int WinterBellRimes { get; private set; }

    private bool PlayerOnPermafrost => permafrostScars.Any(scar =>
        Vector2D.Distance(ClosestPointOnSegment(scar.Start, scar.End, player.Position), player.Position) <= PermafrostScarHalfWidth + player.Radius * 0.3);

    private (Vector2D Direction, double Speed) UpdateWinterBell(EnemyState enemy, BellOfWinterBehaviorState bell, double scaledDelta, bool crossing,
        Vector2D direction, double speed)
    {
        switch (bell.Tick(scaledDelta, enemy.Position, enemy.Health, enemy.MaxHealth, player.Position))
        {
            case BellOfWinterEvent.Slammed:
                RegisterElementalImpact(bell.Target, SpellId.FrostShard);
                if (Vector2D.Distance(player.Position, bell.Target) <= WinterSlamRadius + player.Radius * 0.5)
                {
                    DamagePlayer(WinterSlamDamage);
                    ChillPlayer(WinterSlamChill);
                }
                foreach (var scar in bell.ScarDirections) AddPermafrostScar(bell.Target + scar * (WinterSlamRadius * 0.6), scar);
                break;
            case BellOfWinterEvent.Tolled:
                for (var ring = 0; ring < bell.RingCount; ring++)
                    winterRings.Add(new WinterRingState(enemy.Position, bell.TollGapAngles(ring), ring * WinterRingStaggerSeconds));
                break;
            case BellOfWinterEvent.Recalled:
                RecallIcicles(bell);
                break;
            case BellOfWinterEvent.RimeStarted:
                BeginWinterRime();
                break;
        }
        return (direction, crossing ? speed : speed * bell.SpeedMultiplier);
    }

    private void AddPermafrostScar(Vector2D start, Vector2D direction)
    {
        var end = start + direction * PermafrostScarLength;
        end = new Vector2D(Math.Clamp(end.X, 0, arenaWidth), Math.Clamp(end.Y, 0, arenaHeight));
        if (permafrostScars.Count >= MaxPermafrostScars) permafrostScars.RemoveAt(0);
        permafrostScars.Add(new PermafrostScarState(start, end));
    }

    /// <summary>
    /// One icicle over where the hunter stood at the tell, then the shards of every scar (middle and tip), which melt back into
    /// the bell. An empty floor, or Deep Winter, rings the hunter's spot with four more.
    /// </summary>
    private void RecallIcicles(BellOfWinterBehaviorState bell)
    {
        var points = new List<Vector2D> { bell.Target };
        foreach (var scar in permafrostScars)
        {
            points.Add((scar.Start + scar.End) * 0.5);
            points.Add(scar.End);
        }
        if (permafrostScars.Count == 0 || bell.DeepWinter)
            for (var corner = 0; corner < 4; corner++)
            {
                var angle = Math.PI / 4 + corner * Math.PI / 2;
                points.Add(bell.Target + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * IcicleRingOffset);
            }
        permafrostScars.Clear();
        foreach (var point in points.Take(MaxIcicles))
            icicles.Add(new IcicleState(new Vector2D(Math.Clamp(point.X, 0, arenaWidth), Math.Clamp(point.Y, 0, arenaHeight))));
    }

    private void UpdateWinterBellHazards(double delta)
    {
        if (delta <= 0) return;
        foreach (var scar in permafrostScars) scar.Remaining -= delta;
        permafrostScars.RemoveAll(scar => scar.Remaining <= 0);

        foreach (var ring in winterRings)
        {
            ring.Elapsed += delta;
            if (ring.Hit || ring.Elapsed < 0 || ring.Elapsed > WinterRingExpandSeconds) continue;
            var offset = player.Position - ring.Center;
            if (Math.Abs(offset.Length - ring.Radius) > WinterRingThickness / 2 + player.Radius * 0.5) continue;
            // The open lanes are the counterplay: inside one, the ring rolls past.
            if (BellOfWinterBehaviorState.InGap(Math.Atan2(offset.Y, offset.X), ring.Gaps)) continue;
            ring.Hit = true;
            DamagePlayer(WinterRingDamage);
            ChillPlayer(WinterRingChill);
        }
        winterRings.RemoveAll(ring => ring.Elapsed > WinterRingExpandSeconds);

        foreach (var icicle in icicles)
        {
            icicle.Elapsed += delta;
            if (icicle.Fallen || icicle.Elapsed < IcicleFallSeconds) continue;
            icicle.Fallen = true;
            RegisterElementalImpact(icicle.Center, SpellId.FrostShard);
            if (Vector2D.Distance(player.Position, icicle.Center) > IcicleRadius + player.Radius * 0.5) continue;
            DamagePlayer(IcicleDamage);
            ChillPlayer(IcicleChill);
        }
        icicles.RemoveAll(icicle => icicle.Elapsed >= IcicleFallSeconds + IcicleFadeSeconds);
    }

    /// <summary>The rime is a true free window: icicles still hanging melt away with it.</summary>
    private void BeginWinterRime()
    {
        WinterBellRimes++;
        icicles.RemoveAll(icicle => !icicle.Fallen);
    }

    private void ClearWinterBellHazards()
    {
        permafrostScars.Clear();
        winterRings.Clear();
        icicles.Clear();
    }

    private EnemyTelegraphRenderSnapshot? CreateWinterBellTelegraph(EnemyState enemy) => enemy.WinterBell switch
    {
        { Phase: BellOfWinterPhase.Windup } bell => bell.Move switch
        {
            BellOfWinterMove.Slam => new EnemyTelegraphRenderSnapshot("winter-slam", bell.WindupProgress, bell.Target.X, bell.Target.Y, WinterSlamRadius),
            BellOfWinterMove.Toll => new EnemyTelegraphRenderSnapshot("winter-toll", bell.WindupProgress, enemy.Position.X, enemy.Position.Y,
                WinterRingMaxRadius),
            _ => new EnemyTelegraphRenderSnapshot("winter-recall", bell.WindupProgress, bell.Target.X, bell.Target.Y, IcicleRadius),
        },
        { Phase: BellOfWinterPhase.Rime } riming => new EnemyTelegraphRenderSnapshot("winter-rime", riming.RimeProgress, enemy.Position.X,
            enemy.Position.Y, enemy.Radius * 2),
        _ => null,
    };

    private IReadOnlyList<PermafrostScarRenderSnapshot> CreatePermafrostScarSnapshots() => permafrostScars
        .Select(scar => new PermafrostScarRenderSnapshot(scar.Start.X, scar.Start.Y, scar.End.X, scar.End.Y, PermafrostScarHalfWidth,
            Math.Clamp(scar.Remaining / PermafrostScarSeconds, 0, 1)))
        .ToArray();

    private IReadOnlyList<WinterRingRenderSnapshot> CreateWinterRingSnapshots() => winterRings
        .Select(ring => new WinterRingRenderSnapshot(ring.Center.X, ring.Center.Y, ring.Radius, WinterRingMaxRadius, WinterRingThickness,
            ring.Charge, ring.Gaps, BellOfWinterBehaviorState.TollGapHalfRadians))
        .ToArray();

    private IReadOnlyList<IcicleRenderSnapshot> CreateIcicleSnapshots() => icicles
        .Select(icicle => new IcicleRenderSnapshot(icicle.Center.X, icicle.Center.Y, IcicleRadius, Math.Clamp(icicle.Elapsed / IcicleFallSeconds, 0, 1),
            icicle.Fallen, Math.Clamp((icicle.Elapsed - IcicleFallSeconds) / IcicleFadeSeconds, 0, 1)))
        .ToArray();

    private sealed class PermafrostScarState(Vector2D start, Vector2D end)
    {
        public Vector2D Start { get; } = start;

        public Vector2D End { get; } = end;

        public double Remaining { get; set; } = PermafrostScarSeconds;
    }

    private sealed class WinterRingState(Vector2D center, IReadOnlyList<double> gaps, double delay)
    {
        public Vector2D Center { get; } = center;

        public IReadOnlyList<double> Gaps { get; } = gaps;

        public double Delay { get; } = delay;

        /// <summary>Starts negative for later rings: they wait in the bell, charging, before they roll.</summary>
        public double Elapsed { get; set; } = -delay;

        public bool Hit { get; set; }

        public double Charge => Elapsed >= 0 || Delay <= 0 ? 1 : Math.Clamp(1 + Elapsed / Delay, 0, 1);

        public double Radius => WinterRingStartRadius + (WinterRingMaxRadius - WinterRingStartRadius) * Math.Clamp(Elapsed / WinterRingExpandSeconds, 0, 1);
    }

    private sealed class IcicleState(Vector2D center)
    {
        public Vector2D Center { get; } = center;

        public double Elapsed { get; set; }

        public bool Fallen { get; set; }
    }
}
