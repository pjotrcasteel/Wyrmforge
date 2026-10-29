using Wyrmforge.Application.World;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Agents;

/// <summary>Adapter over existing Town spatial data. Does not migrate Town behavior or depend on the unapproved 3D rebuild.</summary>
public sealed class TownAgentNavigation(TownNavigationMap map) : IAgentNavigation
{
    public AgentPathResult Query(AgentPathRequest request, AgentQueryBudget budget)
    {
        request.Validate();
        if (request.Radius > map.FootRadius) return new(AgentPathStatus.Blocked, request.Position, "agent-exceeds-map-clearance");
        if (!budget.TrySpend()) return new(AgentPathStatus.Deferred, request.Position, "path-budget-exhausted");
        var from = new TownPoint((float)request.Position.X, (float)request.Position.Y);
        var goal = new TownPoint((float)request.Destination.X, (float)request.Destination.Y);
        if (!map.TryFindPath(from, goal, out var path))
            return new(AgentPathStatus.Blocked, request.Position, "town-path-unavailable-retry-after-spatial-change");
        if (Vector2D.Distance(request.Position, request.Destination) <= 1)
            return new(AgentPathStatus.Arrived, request.Position, "known-location-reached");
        var next = path.FirstOrDefault(p => Vector2D.Distance(request.Position, new(p.X, p.Y)) > 1, goal);
        return new(AgentPathStatus.Moving, new(next.X, next.Y), "authoritative-town-navigation");
    }
}
