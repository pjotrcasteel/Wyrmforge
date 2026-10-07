using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.SelfPlay;

public sealed class HeuristicRunAgent(RunAgentPersonality personality, int seed, SpellSchool? preferredSchool = null) : IRunAgent
{
    private readonly IRandomSource random = new SeededRandomSource(unchecked(seed * 486187739 + 31));

    public string Name => personality.ToString();

    public MovementInput ChooseMovement(RunAgentObservation observation)
    {
        var snapshot = observation.Snapshot;
        var player = new Vector2D(snapshot.Player.X, snapshot.Player.Y);

        if (snapshot.Extraction is { } extraction)
        {
            var target = new Vector2D(extraction.X, extraction.Y);
            var distance = Vector2D.Distance(player, target);
            if (distance > extraction.Radius * 0.55) return ToInput(Vector2D.DirectionTo(player, target));
            return new MovementInput(0, 0);
        }

        var avoidance = CalculateAvoidance(snapshot, player);
        var pickup = CalculatePickupAttraction(snapshot, player);
        var orbit = new Vector2D(Math.Cos(snapshot.Hud.Seconds * 0.63), Math.Sin(snapshot.Hud.Seconds * 0.63));

        var (avoidWeight, pickupWeight, orbitWeight) = personality switch
        {
            RunAgentPersonality.Casual => (1.15, 1.15, 0.18),
            RunAgentPersonality.Kiter => (1.85, 0.72, 0.35),
            RunAgentPersonality.Greedy => (0.72, 1.85, 0.12),
            _ => (1.35, 1.05, 0.24),
        };

        var direction = (avoidance * avoidWeight) + (pickup * pickupWeight) + (orbit * orbitWeight);
        return ToInput(direction.Normalized());
    }

    public string ChooseMapNode(RunAgentObservation observation) => PickBest(observation.AvailableMapNodes, node =>
    {
        var score = node.Rarity == WyrmrealmNodeRarity.Rare ? 4.5 : 0;
        if (node.AttunementSchool == preferredSchool) score += personality == RunAgentPersonality.BuildFocused ? 4 : 1.5;

        score += personality switch
        {
            RunAgentPersonality.Greedy when node.EncounterKind == WyrmrealmEncounterKind.Swarm => 2.5,
            RunAgentPersonality.Kiter when node.EncounterKind == WyrmrealmEncounterKind.StalkerPressure => 1.7,
            RunAgentPersonality.Casual when node.EncounterKind == WyrmrealmEncounterKind.Mixed => 1.2,
            _ => 0,
        };
        return score;
    }).Id;

    public LevelChoice ChooseLevelChoice(RunAgentObservation observation) => PickBest(observation.LevelChoices, choice =>
    {
        var score = RoleScore(choice.Role) + RarityScore(choice.Rarity);
        var searchable = $"{choice.Name} {choice.Description} {choice.Hint}";

        if (ContainsAny(searchable, "damage", "projectile", "chain", "echo", "multicast")) score += personality == RunAgentPersonality.Greedy ? 2.2 : 0.7;
        if (ContainsAny(searchable, "health", "vitality", "barrier", "damage taken", "freeze")) score += personality is RunAgentPersonality.Casual or RunAgentPersonality.Kiter ? 2 : 0.4;
        if (ContainsAny(searchable, "move speed", "cast speed", "cooldown")) score += personality == RunAgentPersonality.Kiter ? 1.8 : 0.8;
        if (choice.Kind == LevelChoiceKind.Synergy) score += 2.4;

        if (preferredSchool is { } school && searchable.Contains(school.ToString(), StringComparison.OrdinalIgnoreCase))
            score += personality == RunAgentPersonality.BuildFocused ? 3.5 : 0.8;

        return score;
    });

    public RelicId ChooseRelic(RunAgentObservation observation) => PickBest(observation.RelicChoices, relic =>
    {
        var score = relic.Rarity == RelicRarity.Rare ? 2.5 : 0.5;
        if (ContainsAny(relic.Description, "damage", "projectile", "cast")) score += personality == RunAgentPersonality.Greedy ? 2 : 0.7;
        if (ContainsAny(relic.Description, "vitality", "health", "damage taken", "barrier")) score += personality is RunAgentPersonality.Casual or RunAgentPersonality.Kiter ? 2 : 0.4;
        return score;
    }).Id;

    public DragonEssenceId ChooseEssence(RunAgentObservation observation) => PickBest(observation.EssenceChoices, essence =>
    {
        var score = 1d;
        var searchable = $"{essence.Name} {essence.Effect} {essence.Description}";
        if (ContainsAny(searchable, "damage", "projectile", "chain", "echo")) score += personality == RunAgentPersonality.Greedy ? 2.2 : 0.8;
        if (ContainsAny(searchable, "health", "barrier", "damage taken", "freeze")) score += personality is RunAgentPersonality.Casual or RunAgentPersonality.Kiter ? 2 : 0.5;
        return score;
    }).Id;

    public RunCheckpointActionId ChooseCheckpointAction(RunAgentObservation observation)
    {
        var mend = observation.CheckpointActions.FirstOrDefault(action => action.Id == RunCheckpointActionId.MendWounds && action.Enabled);
        if (mend is not null && observation.HealthRatio < MendThreshold()) return RunCheckpointActionId.MendWounds;

        var canDescend = observation.CheckpointActions.Any(action => action.Id == RunCheckpointActionId.Descend && action.Enabled);
        if (!canDescend) return RunCheckpointActionId.LeaveRealm;

        return personality switch
        {
            RunAgentPersonality.Casual => observation.Depth == 1 && observation.SecuredEssenceCount > 0 ? RunCheckpointActionId.LeaveRealm : RunCheckpointActionId.Descend,
            RunAgentPersonality.Kiter => observation.Depth < 3 && observation.HealthRatio >= 0.55 ? RunCheckpointActionId.Descend : RunCheckpointActionId.LeaveRealm,
            RunAgentPersonality.Greedy => observation.HealthRatio >= 0.22 ? RunCheckpointActionId.Descend : RunCheckpointActionId.LeaveRealm,
            _ => observation.Depth < 3 && observation.HealthRatio >= 0.42 ? RunCheckpointActionId.Descend : RunCheckpointActionId.LeaveRealm,
        };
    }

    private double RoleScore(LevelChoiceDraftRole role) => personality switch
    {
        RunAgentPersonality.Casual => role switch { LevelChoiceDraftRole.Converge => 3.2, LevelChoiceDraftRole.Reinforce => 2.8, _ => 1 },
        RunAgentPersonality.Kiter => role switch { LevelChoiceDraftRole.Converge => 3, LevelChoiceDraftRole.Reinforce => 3, _ => 1.1 },
        RunAgentPersonality.Greedy => role switch { LevelChoiceDraftRole.Venture => 3.6, LevelChoiceDraftRole.Converge => 3.1, _ => 1.7 },
        _ => role switch { LevelChoiceDraftRole.Converge => 4, LevelChoiceDraftRole.Reinforce => 3.3, _ => 0.8 },
    };

    private static double RarityScore(RewardRarity rarity) => rarity switch
    {
        RewardRarity.Legendary => 2.4,
        RewardRarity.Rare => 1.3,
        RewardRarity.Uncommon => 0.5,
        _ => 0,
    };

    private double MendThreshold() => personality switch
    {
        RunAgentPersonality.Greedy => 0.35,
        RunAgentPersonality.Kiter => 0.82,
        RunAgentPersonality.Casual => 0.72,
        _ => 0.65,
    };

    private static Vector2D CalculateAvoidance(Simulation.Snapshots.RunRenderSnapshot snapshot, Vector2D player)
    {
        var result = Vector2D.Zero;

        foreach (var enemy in snapshot.Enemies)
        {
            var position = new Vector2D(enemy.X, enemy.Y);
            var distance = Math.Max(1, Vector2D.Distance(player, position));
            if (distance > 210) continue;
            var strength = (210 - distance) / 210;
            result += Vector2D.DirectionTo(position, player) * strength;
        }

        if (snapshot.Dragon is { } dragon)
        {
            var position = new Vector2D(dragon.X, dragon.Y);
            var distance = Math.Max(1, Vector2D.Distance(player, position));
            if (distance < 300) result += Vector2D.DirectionTo(position, player) * ((300 - distance) / 180);
        }

        foreach (var hazard in snapshot.HuntHazards ?? [])
        {
            var position = new Vector2D(hazard.X, hazard.Y);
            var distance = Math.Max(1, Vector2D.Distance(player, position));
            var dangerRadius = hazard.Radius + 70;
            if (distance > dangerRadius) continue;
            result += Vector2D.DirectionTo(position, player) * ((dangerRadius - distance) / Math.Max(1, hazard.Radius));
        }

        return result;
    }

    private static Vector2D CalculatePickupAttraction(Simulation.Snapshots.RunRenderSnapshot snapshot, Vector2D player)
    {
        var nearest = snapshot.ExperienceShards?
            .OrderBy(shard => Vector2D.Distance(player, new Vector2D(shard.X, shard.Y)))
            .FirstOrDefault();
        return nearest is null ? Vector2D.Zero : Vector2D.DirectionTo(player, new Vector2D(nearest.X, nearest.Y));
    }

    private T PickBest<T>(IReadOnlyList<T> candidates, Func<T, double> score)
    {
        if (candidates.Count == 0) throw new InvalidOperationException("Agent cannot choose from an empty candidate set.");
        return candidates
            .Select(candidate => (Candidate: candidate, Score: score(candidate) + random.NextDouble() * 0.05))
            .OrderByDescending(item => item.Score)
            .First().Candidate;
    }

    private static bool ContainsAny(string value, params string[] terms) => terms.Any(term => value.Contains(term, StringComparison.OrdinalIgnoreCase));
    private static MovementInput ToInput(Vector2D direction) => new(direction.X, direction.Y);
}
