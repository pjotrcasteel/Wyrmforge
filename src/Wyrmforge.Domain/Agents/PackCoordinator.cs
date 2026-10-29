using System.Collections.Immutable;
namespace Wyrmforge.Domain.Agents;

public sealed record PackMember(int Id, bool Eligible, bool Committed);
public sealed record PackLease(int Id, double Remaining);
public sealed record PackSnapshot(int LastGranted, ImmutableArray<PackLease> Leases);

/// <summary>Bounded pressure leases. Committed attacks retain their slot; release rotates admission fairly.</summary>
public sealed class PackCoordinator
{
    public const int MemberLimit = 256;
    public const int PressureLimit = 2;
    private PackSnapshot state = new(0, []);
    public PackSnapshot Inspect() => state;
    public bool HasSlot(int id) => state.Leases.Any(lease => lease.Id == id);
    public void Tick(double delta, IReadOnlyList<PackMember> members)
    {
        if (!double.IsFinite(delta) || delta < 0 || members.Count > MemberLimit || members.Select(m => m.Id).Distinct().Count() != members.Count)
            throw new ArgumentException("Pack inputs must be finite, bounded and uniquely identified.");
        var retained = state.Leases.Where(l => members.Any(m => m.Id == l.Id && (m.Committed || m.Eligible && l.Remaining > delta)))
            .Select(l => l with { Remaining = Math.Max(0, l.Remaining - delta) }).ToList();
        var last = state.LastGranted;
        foreach (var candidate in members.Where(m => m.Eligible && !m.Committed && retained.All(l => l.Id != m.Id))
            .OrderBy(m => m.Id <= state.LastGranted ? 1 : 0).ThenBy(m => m.Id))
        {
            if (retained.Count >= PressureLimit) break;
            retained.Add(new(candidate.Id, 4));
            last = candidate.Id;
        }
        state = new(last, retained.OrderBy(l => l.Id).ToImmutableArray());
    }
    public void Restore(PackSnapshot snapshot)
    {
        if (snapshot.Leases.IsDefault || snapshot.Leases.Length > PressureLimit
            || snapshot.Leases.Any(l => !double.IsFinite(l.Remaining) || l.Remaining < 0 || l.Remaining > 4)
            || snapshot.Leases.Select(l => l.Id).Distinct().Count() != snapshot.Leases.Length)
            throw new ArgumentException("Invalid pack snapshot.", nameof(snapshot));
        state = snapshot;
    }
}
