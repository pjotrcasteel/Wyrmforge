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

    public void Remove(ProjectileState projectile) => ids.Remove(projectile);
}
