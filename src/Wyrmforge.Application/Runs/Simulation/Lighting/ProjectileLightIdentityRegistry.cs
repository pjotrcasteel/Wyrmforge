using Wyrmforge.Domain.Combat.Projectiles;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

public sealed class ProjectileLightIdentityRegistry
{
    private readonly Dictionary<ProjectileState, long> ids = new(ReferenceEqualityComparer.Instance);
    private long nextId;

    public string GetId(ProjectileState projectile)
    {
        if (!ids.TryGetValue(projectile, out var id))
        {
            id = checked(++nextId);
            ids.Add(projectile, id);
        }
        return id.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }

    public void Retain(IEnumerable<ProjectileState> activeProjectiles)
    {
        var active = new HashSet<ProjectileState>(activeProjectiles, ReferenceEqualityComparer.Instance);
        foreach (var stale in ids.Keys.Where(projectile => !active.Contains(projectile)).ToArray())
            ids.Remove(stale);
    }

    public void Clear() => ids.Clear();

    public void Remove(ProjectileState projectile) => ids.Remove(projectile);
}
