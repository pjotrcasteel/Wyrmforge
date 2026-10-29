using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Uses current authoritative geometry on every admitted query, so opened gates and destroyed props invalidate no private AI map.</summary>
internal sealed class HuntAgentNavigation(ArenaEnvironmentState? environment, double width, double height) : IAgentNavigation
{
    public AgentPathResult Query(AgentPathRequest request, AgentQueryBudget budget)
    {
        request.Validate();
        if (Vector2D.Distance(request.Position, request.Destination) <= 1)
            return new(AgentPathStatus.Arrived, request.Position, "known-location-reached");
        if (!budget.TrySpend()) return new(AgentPathStatus.Deferred, request.Position, "path-budget-exhausted");
        var next = environment?.EnemyNavigationTarget(request.Position, request.Destination, width, height, request.Radius) ?? request.Destination;
        if (environment?.BlocksSegment(request.Position, next, width, height, request.Radius) == true)
            return new(AgentPathStatus.Blocked, request.Position, "no-clear-local-route-retry-next-admitted-query");
        return new(AgentPathStatus.Moving, next, "authoritative-hunt-navigation");
    }
}
