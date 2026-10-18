using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Frost F4c: the Reliquary of Glass, the Frost region's answer to the Reliquary. Same road semantics (the hush, the sigil, the
/// optional duel that withdraws when the road is cleared first), but where the Fire Reliquary pressures, this one boxes the hunter
/// in. Crystal Wards tether burning light beams to the caster; the Refraction Veil hides it among false forms that break in one hit
/// (only the true body keeps its lanterns lit); Glacial Prisons rise around the hunter, one more cage for every ward still standing.
/// Ritual layers accumulate: false forms left standing when the veil fades close prisons of their own. Provisional numbers.
/// </summary>
public sealed partial class RunSimulation
{
    public const int GlassMaxLiveWards = 3;
    public const int GlassMaxWardsPerFight = 9;
    public const double GlassWardOffset = 110;
    public const double GlassWardedDamageMultiplier = 0.35;
    public const double GlassTetherKindleSeconds = 0.9;
    public const double GlassTetherHalfWidth = 7;
    public const double GlassTetherDamage = 7;
    public const int GlassTetherChill = 1;
    public const double GlassTetherHitCooldownSeconds = 1;
    public const double GlassFalseFormOffset = 120;
    public const double GlassPrisonRadius = 72;
    public const double GlassPrisonRiseSeconds = 1.2;
    public const double GlassPrisonStandSeconds = 4;
    public const double GlassPrisonWallThickness = 16;
    public const double GlassPrisonWallDamage = 10;
    public const int GlassPrisonWallChill = 2;
    public const int GlassPrisonTrapChill = 1;
    public const double GlassPrisonWallCooldownSeconds = 0.6;
    public const double GlassPrisonLayerOffset = 150;
    public const int GlassMaxPrisons = 6;

    private readonly List<CrystalWardState> crystalWards = [];
    private readonly List<GlassPrisonState> glassPrisons = [];
    private readonly List<EnemyState> glassFalseForms = [];
    private int crystalWardsRaised;

    /// <summary>Times the hunter found the true body through the veil this run (telemetry, tests and the arena moment).</summary>
    public int GlassVeilsBroken { get; private set; }

    public int GlassPrisonsRaised { get; private set; }

    private bool CanRaiseCrystalWard => crystalWards.Count < GlassMaxLiveWards && crystalWardsRaised < GlassMaxWardsPerFight;

    private (Vector2D Direction, double Speed) UpdateGlassReliquary(EnemyState enemy, GlassReliquaryBehaviorState glass, double scaledDelta,
        bool crossing, Vector2D direction, double speed)
    {
        switch (glass.Tick(scaledDelta, enemy.Health, enemy.MaxHealth, CanRaiseCrystalWard))
        {
            case GlassReliquaryEvent.WardRaised:
                RaiseCrystalWard(enemy);
                break;
            case GlassReliquaryEvent.VeilCast:
                CastRefractionVeil(enemy, glass);
                break;
            case GlassReliquaryEvent.PrisonCast:
                CastGlacialPrisons(enemy);
                break;
            case GlassReliquaryEvent.VeilFaded:
                FadeRefractionVeil();
                break;
            case GlassReliquaryEvent.ShatterStarted:
                ReliquaryShifts++;
                ShatterFalseForms();
                break;
            case GlassReliquaryEvent.ShatterCompleted:
                for (var pylon = 0; pylon < GlassMaxLiveWards && CanRaiseCrystalWard; pylon++) RaiseCrystalWard(enemy);
                break;
        }
        if (glass.Phase != ReliquaryPhase.Advance) return (direction, 0);
        if (crossing) return (direction, speed);
        var (move, multiplier) = glass.Movement(enemy.Position, player.Position);
        return (move, speed * multiplier);
    }

    /// <summary>False forms drift exactly like the true body and hold still while it casts: their movement never gives it away.</summary>
    private (Vector2D Direction, double Speed) UpdateGlassFalseForm(EnemyState form, bool crossing, Vector2D direction, double speed)
    {
        if (reliquary?.GlassReliquary is not { Phase: ReliquaryPhase.Advance }) return (direction, 0);
        if (crossing) return (direction, speed);
        var (move, multiplier) = GlassReliquaryBehaviorState.KeepRange(form.Position, player.Position);
        return (move, speed * multiplier);
    }

    private void RaiseCrystalWard(EnemyState caster)
    {
        if (!CanRaiseCrystalWard) return;
        var definition = EnemyCatalog.Get(EnemyKind.CrystalWard);
        var toward = Vector2D.DirectionTo(caster.Position, player.Position);
        if (toward == Vector2D.Zero) toward = new Vector2D(1, 0);
        var baseAngle = Math.Atan2(toward.Y, toward.X);
        // Spokes toward the hunter's side first, so the tethers fence the approach rather than the caster's back.
        double[] offsets = [Math.PI / 3, -Math.PI / 3, Math.PI, Math.PI * 2 / 3, -Math.PI * 2 / 3, 0];
        var start = crystalWardsRaised % 3;
        Vector2D? position = null;
        for (var step = 0; step < offsets.Length && position is null; step++)
        {
            var angle = baseAngle + offsets[(start + step) % offsets.Length];
            var candidate = caster.Position + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * GlassWardOffset;
            var clamped = new Vector2D(Math.Clamp(candidate.X, definition.Radius, arenaWidth - definition.Radius),
                Math.Clamp(candidate.Y, definition.Radius, arenaHeight - definition.Radius));
            if (arenaEnvironment?.IsBlocked(clamped, arenaWidth, arenaHeight, definition.Radius) == true) continue;
            if (crystalWards.Any(pylon => Vector2D.Distance(pylon.Ward.Position, clamped) < definition.Radius * 3)) continue;
            position = clamped;
        }
        var (health, _) = EnemyStats(definition);
        var ward = new EnemyState(++enemyId, position ?? caster.Position, definition.Radius, health, 0, EnemyKind.CrystalWard);
        enemies.Add(ward);
        crystalWards.Add(new CrystalWardState(ward));
        crystalWardsRaised++;
    }

    /// <summary>
    /// The caster and its false forms take the points of a ring around where it stood; which point is true comes from the map seed,
    /// never from the simulation's random stream. Only the true body keeps its lanterns lit.
    /// </summary>
    private void CastRefractionVeil(EnemyState caster, GlassReliquaryBehaviorState glass)
    {
        ShatterFalseForms();
        var definition = EnemyCatalog.Get(EnemyKind.GlassFalseForm);
        var points = glass.FalseForms + 1;
        var toward = Vector2D.DirectionTo(caster.Position, player.Position);
        var baseAngle = toward == Vector2D.Zero ? 0 : Math.Atan2(toward.Y, toward.X) + Math.PI / 2;
        var trueSlot = (int)((uint)EliteRollSeed(mapState.Seed, depthState.Depth, $"glass-veil-{glass.VeilsCast}") % (uint)points);
        var origin = caster.Position;
        var (health, speed) = EnemyStats(definition);
        for (var slot = 0; slot < points; slot++)
        {
            var angle = baseAngle + slot * Math.PI * 2 / points;
            var spot = SafeStepPoint(origin + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * GlassFalseFormOffset, caster.Radius);
            if (slot == trueSlot)
            {
                caster.Position = spot;
                continue;
            }
            var form = new EnemyState(++enemyId, spot, definition.Radius, Math.Max(0.01, health), speed, EnemyKind.GlassFalseForm);
            enemies.Add(form);
            glassFalseForms.Add(form);
        }
    }

    /// <summary>Called from <see cref="DamageTarget"/>: a hit on the true body breaks the veil, every false form shatters with it.</summary>
    private void TryBreakGlassVeil(EnemyState target)
    {
        if (target.GlassReliquary is not { IsVeiled: true } glass || !glass.BreakVeil()) return;
        GlassVeilsBroken++;
        ShatterFalseForms();
    }

    /// <summary>The veil ran out: every false form still standing closes a prison on the hunter's road before it breaks.</summary>
    private void FadeRefractionVeil()
    {
        var survivors = glassFalseForms.Where(form => form.Health > 0).ToArray();
        for (var index = 0; index < survivors.Length; index++)
        {
            var away = Vector2D.DirectionTo(player.Position, survivors[index].Position);
            AddGlassPrison(index == 0 || away == Vector2D.Zero ? player.Position : player.Position + away * GlassPrisonLayerOffset);
        }
        ShatterFalseForms();
    }

    private void ShatterFalseForms()
    {
        foreach (var form in glassFalseForms)
        {
            if (form.Health <= 0) continue;
            // Glass breaking: a shatter, no kill, no payout, no record.
            form.Health = 0;
            RegisterEnemyDeath(form);
        }
        glassFalseForms.Clear();
    }

    /// <summary>One cage on the hunter, and one more around it for every Crystal Ward still standing: the layers accumulate.</summary>
    private void CastGlacialPrisons(EnemyState caster)
    {
        AddGlassPrison(player.Position);
        var away = Vector2D.DirectionTo(caster.Position, player.Position);
        var baseAngle = away == Vector2D.Zero ? 0 : Math.Atan2(away.Y, away.X);
        var layers = crystalWards.Count;
        for (var layer = 0; layer < layers; layer++)
        {
            // Fanned ahead of the hunter (away from the caster), where a retreat would run.
            var angle = baseAngle + (layer - (layers - 1) / 2.0) * (Math.PI / 2.5);
            AddGlassPrison(player.Position + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * GlassPrisonLayerOffset);
        }
    }

    private void AddGlassPrison(Vector2D center)
    {
        if (glassPrisons.Count >= GlassMaxPrisons) return;
        var clamped = new Vector2D(Math.Clamp(center.X, 0, arenaWidth), Math.Clamp(center.Y, 0, arenaHeight));
        glassPrisons.Add(new GlassPrisonState(clamped));
        GlassPrisonsRaised++;
    }

    private void UpdateGlassReliquaryHazards(double delta)
    {
        if (delta <= 0) return;
        crystalWards.RemoveAll(pylon => pylon.Ward.Health <= 0);
        var caster = reliquary is { Health: > 0, GlassReliquary: not null } glass ? glass : null;
        foreach (var pylon in crystalWards)
        {
            pylon.Age += delta;
            pylon.Cooldown = Math.Max(0, pylon.Cooldown - delta);
            if (caster is null || pylon.Age < GlassTetherKindleSeconds || pylon.Cooldown > 0) continue;
            var closest = ClosestPointOnSegment(pylon.Ward.Position, caster.Position, player.Position);
            if (Vector2D.Distance(closest, player.Position) > GlassTetherHalfWidth + player.Radius * 0.5) continue;
            pylon.Cooldown = GlassTetherHitCooldownSeconds;
            DamagePlayer(GlassTetherDamage);
            ChillPlayer(GlassTetherChill);
        }

        foreach (var prison in glassPrisons)
        {
            prison.Elapsed += delta;
            prison.WallCooldown = Math.Max(0, prison.WallCooldown - delta);
            var inside = Vector2D.Distance(player.Position, prison.Center) < GlassPrisonRadius;
            if (!prison.Risen)
            {
                if (prison.Elapsed < GlassPrisonRiseSeconds) continue;
                prison.Risen = true;
                prison.HunterInside = inside;
                RegisterElementalImpact(prison.Center, SpellId.FrostShard);
                if (!inside) continue;
                prison.Trapped = true;
                ChillPlayer(GlassPrisonTrapChill);
                continue;
            }
            if (inside == prison.HunterInside) continue;
            // The wall is the cage: crossing it, in or out, always costs a hit.
            prison.HunterInside = inside;
            if (prison.WallCooldown > 0) continue;
            prison.WallCooldown = GlassPrisonWallCooldownSeconds;
            DamagePlayer(GlassPrisonWallDamage);
            ChillPlayer(GlassPrisonWallChill);
        }
        glassPrisons.RemoveAll(prison => prison.Elapsed >= GlassPrisonRiseSeconds + GlassPrisonStandSeconds);
    }

    private void EndGlassRites()
    {
        foreach (var pylon in crystalWards) pylon.Ward.Health = 0;
        crystalWards.Clear();
        ShatterFalseForms();
        glassPrisons.Clear();
    }

    private void ClearGlassState()
    {
        crystalWards.Clear();
        glassFalseForms.Clear();
        glassPrisons.Clear();
        crystalWardsRaised = 0;
    }

    private EnemyTelegraphRenderSnapshot? CreateGlassReliquaryTelegraph(EnemyState enemy) => enemy.GlassReliquary switch
    {
        { IsCasting: true } rite => rite.Rite switch
        {
            GlassReliquaryRite.CrystalWard => new EnemyTelegraphRenderSnapshot("glass-ward", rite.CastProgress, enemy.Position.X, enemy.Position.Y,
                GlassWardOffset),
            GlassReliquaryRite.Veil => new EnemyTelegraphRenderSnapshot("glass-veil", rite.CastProgress, enemy.Position.X, enemy.Position.Y,
                GlassFalseFormOffset),
            // The prison follows the hunter while it gathers: it closes wherever they stand when the cast ends.
            _ => new EnemyTelegraphRenderSnapshot("glass-prison", rite.CastProgress, player.Position.X, player.Position.Y, GlassPrisonRadius),
        },
        { Phase: ReliquaryPhase.Shift } shattering => new EnemyTelegraphRenderSnapshot("glass-shatter", shattering.ShiftProgress, enemy.Position.X,
            enemy.Position.Y, enemy.Radius * 2),
        { Exposed: true } exposed => new EnemyTelegraphRenderSnapshot("glass-exposed", exposed.ExposedProgress, enemy.Position.X, enemy.Position.Y,
            enemy.Radius * 1.6),
        _ => null,
    };

    private IReadOnlyList<GlassTetherRenderSnapshot> CreateGlassTetherSnapshots() => reliquary is { Health: > 0, GlassReliquary: not null } caster
        ? crystalWards.Where(pylon => pylon.Ward.Health > 0)
            .Select(pylon => new GlassTetherRenderSnapshot(pylon.Ward.Position.X, pylon.Ward.Position.Y, caster.Position.X, caster.Position.Y,
                GlassTetherHalfWidth, Math.Clamp(pylon.Age / GlassTetherKindleSeconds, 0, 1)))
            .ToArray()
        : [];

    private IReadOnlyList<GlassPrisonRenderSnapshot> CreateGlassPrisonSnapshots() => glassPrisons
        .Select(prison => new GlassPrisonRenderSnapshot(prison.Center.X, prison.Center.Y, GlassPrisonRadius,
            Math.Clamp(prison.Elapsed / GlassPrisonRiseSeconds, 0, 1), prison.Risen,
            prison.Risen ? Math.Clamp(1 - (prison.Elapsed - GlassPrisonRiseSeconds) / GlassPrisonStandSeconds, 0, 1) : 1, prison.Trapped))
        .ToArray();

    private sealed class CrystalWardState(EnemyState ward)
    {
        public EnemyState Ward { get; } = ward;

        public double Age { get; set; }

        public double Cooldown { get; set; }
    }

    private sealed class GlassPrisonState(Vector2D center)
    {
        public Vector2D Center { get; } = center;

        public double Elapsed { get; set; }

        public double WallCooldown { get; set; }

        public bool Risen { get; set; }

        public bool HunterInside { get; set; }

        public bool Trapped { get; set; }
    }
}
