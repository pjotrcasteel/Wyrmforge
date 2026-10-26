using System.Collections.Immutable;
using System.Globalization;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Phase-local utility adapter. It cannot start, interrupt or advance the authored executor.</summary>
internal sealed class AshfangAgent
{
    private sealed class Policy : IAgentPolicy
    {
        public ImmutableArray<AgentAlternative> Alternatives { get; set; } = [];
        public ImmutableArray<AgentAlternative> Evaluate(AgentContext context) => Alternatives;
    }
    private readonly Policy policy = new();
    public AgentRuntime Runtime { get; }
    public AgentPerception Perception { get; }
    public EncounterAdaptation Adaptation { get; } = new();
    public AshfangAgent(int seed)
    {
        Runtime = new(new(1, "Ashfang", "wyrm"), seed, policy, 6);
        Perception = new(new(640, 0, 120, 6), seed, 1);
    }
    public void Tick(double delta, DragonState dragon, AshfangBehaviorState behavior, string flight,
        Vector2D player, Func<Vector2D, Vector2D, bool> sight, Func<Vector2D, bool> clearPath)
    {
        var tick = Runtime.Inspect().Tick + 1;
        var sensed = Perception.Observe(tick, dragon.Position, Vector2D.Zero, player, sight, new(1), []);
        Adaptation.Observe(delta, dragon.Position, sensed.Visible ? sensed.Contact?.Position : null);
        var distance = sensed.Contact is { } contact ? Vector2D.Distance(dragon.Position, contact.Position) : double.PositiveInfinity;
        policy.Alternatives = behavior.Alternatives(distance, sensed.Contact is { } knownTarget && clearPath(knownTarget.Position) && sensed.Visible, dragon.Phase,
            Adaptation.Inspect().Counter, Adaptation.Inspect().Confidence);
        if (behavior.Committed || flight != "ground" || dragon.AttackCooldown > 0)
            policy.Alternatives = [new("commitment", "hold", 1, true, "authored-phase-telegraph-cooldown-lock")];
        Runtime.Step([
            new("phase", dragon.Phase.ToString(CultureInfo.InvariantCulture), tick, "authored-boss-phase"),
            new("executor", behavior.Phase, tick, "authored-attack-lock"),
            new("flight", flight, tick, "authored-flight-lock"),
            new("target", sensed.Contact is { } known ? FormattableString.Invariant($"{known.Position.X:R},{known.Position.Y:R}") : "unknown",
                sensed.Contact?.ObservedTick ?? tick, sensed.Contact?.Source ?? "undetected"),
            new("target-visible", sensed.Visible.ToString(), tick, "sensing-gate"),
            new("adaptation", Adaptation.Inspect().Counter, tick, "bounded-encounter-evidence"),
            new("confidence", Adaptation.Inspect().Confidence.ToString("R", CultureInfo.InvariantCulture), tick, "decaying-confirmed-observation")]);
    }
    public string Choose()
    {
        var action = Runtime.Inspect().CurrentAction?.Action;
        // A scheduled decision cannot bypass this frame's range/phase eligibility.
        return action is not null && policy.Alternatives.Any(a => a.Action == action && a.Allowed && a.Score > 0)
            && action != "hold" ? action : "approach";
    }
}
