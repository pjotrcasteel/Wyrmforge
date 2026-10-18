using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Frost slice F3: the Hoarfrost Cantor's rites (Rime Hymn armour, Reknit thralls, Stillness Verse) and the Mirror Wisp's
/// Glass Step, Reflection Double and Shiver Cut. Every rite is a breakable channel and every double is bounded, so neither
/// can stall an encounter.
/// </summary>
public sealed partial class RunSimulation
{
    public const int MaxRimeHusks = 6;
    private const double ReknitSiteTolerance = 24;
    public const double ChoirwardenHymnMultiplier = 1.8;
    public const double ThousandfaceDoubleOffset = 46;

    /// <summary>Choirwarden: the hymn carries across the whole pack, not just the knot around the chanter.</summary>
    private static double HymnRadius(EnemyState cantor) =>
        HoarfrostCantorBehaviorState.HymnRadius * (cantor.Elite == EliteAffix.Choirwarden ? ChoirwardenHymnMultiplier : 1);

    private readonly List<RimeHuskState> rimeHusks = [];

    private void RegisterFrostDeath(EnemyState enemy)
    {
        // Only a first death leaves a husk: a reknit thrall that falls again shatters for good. Elites leave none either.
        if (enemy.Kind != EnemyKind.FrostlingPackling || enemy.Revived || enemy.IsElite) return;
        if (rimeHusks.Count >= MaxRimeHusks) rimeHusks.RemoveAt(0);
        rimeHusks.Add(new RimeHuskState(enemy.Position, HoarfrostCantorBehaviorState.HuskSeconds));
    }

    private (Vector2D Direction, double Speed) UpdateCantor(EnemyState enemy, HoarfrostCantorBehaviorState cantor, double delta, bool crossing,
        Vector2D direction, double speed, ref int committed, int committedCap)
    {
        var unarmored = 0;
        foreach (var ally in enemies)
        {
            if (!MayTakeRime(enemy, ally) || ally.RimeArmor > 0) continue;
            if (Vector2D.Distance(ally.Position, enemy.Position) <= HymnRadius(enemy)) unarmored++;
        }
        Vector2D? husk = null;
        var best = HoarfrostCantorBehaviorState.ReknitRange;
        foreach (var candidate in rimeHusks)
        {
            var distance = Vector2D.Distance(candidate.Position, enemy.Position);
            if (distance > best) continue;
            best = distance;
            husk = candidate.Position;
        }

        switch (cantor.Tick(delta, enemy.Position, player.Position, enemy.Health, enemy.MaxHealth, unarmored, husk, !crossing && committed < committedCap))
        {
            case CantorEvent.ChantStarted when cantor.IsCommitted:
                committed++;
                break;
            case CantorEvent.HymnCompleted:
                foreach (var ally in enemies)
                {
                    if (!MayTakeRime(enemy, ally) || Vector2D.Distance(ally.Position, enemy.Position) > HymnRadius(enemy)) continue;
                    ally.RimeArmor = ally.MaxHealth * HoarfrostCantorBehaviorState.RimeArmorFraction;
                    ally.RimeArmorRemaining = HoarfrostCantorBehaviorState.RimeArmorSeconds;
                }
                break;
            case CantorEvent.ReknitCompleted:
                ReknitThrall(cantor.ReknitSite);
                break;
            case CantorEvent.VerseCompleted:
                if (Vector2D.Distance(player.Position, enemy.Position) <= HoarfrostCantorBehaviorState.VerseRadius + player.Radius * 0.5)
                {
                    DamagePlayer(HoarfrostCantorBehaviorState.VerseDamage * EliteImpact(enemy));
                    ChillPlayer(HoarfrostCantorBehaviorState.VerseChill);
                }
                break;
        }

        if (cantor.Phase != CantorPhase.Keep) return (direction, 0);
        if (crossing) return (direction, speed);
        var (move, multiplier) = cantor.Movement(enemy.Position, player.Position, PackCenter(enemy));
        return (move, speed * multiplier);
    }

    // The hymn armours the Cantor's pack, never the Cantor itself: killing the chanter stays the answer.
    private static bool MayTakeRime(EnemyState cantor, EnemyState ally) => ally != cantor && ally.Health > 0 && ally.Cantor is null
        && ally.Reflection is null && !IsReliquaryKind(ally.Kind);

    private void ReknitThrall(Vector2D site)
    {
        var husk = rimeHusks.FirstOrDefault(candidate => Vector2D.Distance(candidate.Position, site) <= ReknitSiteTolerance);
        // Another Cantor reknit it first, or it thawed away mid-chant: the rite finds nothing.
        if (husk is null) return;
        rimeHusks.Remove(husk);
        var definition = EnemyCatalog.Get(EnemyKind.FrostlingPackling);
        var (health, speed) = EnemyStats(definition);
        var thrall = new EnemyState(++enemyId, husk.Position, definition.Radius, health, speed * HoarfrostCantorBehaviorState.ThrallSpeedMultiplier,
            EnemyKind.FrostlingPackling)
        {
            Revived = true,
        };
        thrall.Health = thrall.MaxHealth * HoarfrostCantorBehaviorState.ThrallHealthFraction;
        enemies.Add(thrall);
        ReknitThralls++;
    }

    /// <summary>Thralls the Cantors reknit this run (telemetry and tests).</summary>
    public int ReknitThralls { get; private set; }

    private (Vector2D Direction, double Speed) UpdateWisp(EnemyState enemy, MirrorWispBehaviorState wisp, double delta, bool crossing,
        Vector2D direction, double speed, ref int committed, int committedCap)
    {
        switch (wisp.Tick(delta, enemy.Position, player.Position, MirrorFor(player.Position), !crossing && committed < committedCap))
        {
            case WispEvent.ShimmerStarted:
                committed++;
                wisp.Settle(SafeStepPoint(wisp.Destination, enemy.Radius));
                break;
            case WispEvent.Stepped:
                SpawnReflectionDouble(enemy.Position);
                if (enemy.Elite == EliteAffix.Thousandface)
                {
                    // A second image beside the first: two still mirrors, one moving Wisp.
                    var away = Vector2D.DirectionTo(enemy.Position, wisp.Destination);
                    var side = away == Vector2D.Zero ? new Vector2D(1, 0) : new Vector2D(-away.Y, away.X);
                    SpawnReflectionDouble(SafeStepPoint(enemy.Position + side * ThousandfaceDoubleOffset, enemy.Radius));
                }
                enemy.Position = wisp.Destination;
                break;
            case WispEvent.CutReleased:
                if (wisp.CutHits(enemy.Position, player.Position, player.Radius))
                {
                    DamagePlayer(MirrorWispBehaviorState.CutDamage * EliteImpact(enemy));
                    ChillPlayer(MirrorWispBehaviorState.CutChill);
                }
                break;
        }
        if (wisp.Phase != WispPhase.Drift) return (direction, 0);
        if (crossing) return (direction, speed);
        var drift = wisp.DriftPoint(enemy.Position, player.Position);
        return (Vector2D.DirectionTo(enemy.Position, drift), speed * Math.Min(1, Vector2D.Distance(enemy.Position, drift) / PacklingSlotEaseDistance));
    }

    /// <summary>Black ice is the Wisp's mirror: the nearest patch near (not under) the hunter.</summary>
    private Vector2D? MirrorFor(Vector2D hunter)
    {
        Vector2D? mirror = null;
        var best = MirrorWispBehaviorState.MirrorReach;
        foreach (var patch in blackIcePatches)
        {
            var distance = Vector2D.Distance(patch.Center, hunter);
            if (distance < MirrorWispBehaviorState.MirrorMinimumDistance || distance > best) continue;
            best = distance;
            mirror = patch.Center;
        }
        return mirror;
    }

    // Never step into a wall: walk the line out from the hunter and stop where the ground does.
    private Vector2D SafeStepPoint(Vector2D destination, double radius)
    {
        if (mapState.EncounterActive && arenaEnvironment is not null)
            return arenaEnvironment.RestrictMovement(player.Position, destination, arenaWidth, arenaHeight, radius);
        return new Vector2D(Math.Clamp(destination.X, radius, Math.Max(radius, arenaWidth - radius)),
            Math.Clamp(destination.Y, radius, Math.Max(radius, arenaHeight - radius)));
    }

    private void SpawnReflectionDouble(Vector2D position)
    {
        var definition = EnemyCatalog.Get(EnemyKind.MirrorDouble);
        var (health, speed) = EnemyStats(definition);
        enemies.Add(new EnemyState(++enemyId, position, definition.Radius, Math.Max(0.01, health), speed, EnemyKind.MirrorDouble));
        ReflectionDoubles++;
    }

    /// <summary>Reflection Doubles the Wisps have left this run (telemetry and tests).</summary>
    public int ReflectionDoubles { get; private set; }

    private void UpdateReflection(EnemyState reflection, MirrorDoubleState state, double delta)
    {
        state.Remaining -= delta;
        if (state.Remaining > 0) return;
        // Time breaks the image like glass: a shatter, but no kill, no payout.
        reflection.Health = 0;
        RegisterEnemyDeath(reflection);
    }

    private void UpdateRimeArmor(double delta)
    {
        foreach (var enemy in enemies)
        {
            if (enemy.RimeArmorRemaining <= 0) continue;
            enemy.RimeArmorRemaining = Math.Max(0, enemy.RimeArmorRemaining - delta);
            if (enemy.RimeArmorRemaining <= 0) enemy.RimeArmor = 0;
        }
        foreach (var husk in rimeHusks) husk.Remaining -= delta;
        rimeHusks.RemoveAll(husk => husk.Remaining <= 0);
    }

    /// <summary>Veil, then frost armour: what is left after both reaches health.</summary>
    private static double ApplyFrostDefenses(EnemyState enemy, double damage)
    {
        if (enemy.Wisp is { } wisp) damage *= wisp.DamageMultiplier;
        if (enemy.RimeArmor <= 0 || damage <= 0) return damage;
        var soaked = Math.Min(enemy.RimeArmor, damage);
        enemy.RimeArmor -= soaked;
        if (enemy.RimeArmor <= 0) enemy.RimeArmorRemaining = 0;
        return damage - soaked;
    }

    private EnemyTelegraphRenderSnapshot? CreateFrostRiteTelegraph(EnemyState enemy) => enemy switch
    {
        { Cantor: { Phase: CantorPhase.Chant, Verse: CantorVerse.RimeHymn } hymn } => new EnemyTelegraphRenderSnapshot("rime-hymn", hymn.ChantProgress,
            enemy.Position.X, enemy.Position.Y, HymnRadius(enemy)),
        { Cantor: { Phase: CantorPhase.Chant, Verse: CantorVerse.Reknit } reknit } => new EnemyTelegraphRenderSnapshot("reknit", reknit.ChantProgress,
            reknit.ReknitSite.X, reknit.ReknitSite.Y, EnemyCatalog.Get(EnemyKind.FrostlingPackling).Radius * 1.6),
        { Cantor: { Phase: CantorPhase.Chant, Verse: CantorVerse.StillnessVerse } verse } => new EnemyTelegraphRenderSnapshot("stillness",
            verse.ChantProgress, enemy.Position.X, enemy.Position.Y, HoarfrostCantorBehaviorState.VerseRadius),
        { Wisp: { Phase: WispPhase.Shimmer } shimmer } => new EnemyTelegraphRenderSnapshot("glass-step", shimmer.ShimmerProgress,
            shimmer.Destination.X, shimmer.Destination.Y, enemy.Radius * 1.6),
        // The target is the far middle of the cut's arc: the renderer reads the direction from it.
        { Wisp: { Phase: WispPhase.Windup or WispPhase.Cut } cut } => new EnemyTelegraphRenderSnapshot(
            cut.Phase == WispPhase.Cut ? "shiver-slash" : "shiver-cut", cut.Phase == WispPhase.Cut ? 1 : cut.WindupProgress,
            enemy.Position.X + cut.CutDirection.X * MirrorWispBehaviorState.CutRange,
            enemy.Position.Y + cut.CutDirection.Y * MirrorWispBehaviorState.CutRange, MirrorWispBehaviorState.CutRange),
        _ => null,
    };

    /// <summary>Veiled Wisps and their doubles look the same: half there. A shimmering Wisp fades from where it stands.</summary>
    private static double FrostOpacity(EnemyState enemy) => enemy switch
    {
        { Wisp: { Phase: WispPhase.Shimmer } shimmer } => VeiledOpacity * (1 - shimmer.ShimmerProgress * 0.7),
        { Wisp.IsVeiled: true } => VeiledOpacity,
        { Reflection: { } reflection } => VeiledOpacity * Math.Clamp(reflection.Remaining / 0.5, 0, 1),
        // The Refraction Veil: the true body and its false forms all look half-there. Only the lanterns tell them apart.
        { GlassReliquary.IsVeiled: true } or { FalseForm: not null } => GlassVeiledOpacity,
        _ => 1,
    };

    private const double VeiledOpacity = 0.6;
    private const double GlassVeiledOpacity = 0.78;

    private static double RimeArmorRatio(EnemyState enemy) => enemy.RimeArmor <= 0 ? 0
        : Math.Clamp(enemy.RimeArmor / (enemy.MaxHealth * HoarfrostCantorBehaviorState.RimeArmorFraction), 0, 1);

    private IReadOnlyList<RimeHuskRenderSnapshot> CreateRimeHuskSnapshots() => rimeHusks
        .Select(husk => new RimeHuskRenderSnapshot(husk.Position.X, husk.Position.Y,
            Math.Clamp(husk.Remaining / HoarfrostCantorBehaviorState.HuskSeconds, 0, 1))).ToArray();

    private sealed class RimeHuskState(Vector2D position, double seconds)
    {
        public Vector2D Position { get; } = position;

        public double Remaining { get; set; } = seconds;
    }
}
