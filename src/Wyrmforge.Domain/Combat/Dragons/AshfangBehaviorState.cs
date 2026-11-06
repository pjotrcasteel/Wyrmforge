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
    /// <summary>Which way the tail comes round next; alternates so the hunter has to read the wind-up, not the order.</summary>
    private int tailSwings;
    /// <summary>Breath sweep: +1 swings the beam clockwise across the arc, -1 the other way.</summary>
    public int SweepSign { get; private set; } = 1;
    public const double SweepHalfSpanRadians = 1.0;
    public const double TailMaximumDistance = 125;
    public string NextTail => tailSwings % 2 == 0 ? "tail_left" : "tail_right";
    public bool IsMelee => Action is "claw_right" or "claw_combo" or "bite" or "tail_left" or "tail_right";
    public bool IsBreath => Action is "breath" or "breath_sweep";

    /// <summary>The beam's heading: fixed for a breath, swinging across the arc for a sweep while it is out.</summary>
    public Vector2D BeamDirection => Action != "breath_sweep" ? Direction : Rotate(Direction, SweepSign * SweepHalfSpanRadians * (Phase == "windup" ? -1 : Phase == "strike" ? Progress * 2 - 1 : 1));

    private double Weight(string action, double distance, bool clearPath, int phase) => action switch
    {
        "claw_right" => clearPath && distance < 145 ? (1.8 - Math.Min(distance, 640) / 400) * (phase == 2 ? .7 : 1) : 0,
        "claw_combo" => clearPath && distance < 150 ? (phase == 2 ? 1.9 : .9) - Math.Min(distance, 640) / 500 : 0,
        "bite" => clearPath && distance < 175 ? 1.6 - Math.Min(distance, 640) / 500 : 0,
        // Clinging to its legs is punished: after two close commitments the tail comes round, wide and fast.
        "tail_left" or "tail_right" => clearPath && distance < TailMaximumDistance && CloseCommitments >= 2 ? 3 : 0,
        "pounce" => clearPath && distance is > 220 and < 390 ? phase == 2 ? 1.4 : 1.15 : 0,
        "breath" => clearPath && distance < 340 ? CloseCommitments >= 2 && distance > 75 ? 2.1 : .8 + distance / 700 : 0,
        "breath_sweep" => phase == 2 && clearPath && distance is > 110 and < 340 ? 1.7 : 0,
        _ => 0,
    };
    private double Repeat(string action) => LastAction == action || action.StartsWith("tail", StringComparison.Ordinal) && LastAction.StartsWith("tail", StringComparison.Ordinal) ? .45 : 1;

    public string Decide(double distance, bool clearPath, int phase)
    {
        var tail = NextTail;
        return CreatureDecisions.Choose(
            new("claw_right", Weight("claw_right", distance, clearPath, phase) * Repeat("claw_right")),
            new("claw_combo", Weight("claw_combo", distance, clearPath, phase) * Repeat("claw_combo")),
            new("bite", Weight("bite", distance, clearPath, phase) * Repeat("bite")),
            new(tail, Weight(tail, distance, clearPath, phase) * Repeat(tail)),
            new("pounce", Weight("pounce", distance, clearPath, phase) * Repeat("pounce")),
            new("breath", Weight("breath", distance, clearPath, phase) * Repeat("breath")),
            new("breath_sweep", Weight("breath_sweep", distance, clearPath, phase) * Repeat("breath_sweep")));
    }
    public ImmutableArray<AgentAlternative> Alternatives(double distance, bool clearPath, int phase, string counter, double confidence)
    {
        var bias = Math.Clamp(confidence, 0, 1) * .25;
        var validPhase = phase is 1 or 2;
        var tail = NextTail;
        AgentAlternative Option(string intent, string action, string reason, double extra = 0)
        {
            var weight = Weight(action, distance, clearPath, phase);
            return new(intent, action, (weight + (weight > 0 ? extra : 0)) * Repeat(action), validPhase && weight > 0, reason);
        }
        return [
            Option("close-pressure", "claw_right", "authored-claw-range"),
            Option("close-pressure", "claw_combo", "authored-claw-combo-range"),
            Option("close-pressure", "bite", "authored-bite-range"),
            Option("punish-clinging", tail, "authored-tail-range"),
            Option("close-distance", "pounce", "authored-phase-and-pounce-range", counter == "close-distance" ? bias : 0),
            Option("range-pressure", "breath", "authored-breath-range", counter == "hold-space" ? bias : 0),
            Option("range-pressure", "breath_sweep", "authored-enraged-sweep-range", counter == "hold-space" ? bias : 0),
            new("pursue", "approach", .1, true, "approach-last-confirmed-location")
        ];
    }
    public void Begin(string action, Vector2D origin, Vector2D target, double breathWindup)
    {
        CloseCommitments = action is "claw_right" or "claw_combo" or "bite" ? CloseCommitments + 1 : 0;
        if (action.StartsWith("tail", StringComparison.Ordinal)) tailSwings++;
        if (action == "breath_sweep") SweepSign = SweepSign == 1 ? -1 : 1;
        Action = action; LastAction = action; Origin = origin; Target = target; Direction = Vector2D.DirectionTo(origin, target);
        Range = action switch { "claw_right" => 155, "claw_combo" => 165, "bite" => 180, "pounce" => 390, "tail_left" or "tail_right" => 150, "breath_sweep" => 360, _ => 340 };
        HalfAngle = action switch { "claw_right" => .85, "claw_combo" => .9, "bite" => .3, "tail_left" or "tail_right" => 1.45, "breath_sweep" => .3, _ => .4 };
        Enter("windup", action is "breath" or "breath_sweep" ? Math.Max(action == "breath" ? .95 : 1.1, breathWindup) : action == "pounce" ? .9
            : action.StartsWith("tail", StringComparison.Ordinal) ? .55 : action == "claw_combo" ? .65 : .7);
    }    public bool Tick(double delta)
    {
        if (!Committed || delta <= 0) return false;
        Remaining = Math.Max(0, Remaining - delta);return Remaining <= 0;
    }
    public void Strike() => Enter("strike", Action switch { "pounce" => .45, "breath" => .95, "breath_sweep" => 1.5, "claw_combo" => .6, "tail_left" or "tail_right" => .25, _ => .18 });
    public void Recover() => Enter("recover", Action switch { "pounce" => .8, "breath_sweep" => 1.0, "claw_combo" => .75, "tail_left" or "tail_right" => .7, _ => .65 });
    /// <summary>A heavy enough burst in the middle of a wind-up breaks it: the beast reels, exposed, for a while.</summary>
    public const double StaggerSeconds = 1.2;
    public void Stagger() { Action = "stagger"; Enter("recover", StaggerSeconds); }
    public void Finish() { Phase = "ready"; Action = "idle"; Remaining = 0; }
    public void Reset() { Finish(); LastAction = ""; CloseCommitments = 0; }
    public void Interrupt() { Finish(); }
    private void Enter(string phase, double duration) { Phase = phase; Duration = duration; Remaining = duration; }
    private static Vector2D Rotate(Vector2D v, double radians) => new(v.X * Math.Cos(radians) - v.Y * Math.Sin(radians), v.X * Math.Sin(radians) + v.Y * Math.Cos(radians));
}
