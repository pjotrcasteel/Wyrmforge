using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Combat.Projectiles;

public sealed class ProjectileState(Vector2D position, Vector2D velocity, double radius, double damage, SpellId spell, ProjectileEffects effects)
{
    public Vector2D Position { get; set; } = position;
    public Vector2D Velocity { get; } = velocity;
    public double Radius { get; } = radius;
    public double Damage { get; } = damage;
    public SpellId Spell { get; } = spell;
    public bool Inferno => effects.Inferno;
    public int ChainsLeft => effects.ChainsLeft;
    public double SplashRadius => effects.SplashRadius;
    public ProjectileStatusEffect? Status => effects.Status;
    public double FrostNovaRadius => effects.FrostNovaRadius;
    public int PiercesRemaining { get; private set; } = effects.Pierces;
    public int IgnoredTargetId { get; private set; }

    public bool ContinueAfterHit(int targetId)
    {
        if (PiercesRemaining <= 0) return false;
        PiercesRemaining--;
        IgnoredTargetId = targetId;
        return true;
    }
}
