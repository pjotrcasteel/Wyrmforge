using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>An elite that fell this run, with the reward it paid. The typed hook for future elite loot; XP only for now.</summary>
public sealed record EliteDefeat(EnemyKind Kind, EliteAffix Affix, int ExperienceAwarded);

/// <summary>
/// Roster step 5 (encounter brief §7). One roll per eligible node, made when the node starts (never per spawn): about 10%
/// after the two introductory stages, never on the Outskirts tutorial road, at most one per node and two per hunt map, and
/// no guarantee. The roll uses its own hash of map seed, depth and node id, so it never shifts the spawn stream.
/// </summary>
public sealed partial class RunSimulation
{
    public const double EliteChance = 0.1;
    public const int EliteFirstEligibleStage = 3;
    public const int MaxElitesPerMap = 2;
    public const int EliteEarliestSpawn = 4;
    public const int EliteLatestSpawn = 10;
    public const double GraveboundDelaySeconds = 0.9;
    public const double GraveboundRadius = 60;
    public const double GraveboundDamage = 16;
    public const double PackbloodRadius = 150;
    public const double PackbloodSpeedMultiplier = 1.15;
    public const double EmberAnointerHealFraction = 0.7;
    public const double CinderMarksmanSpread = 52;
    public const double CinderMarksmanSecondFlightSeconds = 0.9;
    public const double DrowncallerEchoDelaySeconds = 0.7;
    public const double DrowncallerEchoRadius = 40;
    public const double DrowncallerEchoDamage = 10;

    private readonly List<EliteDefeat> defeatedElites = [];
    private readonly List<EnemyState> packbloodLeaders = [];
    private int eliteSpawnIndex = -1;
    private int nodeSpawnCount;
    private (int Seed, int Depth) eliteMap;
    private int elitesThisMap;

    /// <summary>Increments whenever an elite enters the field; the arena announces each new one.</summary>
    public int EliteSightings { get; private set; }

    public EliteAffixDefinition? LastEliteSighted { get; private set; }

    public IReadOnlyList<EliteDefeat> DefeatedElites => defeatedElites;

    private void RollNodeElite(WyrmrealmMapNode node)
    {
        nodeSpawnCount = 0;
        eliteSpawnIndex = -1;
        if (eliteMap != (mapState.Seed, depthState.Depth))
        {
            eliteMap = (mapState.Seed, depthState.Depth);
            elitesThisMap = 0;
        }
        // The Reliquary's road carries no elite: one rare threat per road.
        if (IsReliquaryNode || IsBellWardenNode) return;
        if (node.Type != WyrmrealmNodeType.Combat || node.Stage < EliteFirstEligibleStage || node.Habitat == WyrmrealmHabitat.Outskirts) return;
        if (elitesThisMap >= MaxElitesPerMap) return;
        var random = new Random(EliteRollSeed(mapState.Seed, depthState.Depth, node.Id));
        if (random.NextDouble() >= EliteChance) return;
        eliteSpawnIndex = random.Next(EliteEarliestSpawn, EliteLatestSpawn + 1);
    }

    internal static int EliteRollSeed(int seed, int depth, string nodeId)
    {
        // FNV-1a over the node id: string.GetHashCode is randomized per process and would break seeded replays.
        var hash = 2166136261u;
        foreach (var character in nodeId)
        {
            hash ^= character;
            hash *= 16777619u;
        }
        hash ^= unchecked((uint)seed * 2654435761u);
        hash ^= unchecked((uint)depth * 40503u);
        return (int)(hash & 0x7fffffff);
    }

    /// <summary>Counts a real spawn on this node and promotes it when it is the rolled one.</summary>
    private EliteAffix TakeEliteFor(EnemyKind kind)
    {
        if (!mapState.EncounterActive) return EliteAffix.None;
        nodeSpawnCount++;
        if (nodeSpawnCount != eliteSpawnIndex) return EliteAffix.None;
        if (EliteAffixCatalog.TryFor(kind) is null)
        {
            // A kind without an elite form yet (the newest realm's roster): the champion walks in with the next spawn instead.
            eliteSpawnIndex++;
            return EliteAffix.None;
        }
        eliteSpawnIndex = -1;
        elitesThisMap++;
        var definition = EliteAffixCatalog.For(kind);
        EliteSightings++;
        LastEliteSighted = definition;
        return definition.Affix;
    }

    /// <summary>Impact multiplier from an elite affix and from standing near a Reliquary ward.</summary>
    private double EliteImpact(EnemyState enemy) => (enemy.IsElite ? EliteAffixCatalog.Get(enemy.Elite).ImpactMultiplier : 1)
        * (IsWardEmpowered(enemy) ? ReliquaryWardImpactMultiplier : 1);

    private void RefreshPackbloodLeaders()
    {
        packbloodLeaders.Clear();
        foreach (var enemy in enemies)
            if (enemy.Elite == EliteAffix.Packblood && enemy.Health > 0) packbloodLeaders.Add(enemy);
    }

    /// <summary>Within a living Packblood's howl: faster, and immune to the priest-death rout.</summary>
    private bool IsPackbloodEmpowered(EnemyState enemy) => enemy.Kind == EnemyKind.Ashling
        && packbloodLeaders.Any(leader => leader.Health > 0 && Vector2D.Distance(leader.Position, enemy.Position) <= PackbloodRadius);

    private void AddCinderMarksmanEmber(EnemyState enemy, Vector2D target)
    {
        var lane = Vector2D.DirectionTo(enemy.Position, target);
        var side = lane == Vector2D.Zero ? new Vector2D(0, 1) : new Vector2D(-lane.Y, lane.X) * (enemy.Id % 2 == 0 ? 1 : -1);
        hostileProjectiles.Add(new HostileProjectileState(enemy.Position, target + side * CinderMarksmanSpread, CinderMarksmanSecondFlightSeconds,
            AshSlingerBehaviorState.ImpactRadius, AshSlingerBehaviorState.Damage * EliteImpact(enemy), AshSlingerBehaviorState.ArcHeight));
    }

    private void AddDrowncallerEcho(EnemyState enemy, DrownedWraithBehaviorState wraith)
    {
        var spot = enemy.Position + wraith.Facing * (DrownedWraithBehaviorState.StrikeReach * 0.5);
        hostileProjectiles.Add(new HostileProjectileState(spot, spot, DrowncallerEchoDelaySeconds, DrowncallerEchoRadius,
            DrowncallerEchoDamage * EliteImpact(enemy), 0) { Style = HostileProjectileStyle.Echo });
    }

    /// <summary>Elite payout: one larger shard, recorded once. Called only on a first death, so it can never pay twice.</summary>
    private int ResolveEliteDefeat(EnemyState enemy, int baseExperience)
    {
        if (!enemy.IsElite) return baseExperience;
        var experience = (int)Math.Round(baseExperience * EliteAffixCatalog.ExperienceMultiplier);
        defeatedElites.Add(new EliteDefeat(enemy.Kind, enemy.Elite, experience));
        if (enemy.Elite == EliteAffix.Gravebound)
            hostileProjectiles.Add(new HostileProjectileState(enemy.Position, enemy.Position, GraveboundDelaySeconds, GraveboundRadius,
                GraveboundDamage * EliteImpact(enemy), 0) { Style = HostileProjectileStyle.Grave });
        return experience;
    }
}
