using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Ember: a thrown arc. Grave, Echo, Seal, Ward and Toll: a zero-travel ground blast whose mark is its whole telegraph.</summary>
public enum HostileProjectileStyle
{
    Ember,
    Grave,
    Echo,
    Seal,
    Ward,
    Toll,
}

/// <summary>An arcing enemy projectile. It cannot hit anything in flight; it resolves once, at its marked landing spot.</summary>
internal sealed class HostileProjectileState(Vector2D origin, Vector2D target, double flightSeconds, double radius, double damage, double arcHeight)
{
    public Vector2D Origin { get; } = origin;

    public Vector2D Target { get; } = target;

    public double FlightSeconds { get; } = Math.Max(0.05, flightSeconds);

    public double Radius { get; } = radius;

    public double Damage { get; } = damage;

    public double ArcHeight { get; } = arcHeight;

    public HostileProjectileStyle Style { get; init; }

    public double Elapsed { get; private set; }

    public double Progress => Math.Clamp(Elapsed / FlightSeconds, 0, 1);

    public Vector2D Position => Origin + (Target - Origin) * Progress;

    public double Height => 4 * ArcHeight * Progress * (1 - Progress);

    public bool Landed => Elapsed >= FlightSeconds;

    public void Advance(double delta) => Elapsed += Math.Max(0, delta);
}
