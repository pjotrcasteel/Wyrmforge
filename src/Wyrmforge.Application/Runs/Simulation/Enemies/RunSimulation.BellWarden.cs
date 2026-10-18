using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>The Bell Warden fell: the one-off reward its road paid.</summary>
public sealed record BellWardenDefeat(int ExperienceAwarded);

public enum BellWardenStage
{
    Absent,
    Waiting,
    Tolling,
    Fight,
    Slain,
}

/// <summary>
/// Roster step 7 (encounter brief §5, §9): the Bell Warden, the authored pre-lair set piece. It stands on every road that leads
/// straight into the Wyrm's lair (route-graph semantics via <see cref="WyrmrealmMapNode.PreLair"/>), every hunt. The road has no
/// horde: after the entry grace the bell tolls once, the Warden steps out at a marked spot and the road clears when it falls.
/// Reinforcements only come from its rally call and stay far below the horde peak. Never shares a road with the Reliquary or
/// an elite: one monumental threat at a time.
/// </summary>
public sealed partial class RunSimulation
{
    public const double BellWardenEntranceSeconds = 1.6;
    public const double BellWardenEntranceDistance = 260;
    public const double BellSmashRadius = 95;
    public const double BellSmashDamage = 26;
    public const double BellShockwaveDelaySeconds = 0.55;
    public const double BellShockwaveExpandSeconds = 0.9;
    public const double BellShockwaveMaxRadius = 300;
    public const double BellShockwaveThickness = 26;
    public const double BellShockwaveDamage = 10;
    public const int BellTollPulses = 6;
    public const double BellTollFirstOffset = 70;
    public const double BellTollSpacing = 74;
    public const double BellTollRadius = 40;
    public const double BellTollFirstDelaySeconds = 0.15;
    public const double BellTollStepSeconds = 0.09;
    public const double BellTollDamage = 15;
    public const double BellRallyRadius = 120;
    public const int BellRallyAdds = 2;
    public const int BellCrackedRallyAdds = 3;
    public const int BellWardenMaxLiveAdds = 4;
    public const int BellWardenMaxAddsPerFight = 12;
    public const int BellWardenExperience = 24;

    private readonly List<EnemyState> bellWardenAdds = [];
    private readonly List<BellShockwaveState> bellShockwaves = [];
    private double bellWardenTimer;
    private Vector2D bellWardenSpot;
    private EnemyState? bellWarden;
    private int bellWardenAddsRallied;
    private EnemyKind bellRoadKind = EnemyKind.BellWarden;

    public BellWardenStage BellWardenStage { get; private set; }

    /// <summary>Increments when the bell tolls and the Warden's spot is marked; the arena announces it.</summary>
    public int BellWardenArrivals { get; private set; }

    public int BellWardenCracks { get; private set; }

    public BellWardenDefeat? BellWardenDefeat { get; private set; }

    private bool IsBellWardenNode => BellWardenStage != BellWardenStage.Absent;

    /// <summary>Which bell stands on this lair road: the Fire Warden or the Bell of Winter. The arena announces and draws it.</summary>
    public EnemyKind BellRoadKind => bellRoadKind;

    private string BellRoadName => bellRoadKind == EnemyKind.BellOfWinter ? "Bell of Winter" : "Bell Warden";

    private string BellRoadTitle => BellRoadName;

    private string BellRoadVariant => bellRoadKind == EnemyKind.BellOfWinter ? "winter" : "fire";

    private void PrepareBellWardenNode(WyrmrealmMapNode node)
    {
        if (!node.PreLair || node.Type != WyrmrealmNodeType.Combat) return;
        // Each region brings its own set piece to the same road semantics; a region without one keeps an ordinary horde.
        switch (WyrmrealmHabitatCatalog.School(node.Habitat))
        {
            case Domain.Spells.SpellSchool.Fire: bellRoadKind = EnemyKind.BellWarden; break;
            case Domain.Spells.SpellSchool.Frost: bellRoadKind = EnemyKind.BellOfWinter; break;
            default: return;
        }
        BellWardenStage = BellWardenStage.Waiting;
        bellWardenTimer = 0;
    }

    /// <summary>
    /// Runs the Warden road in place of the encounter director. Returns false on any other road, so normal spawning continues.
    /// </summary>
    private bool UpdateBellWardenRoad(double delta)
    {
        if (!IsBellWardenNode || !mapState.EncounterActive) return false;
        switch (BellWardenStage)
        {
            case BellWardenStage.Waiting:
                bellWardenSpot = FindBellWardenSpot() ?? player.Position + new Vector2D(0, -BellWardenEntranceDistance);
                BellWardenStage = BellWardenStage.Tolling;
                bellWardenTimer = BellWardenEntranceSeconds;
                BellWardenArrivals++;
                break;
            case BellWardenStage.Tolling:
                bellWardenTimer -= delta;
                if (bellWardenTimer <= 0) BeginBellWardenFight();
                break;
            case BellWardenStage.Slain:
                if (HostileCount > 0 || mapState.CurrentNode is not { } completed || !mapState.CompleteObjectiveEncounter()) break;
                // The director normally opens the courtyard gates phase by phase; the Warden fights inside the sealed courtyard,
                // so its fall opens every crossing at once and the exit can be reached.
                arenaEnvironment?.SetPhase(EncounterPhase.Climax);
                CompleteTrail(completed);
                break;
        }
        return true;
    }

    private Vector2D? FindBellWardenSpot()
    {
        var radius = EnemyCatalog.Get(bellRoadKind).Radius;
        // Ahead of the hunter first (up the road toward the lair), then the remaining compass points; consumes no randomness.
        for (var step = 0; step < 8; step++)
        {
            var angle = -Math.PI / 2 + (step % 2 == 0 ? 1 : -1) * (step + 1) / 2 * Math.PI / 4;
            var requested = player.Position + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * BellWardenEntranceDistance;
            if (arenaEnvironment is null) return requested;
            if (arenaEnvironment.AdjustSpawnPosition(requested, player.Position, arenaWidth, arenaHeight, radius) is { } spot) return spot;
        }
        return null;
    }

    private void BeginBellWardenFight()
    {
        var definition = EnemyCatalog.Get(bellRoadKind);
        var (health, speed) = EnemyStats(definition);
        bellWarden = new EnemyState(++enemyId, bellWardenSpot, definition.Radius, health, speed, bellRoadKind);
        enemies.Add(bellWarden);
        RecordEnemyEncounter(bellRoadKind);
        BellWardenStage = BellWardenStage.Fight;
    }

    private bool CanRallyBellWarden
    {
        get
        {
            bellWardenAdds.RemoveAll(add => add.Health <= 0);
            return bellWardenAdds.Count < BellWardenMaxLiveAdds && bellWardenAddsRallied < BellWardenMaxAddsPerFight;
        }
    }

    private (Vector2D Direction, double Speed) UpdateBellWarden(EnemyState enemy, BellWardenBehaviorState bell, double scaledDelta, bool crossing,
        Vector2D direction, double speed)
    {
        switch (bell.Tick(scaledDelta, enemy.Position, enemy.Health, enemy.MaxHealth, player.Position, CanRallyBellWarden))
        {
            case BellWardenEvent.Smashed:
                RegisterElementalImpact(bell.Target, Domain.Spells.SpellId.FireBolt);
                if (Vector2D.Distance(player.Position, bell.Target) <= BellSmashRadius + player.Radius * 0.5) DamagePlayer(BellSmashDamage);
                bellShockwaves.Add(new BellShockwaveState(bell.Target));
                break;
            case BellWardenEvent.Tolled:
                foreach (var lane in bell.TollLanes) AddBellToll(enemy.Position, lane);
                break;
            case BellWardenEvent.Rallied:
                RallyBellWardenAdds(bell.Cracked ? BellCrackedRallyAdds : BellRallyAdds);
                break;
            case BellWardenEvent.CrackStarted:
                BellWardenCracks++;
                break;
        }
        return (direction, crossing ? speed : speed * bell.SpeedMultiplier);
    }

    private void AddBellToll(Vector2D origin, Vector2D lane)
    {
        for (var pulse = 0; pulse < BellTollPulses; pulse++)
        {
            var point = origin + lane * (BellTollFirstOffset + pulse * BellTollSpacing);
            if (point.X < 0 || point.Y < 0 || point.X > arenaWidth || point.Y > arenaHeight) break;
            hostileProjectiles.Add(new HostileProjectileState(point, point, BellTollFirstDelaySeconds + pulse * BellTollStepSeconds, BellTollRadius,
                BellTollDamage, 0) { Style = HostileProjectileStyle.Toll });
        }
    }

    private void RallyBellWardenAdds(int count)
    {
        for (var index = 0; index < count && CanRallyBellWarden; index++)
        {
            var before = enemies.Count;
            SpawnEnemy(arenaWidth, arenaHeight, bellWardenAddsRallied % 2 == 0 ? EnemyKind.Hollow : EnemyKind.Ashling);
            bellWardenAddsRallied++;
            if (enemies.Count > before) bellWardenAdds.Add(enemies[^1]);
        }
    }

    private void UpdateBellShockwaves(double delta)
    {
        foreach (var wave in bellShockwaves)
        {
            wave.Elapsed += delta;
            if (wave.Hit || !wave.Expanding || delta <= 0) continue;
            // Only the rolling front hurts: inside the crater, or beyond the outer mark, the hunter is safe.
            if (Math.Abs(Vector2D.Distance(player.Position, wave.Center) - wave.Radius) > BellShockwaveThickness / 2 + player.Radius * 0.5) continue;
            wave.Hit = true;
            DamagePlayer(BellShockwaveDamage);
        }
        bellShockwaves.RemoveAll(wave => wave.Expired);
    }

    /// <summary>Called from the kill flow. Pays once; its rallied reinforcements crumble with it, so the road opens at once.</summary>
    private void ResolveBellWardenDeath(EnemyState enemy)
    {
        RegisterEnemyDeath(enemy);
        kills++;
        RecordEnemyKill(enemy.Kind);
        score += (int)((100 + (int)(elapsed * 2)) * 8 * depthState.ScoreMultiplier);
        BellWardenDefeat = new BellWardenDefeat(BellWardenExperience);
        experienceShards.Drop(enemy.Position, BellWardenExperience);
        BellWardenStage = BellWardenStage.Slain;
        foreach (var add in bellWardenAdds.Where(add => add.Health > 0))
        {
            add.Health = 0;
            RegisterEnemyDeath(add);
        }
        bellWardenAdds.Clear();
        bellShockwaves.Clear();
        ClearWinterBellHazards();
        hostileProjectiles.RemoveAll(toll => toll.Style == HostileProjectileStyle.Toll);
        bellWarden = null;
    }

    private void ClearBellWardenState()
    {
        bellWardenAdds.Clear();
        bellShockwaves.Clear();
        ClearWinterBellHazards();
        bellWarden = null;
        bellWardenAddsRallied = 0;
        bellWardenTimer = 0;
        BellWardenStage = BellWardenStage.Absent;
    }

    private TrailRenderSnapshot? CreateBellWardenTrailSnapshot() => BellWardenStage switch
    {
        BellWardenStage.Waiting or BellWardenStage.Tolling => new(0, "The bell tolls", $"Silence the {BellRoadName}"),
        BellWardenStage.Fight when bellWarden is { } warden => new(Math.Clamp(1 - warden.Health / warden.MaxHealth, 0, 1), BellRoadTitle,
            $"Silence the {BellRoadName}"),
        _ => new(1, "Clear enemies", $"Clear {HostileCount} remaining"),
    };

    private BellWardenRenderSnapshot? CreateBellWardenSnapshot() => BellWardenStage switch
    {
        BellWardenStage.Tolling => new("tolling", bellWardenSpot.X, bellWardenSpot.Y, Math.Clamp(1 - bellWardenTimer / BellWardenEntranceSeconds, 0, 1), 1,
            false, 0, BellRoadVariant),
        BellWardenStage.Fight when bellWarden is { Health: > 0, BellWarden: { } bell } warden => new("fight", warden.Position.X, warden.Position.Y, 1,
            Math.Clamp(warden.Health / warden.MaxHealth, 0, 1), bell.Cracked, bell.CrackProgress),
        BellWardenStage.Fight when bellWarden is { Health: > 0, WinterBell: { } winter } warden => new("fight", warden.Position.X, warden.Position.Y, 1,
            Math.Clamp(warden.Health / warden.MaxHealth, 0, 1), winter.DeepWinter, winter.RimeProgress, BellRoadVariant),
        _ => null,
    };

    private IReadOnlyList<BellShockwaveRenderSnapshot> CreateBellShockwaveSnapshots() => bellShockwaves
        .Select(wave => new BellShockwaveRenderSnapshot(wave.Center.X, wave.Center.Y, wave.Radius, BellSmashRadius, BellShockwaveMaxRadius,
            Math.Clamp(wave.Elapsed / BellShockwaveDelaySeconds, 0, 1), wave.Expanding))
        .ToArray();

    private sealed class BellShockwaveState(Vector2D center)
    {
        public Vector2D Center { get; } = center;

        public double Elapsed { get; set; }

        public bool Hit { get; set; }

        public bool Expanding => Elapsed >= BellShockwaveDelaySeconds;

        public bool Expired => Elapsed >= BellShockwaveDelaySeconds + BellShockwaveExpandSeconds;

        public double Radius => BellSmashRadius + (BellShockwaveMaxRadius - BellSmashRadius)
            * Math.Clamp((Elapsed - BellShockwaveDelaySeconds) / BellShockwaveExpandSeconds, 0, 1);
    }
}
