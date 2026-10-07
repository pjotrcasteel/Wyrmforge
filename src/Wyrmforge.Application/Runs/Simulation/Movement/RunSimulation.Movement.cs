using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Stats;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void EnsurePlayerPosition(double width, double height)
    {
        if (playerPositionInitialized) return;
        player.Position = new Vector2D(width / 2, height / 2);
        playerPositionInitialized = true;
    }

    private void UpdatePlayer(double delta, MovementInput movement, double width, double height)
    {
        EnsurePlayerPosition(width, height);
        var direction = movement.Direction;
        var moveBonus = passiveProfile.TempestStep ? Math.Min(elapsed / 6, 1) * 0.25 : 0;
        var speed = buildModifiers.Apply(BuildStatId.MoveSpeed, player.Speed) * (1 + moveBonus) * encounterModifiers.PlayerMoveSpeedMultiplier;
        player.Position += direction * speed * delta;
        player.Position = new Vector2D(
            Math.Clamp(player.Position.X, player.Radius, Math.Max(player.Radius, width - player.Radius)),
            Math.Clamp(player.Position.Y, player.Radius, Math.Max(player.Radius, height - player.Radius)));

        UpdatePlayerBarriers(delta);
    }

    private void UpdatePlayerBarriers(double delta)
    {
        if (passiveProfile.WinterShell)
        {
            if (player.Barrier || player.WinterShellRechargeRemaining <= 0) return;
            player.WinterShellRechargeRemaining = Math.Max(0, player.WinterShellRechargeRemaining - delta);
            if (player.WinterShellRechargeRemaining == 0) player.Barrier = true;
            return;
        }

        if (!passiveProfile.IceArmor || !player.Barrier || player.BarrierRemaining <= 0) return;
        player.BarrierRemaining = Math.Max(0, player.BarrierRemaining - delta);
        if (player.BarrierRemaining == 0) player.Barrier = false;
    }
}
