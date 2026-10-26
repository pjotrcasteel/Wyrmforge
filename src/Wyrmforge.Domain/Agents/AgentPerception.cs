using System.Collections.Immutable;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Agents;

public sealed record AgentSensingProfile(double VisionRange, double HearingRange, long MemoryTicks, int SampleIntervalTicks = 6,
    double MinimumFacingDot = -1)
{
    public void Validate()
    {
        if (!double.IsFinite(VisionRange) || VisionRange < 0 || !double.IsFinite(HearingRange) || HearingRange < 0
            || MemoryTicks < 1 || SampleIntervalTicks < 1 || !double.IsFinite(MinimumFacingDot) || MinimumFacingDot is < -1 or > 1)
            throw new ArgumentOutOfRangeException(nameof(VisionRange), "Invalid sensing profile.");
    }
}

public enum AgentStimulusKind { Sound, Threat }
/// <summary>Authoritative event location at emission, never a live entity reference.</summary>
public sealed record AgentStimulus(long Id, long Tick, Vector2D Position, double Radius, AgentStimulusKind Kind);
public sealed record AgentContact(Vector2D Position, Vector2D ObservedHeading, long ObservedTick, string Source);
public sealed record AgentPerceptionSnapshot(long Tick, long NextSampleTick, AgentContact? Contact, long LastEventId, bool Visible);

/// <summary>Shared per-frame admission budget. Call agents in stable identity order; denied queries never reveal a target.</summary>
public sealed class AgentQueryBudget(int capacity)
{
    public int Remaining { get; private set; } = capacity >= 0 ? capacity : throw new ArgumentOutOfRangeException(nameof(capacity));
    public bool TrySpend()
    {
        if (Remaining == 0) return false;
        Remaining--;
        return true;
    }
}

/// <summary>Single tracked target plus bounded event investigation. Pure C#; only the sensing boundary sees world truth.</summary>
public sealed class AgentPerception
{
    public const int EventLimit = 16;
    private readonly AgentSensingProfile profile;
    private readonly int offset;
    private AgentPerceptionSnapshot state = new(0, 0, null, -1, false);

    public AgentPerception(AgentSensingProfile profile, int seed, int agentId)
    {
        profile.Validate();
        this.profile = profile;
        offset = AgentSchedule.Offset(seed, agentId, profile.SampleIntervalTicks);
    }

    public AgentPerceptionSnapshot Inspect() => state;

    public AgentPerceptionSnapshot Observe(long tick, Vector2D observer, Vector2D facing, Vector2D candidate,
        Func<Vector2D, Vector2D, bool> hasLineOfSight, AgentQueryBudget budget, ImmutableArray<AgentStimulus> events)
    {
        if (tick <= state.Tick) throw new ArgumentOutOfRangeException(nameof(tick));
        if (events.IsDefault || events.Length > EventLimit || events.Any(e => e.Tick < 0 || e.Tick > tick
                || e.Id < 0 || !double.IsFinite(e.Radius) || e.Radius < 0 || !Enum.IsDefined(e.Kind)))
            throw new ArgumentException("Events must be bounded, valid and no newer than the sensing tick.", nameof(events));
        ValidatePosition(observer); ValidatePosition(facing); ValidatePosition(candidate);
        foreach (var stimulus in events) ValidatePosition(stimulus.Position);
        var previous = state;
        var contact = previous.Contact is { } old && tick - old.ObservedTick < profile.MemoryTicks ? old : null;
        var lastEventId = previous.LastEventId;
        foreach (var stimulus in events.OrderBy(e => e.Id))
        {
            if (stimulus.Id <= lastEventId) continue;
            lastEventId = stimulus.Id;
            if (tick - stimulus.Tick >= profile.MemoryTicks || contact is not null && stimulus.Tick < contact.ObservedTick) continue;
            if (Vector2D.Distance(observer, stimulus.Position) > Math.Min(profile.HearingRange, stimulus.Radius)) continue;
            contact = new(stimulus.Position, Vector2D.Zero, stimulus.Tick, stimulus.Kind == AgentStimulusKind.Sound ? "hearing" : "threat-event");
        }
        var visible = false;
        var next = previous.NextSampleTick;
        if (tick >= next)
        {
            next = tick + 1;
            next += (offset - next % profile.SampleIntervalTicks + profile.SampleIntervalTicks) % profile.SampleIntervalTicks;
            var inVision = InVision(observer, facing, candidate);
            var admitted = inVision && budget.TrySpend();
            if (inVision && !admitted) next = tick + 1;
            if (admitted && hasLineOfSight(observer, candidate))
            {
                visible = true;
                // A gap in confirmed sight must not turn hidden displacement into observed motion.
                var heading = previous.Contact is { Source: "vision" } seen && seen.ObservedTick == previous.Tick && previous.Visible
                    ? Vector2D.DirectionTo(seen.Position, candidate) : Vector2D.Zero;
                contact = new(candidate, heading, tick, "vision");
            }
        }
        state = new(tick, next, contact, lastEventId, visible);
        return state;
    }

    /// <summary>Restore with the same sensing profile, seed and identity as the original sensor.</summary>
    public void Restore(AgentPerceptionSnapshot snapshot)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        if (snapshot.Tick < 0 || snapshot.NextSampleTick < 0 || snapshot.LastEventId < -1
            || snapshot.Contact is { } contact && (contact.ObservedTick < 0 || contact.ObservedTick > snapshot.Tick
                || snapshot.Tick - contact.ObservedTick >= profile.MemoryTicks
                || contact.Source is not ("vision" or "hearing" or "threat-event"))
            || snapshot.Visible && (snapshot.Contact?.Source != "vision" || snapshot.Contact.ObservedTick != snapshot.Tick))
            throw new ArgumentException("Invalid sensing replay state.", nameof(snapshot));
        if (snapshot.Contact is { } known) { ValidatePosition(known.Position); ValidatePosition(known.ObservedHeading); }
        state = snapshot;
    }

    private bool InVision(Vector2D observer, Vector2D facing, Vector2D candidate)
    {
        if (Vector2D.Distance(observer, candidate) > profile.VisionRange) return false;
        if (profile.MinimumFacingDot <= -1) return true;
        if (facing == Vector2D.Zero) return false;
        var direction = Vector2D.DirectionTo(observer, candidate);
        var heading = facing.Normalized();
        return direction == Vector2D.Zero || direction.X * heading.X + direction.Y * heading.Y >= profile.MinimumFacingDot;
    }

    private static void ValidatePosition(Vector2D value)
    {
        if (!double.IsFinite(value.X) || !double.IsFinite(value.Y)) throw new ArgumentException("Sensing positions must be finite.");
    }
}
