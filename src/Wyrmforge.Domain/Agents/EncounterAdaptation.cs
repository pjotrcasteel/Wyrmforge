using Wyrmforge.Domain.Combat.Geometry;
namespace Wyrmforge.Domain.Agents;

public sealed record AdaptationSnapshot(double Clock, double NextSample, double Near, double Far, double Left, double Right,
    Vector2D? Previous, double Confidence, string Counter);

/// <summary>Bounded encounter-local evidence, sampled twice per second from confirmed sight; no input access.</summary>
public sealed class EncounterAdaptation
{
    private AdaptationSnapshot state = new(0, 0, 0, 0, 0, 0, null, 0, "none");
    public AdaptationSnapshot Inspect() => state;
    public void Observe(double delta, Vector2D origin, Vector2D? seenTarget)
    {
        if (!double.IsFinite(delta) || delta < 0) throw new ArgumentOutOfRangeException(nameof(delta));
        var clock = state.Clock + delta;
        var decay = Math.Exp(-delta / 8);
        state = state with { Clock = clock, Near = state.Near * decay, Far = state.Far * decay,
            Left = state.Left * decay, Right = state.Right * decay };
        if (seenTarget is null) state = state with { Previous = null };
        if (clock >= state.NextSample && seenTarget is { } target)
        {
            var distance = Vector2D.Distance(origin, target);
            var movement = state.Previous is { } previous ? target - previous : Vector2D.Zero;
            var radial = Vector2D.DirectionTo(origin, target);
            var cross = radial.X * movement.Y - radial.Y * movement.X;
            state = state with { NextSample = clock + .5, Previous = target,
                Near = Math.Min(16, state.Near + (distance < 160 ? 1 : 0)),
                Far = Math.Min(16, state.Far + (distance >= 160 ? 1 : 0)),
                Left = Math.Min(16, state.Left + (cross < -4 ? 1 : 0)),
                Right = Math.Min(16, state.Right + (cross > 4 ? 1 : 0)) };
        }
        var evidence = Math.Max(Math.Max(state.Near, state.Far), Math.Max(state.Left, state.Right));
        var confidence = Math.Clamp((evidence - 3) / 8, 0, 1);
        var counter = confidence < .35 ? "none" : state.Left > state.Right + 2 ? "circle-right"
            : state.Right > state.Left + 2 ? "circle-left" : state.Far > state.Near + 2 ? "close-distance" : "hold-space";
        state = state with { Confidence = confidence, Counter = counter };
    }
    public void Restore(AdaptationSnapshot snapshot)
    {
        if (!double.IsFinite(snapshot.Clock) || snapshot.Clock < 0 || !double.IsFinite(snapshot.NextSample) || snapshot.NextSample < 0
            || new[] { snapshot.Near, snapshot.Far, snapshot.Left, snapshot.Right }.Any(v => !double.IsFinite(v) || v < 0 || v > 16)
            || !double.IsFinite(snapshot.Confidence) || snapshot.Confidence < 0 || snapshot.Confidence > 1
            || snapshot.Previous is { } p && (!double.IsFinite(p.X) || !double.IsFinite(p.Y)))
            throw new ArgumentException("Invalid adaptation snapshot.", nameof(snapshot));
        state = snapshot;
    }
}
