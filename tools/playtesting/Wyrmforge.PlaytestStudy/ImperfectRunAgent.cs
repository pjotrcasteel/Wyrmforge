using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.PlaytestStudy;

// Hypothetical sensitivity profiles, deliberately not claimed to represent a human population.
internal sealed class ImperfectRunAgent : IRunAgent
{
    private readonly HeuristicRunAgent inner;
    private readonly Random random;
    private readonly StudyProfile profile;
    private readonly StudyArena arena;
    private readonly int reactionTicks;
    private MovementInput heldMovement;
    private int ticks;
    private int outwardWallTicks;

    public ImperfectRunAgent(StudyProfile profile, StudyArena arena, int seed, SpellSchool school)
    {
        this.profile = profile;
        this.arena = arena;
        inner = new HeuristicRunAgent(RunAgentPersonality.Casual, seed, school);
        random = new Random(unchecked(seed * 397 ^ 0x5eeda11));
        reactionTicks = Math.Max(1, (int)Math.Ceiling(profile.ReactionSeconds / 0.05));
    }

    public string Name => profile.Name;
    public double OutwardWallInputRate => ticks == 0 ? 0 : outwardWallTicks / (double)ticks;

    public MovementInput ChooseMovement(RunAgentObservation observation)
    {
        if (ticks % reactionTicks == 0)
        {
            var snapshot = observation.Snapshot;
            var perceived = snapshot with
            {
                HuntHazards = random.NextDouble() < profile.HazardMissChance ? [] : snapshot.HuntHazards,
                ExperienceShards = random.NextDouble() < profile.PickupMissChance ? [] : snapshot.ExperienceShards,
            };
            var movement = inner.ChooseMovement(observation with { Snapshot = perceived });
            var direction = movement.Direction;
            if (profile.AvoidEdges && snapshot.Extraction is null) direction = SteerFromEdges(direction, snapshot.Player.X, snapshot.Player.Y);
            var angle = (random.NextDouble() * 2 - 1) * profile.DirectionErrorDegrees * Math.PI / 180;
            direction = Vector2D.Rotate(direction, angle);
            if (random.NextDouble() < profile.IdleChance) direction = Vector2D.Zero;
            heldMovement = new MovementInput(direction.X, direction.Y);
        }
        ticks++;
        var player = observation.Snapshot.Player;
        if (player.X <= player.Radius + 1 && heldMovement.X < 0 || player.X >= arena.Width - player.Radius - 1 && heldMovement.X > 0
            || player.Y <= player.Radius + 1 && heldMovement.Y < 0 || player.Y >= arena.Height - player.Radius - 1 && heldMovement.Y > 0) outwardWallTicks++;
        return heldMovement;
    }

    public string ChooseMapNode(RunAgentObservation observation) => Mistake() ? Pick(observation.AvailableMapNodes).Id : inner.ChooseMapNode(observation);
    public LevelChoice ChooseLevelChoice(RunAgentObservation observation) => Mistake() ? Pick(observation.LevelChoices) : inner.ChooseLevelChoice(observation);
    public RelicId ChooseRelic(RunAgentObservation observation) => Mistake() ? Pick(observation.RelicChoices).Id : inner.ChooseRelic(observation);
    public DragonEssenceId ChooseEssence(RunAgentObservation observation) => Mistake() ? Pick(observation.EssenceChoices).Id : inner.ChooseEssence(observation);

    // Keep the banking/descending policy identical in every profile to isolate sensitivity to combat and reward errors.
    public RunCheckpointActionId ChooseCheckpointAction(RunAgentObservation observation) => inner.ChooseCheckpointAction(observation);

    private bool Mistake() => random.NextDouble() < profile.ChoiceMistakeChance;
    private T Pick<T>(IReadOnlyList<T> values) => values[random.Next(values.Count)];

    private Vector2D SteerFromEdges(Vector2D direction, double x, double y)
    {
        const double margin = 65;
        var repulsion = new Vector2D(
            Math.Max(0, (margin - x) / margin) - Math.Max(0, (x - arena.Width + margin) / margin),
            Math.Max(0, (margin - y) / margin) - Math.Max(0, (y - arena.Height + margin) / margin));
        return (direction + repulsion * 2.5).Normalized();
    }
}
