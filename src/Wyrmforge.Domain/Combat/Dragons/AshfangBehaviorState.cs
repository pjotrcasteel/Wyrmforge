using System.Collections.Immutable;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Behaviors;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Dragons;

/// <summary>Reactive predator policy; chooses only between completed commitments, never retargets a warned strike.
/// Tuning is provisional. Damage and normal cadence remain the catalog attack's responsibility.</summary>
public sealed class AshfangBehaviorState
{
    public string Action { get; private set; } = "idle";
    public string Phase { get; private set; } = "ready";
    public int CloseCommitments { get; private set; }
    public string LastAction { get; private set; } = "";
    public double Remaining { get; private set; }
    public double Duration { get; private set; } = 1;
    public double Progress => 1 - Math.Clamp(Remaining / Duration, 0, 1);
    public Vector2D Origin { get; private set; }
    public Vector2D Target { get; private set; }
    public Vector2D Direction { get; private set; } = new(0, 1);
    public double Range { get; private set; }
    public double HalfAngle { get; private set; }
    public bool Committed => Phase is "windup" or "strike" or "recover";
    public string Decide(double distance, bool clearPath, int phase)
    {
        double Repeat(string action) => LastAction == action ? .45 : 1;
        return CreatureDecisions.Choose(
            new("claw_right", clearPath && distance < 145 ? (1.8 - Math.Min(distance, 640) / 400) * Repeat("claw_right") : 0),
            new("bite", clearPath && distance < 175 ? (1.6 - Math.Min(distance, 640) / 500) * Repeat("bite") : 0),
            new("pounce", clearPath && distance is > 220 and < 390 ? (phase == 2 ? 1.4 : 1.15) * Repeat("pounce") : 0),
            new("breath", clearPath && distance < 340 ? (CloseCommitments >= 2 && distance > 75 ? 2.1 : .8 + distance / 700) * Repeat("breath") : 0));
    }
    public ImmutableArray<AgentAlternative> Alternatives(double distance, bool clearPath, int phase, string counter, double confidence)
    {
        double Repeat(string action) => LastAction == action ? .45 : 1;
        var bias = Math.Clamp(confidence, 0, 1) * .25;
        var validPhase = phase is 1 or 2;
        return [
            new("close-pressure", "claw_right", (1.8 - Math.Min(distance, 640) / 400) * Repeat("claw_right"), validPhase && clearPath && distance < 145, "authored-claw-range"),
            new("close-pressure", "bite", (1.6 - Math.Min(distance, 640) / 500) * Repeat("bite"), validPhase && clearPath && distance < 175, "authored-bite-range"),
            new("close-distance", "pounce", ((phase == 2 ? 1.4 : 1.15) + (counter == "close-distance" ? bias : 0)) * Repeat("pounce"),
                validPhase && clearPath && distance is > 220 and < 390, "authored-phase-and-pounce-range"),
            new("range-pressure", "breath", (CloseCommitments >= 2 && distance > 75 ? 2.1 : .8 + Math.Min(distance, 640) / 700)
                * Repeat("breath") + (counter == "hold-space" ? bias : 0), validPhase && clearPath && distance < 340, "authored-breath-range"),
            new("pursue", "approach", .1, true, "approach-last-confirmed-location")
        ];
    }
    public void Begin(string action, Vector2D origin, Vector2D target, double breathWindup)
    {
        CloseCommitments = action is "claw_right" or "bite" ? CloseCommitments + 1 : 0;
        Action = action; LastAction = action; Origin = origin; Target = target; Direction = Vector2D.DirectionTo(origin, target);
        Range = action switch { "claw_right" => 155, "bite" => 180, "pounce" => 390, _ => 340 };
        HalfAngle = action switch { "claw_right" => .85, "bite" => .3, _ => .4 };
        Enter("windup", action == "breath" ? Math.Max(.95, breathWindup) : action == "pounce" ? .9 : .7);
    }
    public bool Tick(double delta)
    {
        if (!Committed || delta <= 0) return false;
        Remaining = Math.Max(0, Remaining - delta);return Remaining <= 0;
    }
    public void Strike() => Enter("strike", Action == "pounce" ? .45 : Action == "breath" ? .95 : .18);
    public void Recover() => Enter("recover", Action == "pounce" ? .8 : .65);
    public void Finish() { Phase = "ready"; Action = "idle"; Remaining = 0; }
    public void Reset() { Finish(); LastAction = ""; CloseCommitments = 0; }
    public void Interrupt() { Finish(); }
    private void Enter(string phase, double duration) { Phase = phase; Duration = duration; Remaining = duration; }
}

