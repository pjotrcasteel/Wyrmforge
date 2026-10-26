using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Agents;

public enum AgentPathStatus { Moving, Arrived, Blocked, Deferred }
public sealed record AgentPathRequest(Vector2D Position, Vector2D Destination, double Radius)
{
    public void Validate()
    {
        if (!double.IsFinite(Position.X) || !double.IsFinite(Position.Y) || !double.IsFinite(Destination.X)
            || !double.IsFinite(Destination.Y) || !double.IsFinite(Radius) || Radius < 0)
            throw new ArgumentException("Navigation requests require finite positions and nonnegative clearance.");
    }
}
public sealed record AgentPathResult(AgentPathStatus Status, Vector2D Waypoint, string Reason);

/// <summary>Queries consume known destinations only. Scene adapters own physical geometry and locomotion clearance.</summary>
public interface IAgentNavigation
{
    AgentPathResult Query(AgentPathRequest request, AgentQueryBudget budget);
}
