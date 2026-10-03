using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Projectiles;

public sealed class ProjectileState(
    Vector2D position,
    Vector2D velocity,
    double radius,
    double damage,
    SpellId spell,
    bool inferno,
    int chainsLeft,
    double splashRadius,
    double freezeDuration)
{
    public Vector2D Position { get; set; } = position;

    public Vector2D Velocity { get; } = velocity;

    public double Radius { get; } = radius;

    public double Damage { get; } = damage;

    public SpellId Spell { get; } = spell;

    public bool Inferno { get; } = inferno;

    public int ChainsLeft { get; } = chainsLeft;

    public double SplashRadius { get; } = splashRadius;

    public double FreezeDuration { get; } = freezeDuration;
}
