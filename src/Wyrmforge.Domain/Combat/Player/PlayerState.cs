using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Player;

public sealed class PlayerState
{
    public Vector2D Position { get; set; } = Vector2D.Zero;

    public double Radius { get; } = 14;

    public double Health { get; set; } = 100;

    public double MaxHealth { get; set; } = 100;

    public double Speed { get; } = 190;

    public bool Barrier { get; set; }

    public double BarrierRemaining { get; set; }

    public double WinterShellRechargeRemaining { get; set; }
}
