using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>The Reliquary fell this run: the one-off reward it paid.</summary>
public sealed record ReliquaryDefeat(int ExperienceAwarded);

public enum ReliquaryStage
{
    Absent,
    Waiting,
    Hush,
    Emerging,
    Duel,
    Withdrawn,
    Slain,
}

/// <summary>
/// Roster step 6 (encounter brief §8): the ultra-rare Reliquary. One independent roll per hunt map (about 6%), placed on the first
/// eligible road the hunter enters. It never interrupts control: the world hushes for a beat while its sigil marks where it will
/// rise, then it duels on its own terms. Like a Gungeon Lord of the Jammed in reverse, it is optional: it never blocks the node
/// from clearing and simply withdraws, unrewarded, if the road is cleared first. Its rites are always marked on the ground.
/// </summary>
public sealed partial class RunSimulation
{
    public const double ReliquaryChance = 0.06;
    public const int ReliquaryFirstStage = 4;
    public const int ReliquaryLastStage = 7;
    public const double ReliquaryRevealSeconds = 8;
    public const double ReliquaryHushSeconds = 1.2;
    public const double ReliquaryEmergeSeconds = 1.4;
    public const double ReliquaryRevealDistance = 240;
    public const int ReliquaryMaxLiveWards = 2;
    public const int ReliquaryMaxWardsPerFight = 8;
    public const double ReliquaryWardOffset = 70;
    public const double ReliquaryWardEmpowerRadius = 150;
    public const double ReliquaryWardSpeedMultiplier = 1.2;
    public const double ReliquaryWardImpactMultiplier = 1.25;
    public const double ReliquaryWardedDamageMultiplier = 0.4;
    public const double ReliquaryWardBlastDelaySeconds = 1.1;
    public const double ReliquaryWardBlastRadius = 70;
    public const double ReliquaryWardBlastDamage = 14;
    public const double ReliquaryFieldArmSeconds = 1;
    public const double ReliquaryFieldActiveSeconds = 4.5;
    public const double ReliquaryFieldRadius = 64;
    public const double ReliquaryFieldDamagePerSecond = 9;
    public const int ReliquaryMaxLiveFields = 3;
    public const double ReliquarySealDelaySeconds = 1.8;
    public const double ReliquarySealRadius = 90;
    public const double ReliquaryShiftedSealRadius = 110;
    public const double ReliquarySealDamage = 24;
    public const int ReliquaryExperience = 20;

    private static readonly WyrmrealmHabitat[] ReliquaryHabitats =
        [WyrmrealmHabitat.MonasteryGrounds, WyrmrealmHabitat.FloodedCloister, WyrmrealmHabitat.ScorchedApproach];

    private readonly List<EnemyState> reliquaryWards = [];
    private readonly List<ReliquaryFieldState> reliquaryFields = [];
    private (int Seed, int Depth)? reliquaryMap;
    private bool reliquaryMapPending;
    private double reliquaryTimer;
    private Vector2D reliquarySigil;
    private EnemyState? reliquary;
    private int reliquaryWardsPlanted;

    public ReliquaryStage ReliquaryStage { get; private set; }

    /// <summary>Increments when the world hushes and the sigil appears; the arena announces it.</summary>
    public int ReliquarySightings { get; private set; }

    public int ReliquaryShifts { get; private set; }

    public int ReliquaryWithdrawals { get; private set; }

    public ReliquaryDefeat? ReliquaryDefeat { get; private set; }

    /// <summary>True when this hunt map (seed and depth) carries the Reliquary. Its own hash: never shifts spawns or elites.</summary>
    public static bool IsReliquaryHunt(int seed, int depth) => new Random(EliteRollSeed(seed, depth, "reliquary")).NextDouble() < ReliquaryChance;

    /// <summary>A combat road on the monastery side of the realm, before the bell tower's approach. Never the tutorial road or a lair.</summary>
    public static bool IsReliquaryEligible(WyrmrealmMapNode node) => node.Type == WyrmrealmNodeType.Combat && !node.PreLair
        && node.Stage is >= ReliquaryFirstStage and <= ReliquaryLastStage && ReliquaryHabitats.Contains(node.Habitat);

    private static bool IsReliquaryKind(EnemyKind kind) => kind is EnemyKind.Reliquary or EnemyKind.ReliquaryWard;

    private bool IsReliquaryNode => ReliquaryStage is not (ReliquaryStage.Absent or ReliquaryStage.Withdrawn or ReliquaryStage.Slain);

    private void PrepareReliquaryNode(WyrmrealmMapNode node)
    {
        if (reliquaryMap != (mapState.Seed, depthState.Depth))
        {
            reliquaryMap = (mapState.Seed, depthState.Depth);
            reliquaryMapPending = IsReliquaryHunt(mapState.Seed, depthState.Depth);
        }
        // Never on the Warden's road, whatever its habitat: one monumental threat at a time (brief §5).
        if (!reliquaryMapPending || !IsReliquaryEligible(node) || IsBellWardenNode) return;
        reliquaryMapPending = false;
        ReliquaryStage = ReliquaryStage.Waiting;
        reliquaryTimer = ReliquaryRevealSeconds;
    }

    /// <summary>Advances the reveal. Returns true during the hush, when every enemy and hostile shot holds still.</summary>
    private bool UpdateReliquaryReveal(double delta)
    {
        switch (ReliquaryStage)
        {
            case ReliquaryStage.Waiting:
                if (!mapState.EncounterActive || entryGraceRemaining > 0) return false;
                // Never rise into the mop-up: once the road only needs clearing, the Reliquary stays hidden and the chance passes.
                if (encounterDirector.CanComplete && mapState.CurrentNodeKills >= mapState.CurrentNodeKillsRequired) return false;
                reliquaryTimer = Math.Max(0, reliquaryTimer - delta);
                if (reliquaryTimer > 0 || FindReliquarySigil() is not { } sigil) return false;
                reliquarySigil = sigil;
                ReliquaryStage = ReliquaryStage.Hush;
                reliquaryTimer = ReliquaryHushSeconds;
                ReliquarySightings++;
                return true;
            case ReliquaryStage.Hush:
                reliquaryTimer -= delta;
                if (reliquaryTimer > 0) return true;
                ReliquaryStage = ReliquaryStage.Emerging;
                reliquaryTimer = ReliquaryEmergeSeconds;
                return false;
            case ReliquaryStage.Emerging:
                reliquaryTimer -= delta;
                if (reliquaryTimer <= 0) BeginReliquaryDuel();
                return false;
            default:
                return false;
        }
    }

    private Vector2D? FindReliquarySigil()
    {
        var radius = EnemyCatalog.Get(EnemyKind.Reliquary).Radius;
        // A seeded opening angle, then the remaining compass points; the search consumes no randomness.
        var start = EliteRollSeed(mapState.Seed, depthState.Depth, "reliquary-sigil") % 8;
        for (var step = 0; step < 8; step++)
        {
            var angle = (start + step) % 8 * Math.PI / 4;
            var requested = player.Position + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * ReliquaryRevealDistance;
            if (arenaEnvironment is null) return requested;
            if (arenaEnvironment.AdjustSpawnPosition(requested, player.Position, arenaWidth, arenaHeight, radius) is { } spot) return spot;
        }
        return null;
    }

    private void BeginReliquaryDuel()
    {
        var definition = EnemyCatalog.Get(EnemyKind.Reliquary);
        var (health, speed) = EnemyStats(definition);
        reliquary = new EnemyState(++enemyId, reliquarySigil, definition.Radius, health, speed, EnemyKind.Reliquary);
        enemies.Add(reliquary);
        RecordEnemyEncounter(EnemyKind.Reliquary);
        ReliquaryStage = ReliquaryStage.Duel;
    }

    private (Vector2D Direction, double Speed) UpdateReliquary(EnemyState enemy, ReliquaryBehaviorState rite, double scaledDelta, bool crossing,
        Vector2D direction, double speed)
    {
        switch (rite.Tick(scaledDelta, enemy.Health, enemy.MaxHealth, player.Position, CanPlantWard))
        {
            case ReliquaryEvent.WardPlanted:
                PlantWard(enemy);
                break;
            case ReliquaryEvent.CorruptionCast:
                CastCorruption(enemy, rite);
                break;
            case ReliquaryEvent.SealCast:
                hostileProjectiles.Add(new HostileProjectileState(rite.CastPoint, rite.CastPoint, ReliquarySealDelaySeconds,
                    rite.Shifted ? ReliquaryShiftedSealRadius : ReliquarySealRadius, ReliquarySealDamage, 0) { Style = HostileProjectileStyle.Seal });
                break;
            case ReliquaryEvent.ShiftStarted:
                ReliquaryShifts++;
                break;
            case ReliquaryEvent.ShiftCompleted:
                while (CanPlantWard) PlantWard(enemy);
                break;
        }
        if (rite.Phase != ReliquaryPhase.Advance) return (direction, 0);
        if (crossing) return (direction, speed);
        var (move, multiplier) = rite.Movement(enemy.Position, player.Position);
        return (move, speed * multiplier);
    }

    private bool CanPlantWard => reliquaryWards.Count < ReliquaryMaxLiveWards && reliquaryWardsPlanted < ReliquaryMaxWardsPerFight;

    private void PlantWard(EnemyState caster)
    {
        if (!CanPlantWard) return;
        var definition = EnemyCatalog.Get(EnemyKind.ReliquaryWard);
        var toward = Vector2D.DirectionTo(caster.Position, player.Position);
        var side = toward == Vector2D.Zero ? new Vector2D(0, 1) : new Vector2D(-toward.Y, toward.X);
        var sign = reliquaryWardsPlanted % 2 == 0 ? 1 : -1;
        Vector2D[] candidates = [caster.Position + side * (ReliquaryWardOffset * sign), caster.Position - side * (ReliquaryWardOffset * sign),
            caster.Position - toward * ReliquaryWardOffset];
        var position = caster.Position;
        foreach (var candidate in candidates)
        {
            var clamped = new Vector2D(Math.Clamp(candidate.X, definition.Radius, arenaWidth - definition.Radius),
                Math.Clamp(candidate.Y, definition.Radius, arenaHeight - definition.Radius));
            if (arenaEnvironment?.IsBlocked(clamped, arenaWidth, arenaHeight, definition.Radius) == true) continue;
            position = clamped;
            break;
        }
        var (health, _) = EnemyStats(definition);
        var ward = new EnemyState(++enemyId, position, definition.Radius, health, 0, EnemyKind.ReliquaryWard);
        enemies.Add(ward);
        reliquaryWards.Add(ward);
        reliquaryWardsPlanted++;
    }

    private void UpdateReliquaryWard(EnemyState ward, ReliquaryWardState fuse, double scaledDelta)
    {
        if (!fuse.Tick(scaledDelta)) return;
        // Left standing, the ward bursts behind a marked blast; it pays nothing and leaves the field.
        ward.Health = 0;
        reliquaryWards.Remove(ward);
        hostileProjectiles.Add(new HostileProjectileState(ward.Position, ward.Position, ReliquaryWardBlastDelaySeconds, ReliquaryWardBlastRadius,
            ReliquaryWardBlastDamage, 0) { Style = HostileProjectileStyle.Ward });
    }

    private void CastCorruption(EnemyState caster, ReliquaryBehaviorState rite)
    {
        AddCorruptionField(rite.CastPoint);
        if (rite.Shifted) AddCorruptionField(caster.Position + (rite.CastPoint - caster.Position) * 0.5);
    }

    private void AddCorruptionField(Vector2D position)
    {
        if (reliquaryFields.Count >= ReliquaryMaxLiveFields) return;
        // Never stack a pool on a live seal: one readable threat per patch of ground.
        if (hostileProjectiles.Any(seal => seal.Style == HostileProjectileStyle.Seal
            && Vector2D.Distance(seal.Target, position) < seal.Radius + ReliquaryFieldRadius)) return;
        reliquaryFields.Add(new ReliquaryFieldState(position));
    }

    private void UpdateReliquaryFields(double delta)
    {
        foreach (var field in reliquaryFields)
        {
            field.Elapsed += delta;
            if (field.Armed && delta > 0 && Vector2D.Distance(player.Position, field.Position) <= ReliquaryFieldRadius + player.Radius * 0.5)
                DamagePlayerContact(ReliquaryFieldDamagePerSecond);
        }
        reliquaryFields.RemoveAll(field => field.Expired);
    }

    private bool IsWardEmpowered(EnemyState enemy) => reliquaryWards.Count > 0 && !IsReliquaryKind(enemy.Kind)
        && reliquaryWards.Any(ward => ward.Health > 0 && Vector2D.Distance(ward.Position, enemy.Position) <= ReliquaryWardEmpowerRadius);

    /// <summary>Called from the kill flow. Wards pay nothing; the Reliquary pays its reward once and ends its rites.</summary>
    private void ResolveReliquaryDeath(EnemyState enemy)
    {
        RegisterEnemyDeath(enemy);
        if (enemy.Kind == EnemyKind.ReliquaryWard)
        {
            reliquaryWards.Remove(enemy);
            return;
        }
        kills++;
        RecordEnemyKill(enemy.Kind);
        score += (int)((100 + (int)(elapsed * 2)) * 10 * depthState.ScoreMultiplier);
        ReliquaryDefeat = new ReliquaryDefeat(ReliquaryExperience);
        experienceShards.Drop(enemy.Position, ReliquaryExperience);
        ReliquaryStage = ReliquaryStage.Slain;
        EndReliquaryRites();
    }

    /// <summary>The road was cleared first: the Reliquary leaves without a reward. Never revealed, the chance simply passes.</summary>
    private void WithdrawReliquary()
    {
        if (ReliquaryStage is ReliquaryStage.Hush or ReliquaryStage.Emerging or ReliquaryStage.Duel) ReliquaryWithdrawals++;
        if (IsReliquaryNode) ReliquaryStage = ReliquaryStage.Withdrawn;
        if (reliquary is { Health: > 0 }) reliquary.Health = 0;
        EndReliquaryRites();
    }

    private void EndReliquaryRites()
    {
        foreach (var ward in reliquaryWards) ward.Health = 0;
        reliquaryWards.Clear();
        reliquaryFields.Clear();
        hostileProjectiles.RemoveAll(blast => blast.Style is HostileProjectileStyle.Seal or HostileProjectileStyle.Ward);
        reliquary = null;
    }

    private void ClearReliquaryState()
    {
        reliquaryWards.Clear();
        reliquaryFields.Clear();
        reliquary = null;
        reliquaryWardsPlanted = 0;
        reliquaryTimer = 0;
        ReliquaryStage = ReliquaryStage.Absent;
    }

    private ReliquaryRenderSnapshot? CreateReliquarySnapshot() => ReliquaryStage switch
    {
        ReliquaryStage.Hush => new("hush", reliquarySigil.X, reliquarySigil.Y, Math.Clamp(1 - reliquaryTimer / ReliquaryHushSeconds, 0, 1), 1, false, false, 0),
        ReliquaryStage.Emerging => new("emerging", reliquarySigil.X, reliquarySigil.Y, Math.Clamp(1 - reliquaryTimer / ReliquaryEmergeSeconds, 0, 1), 1, false,
            false, 0),
        ReliquaryStage.Duel when reliquary is { Health: > 0 } boss => new("duel", boss.Position.X, boss.Position.Y, 1,
            Math.Clamp(boss.Health / boss.MaxHealth, 0, 1), boss.Reliquary!.Shifted, reliquaryWards.Count > 0, boss.Reliquary.ShiftProgress),
        _ => null,
    };

    private IReadOnlyList<ReliquaryFieldRenderSnapshot> CreateReliquaryFieldSnapshots() => reliquaryFields
        .Select(field => new ReliquaryFieldRenderSnapshot(field.Position.X, field.Position.Y, ReliquaryFieldRadius, field.Armed,
            Math.Clamp(field.Elapsed / ReliquaryFieldArmSeconds, 0, 1),
            field.Armed ? Math.Clamp(1 - (field.Elapsed - ReliquaryFieldArmSeconds) / ReliquaryFieldActiveSeconds, 0, 1) : 1))
        .ToArray();

    private sealed class ReliquaryFieldState(Vector2D position)
    {
        public Vector2D Position { get; } = position;

        public double Elapsed { get; set; }

        public bool Armed => Elapsed >= ReliquaryFieldArmSeconds;

        public bool Expired => Elapsed >= ReliquaryFieldArmSeconds + ReliquaryFieldActiveSeconds;
    }
}
