using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Stats;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double PlayerDamageBufferSeconds = 0.35;
    private double playerDamageGuardRemaining;
    private double pendingPlayerDamage;

    private void BeginPlayerDamageFrame(double delta)
    {
        playerDamageGuardRemaining = Math.Max(0, playerDamageGuardRemaining - delta);
        if (playerDamageGuardRemaining < 1e-9) playerDamageGuardRemaining = 0;
        pendingPlayerDamage = 0;
    }

    // Contact becomes periodic hits at its existing damage-per-second rate, rather than tiny hits followed by immunity.
    private void DamagePlayerContact(double damagePerSecond) => DamagePlayer(damagePerSecond * PlayerDamageBufferSeconds);

    // Resolve the strongest simultaneous source once; source iteration order cannot hide a heavy attack behind contact damage.
    private void DamagePlayer(double rawDamage) => pendingPlayerDamage = Math.Max(pendingPlayerDamage, rawDamage);

    private void ResolvePlayerDamage()
    {
        var rawDamage = pendingPlayerDamage;
        pendingPlayerDamage = 0;
        if (rawDamage <= 0 || playerDamageGuardRemaining > 0 || developmentInvulnerable) return;
        if (passiveProfile.WinterShell && player.WinterShellGuardRemaining > 0) return;

        if (passiveProfile.WinterShell && player.Barrier)
        {
            player.Barrier = false;
            player.WinterShellGuardRemaining = PassiveEffectResolver.WinterShellGuardSeconds;
            player.WinterShellRechargeRemaining = PassiveEffectResolver.WinterShellRechargeSeconds;
            return;
        }

        rawDamage = ApplyChargedScale(rawDamage);
        var encounterDamage = rawDamage * passiveProfile.DamageTakenMultiplier * encounterModifiers.DamageTakenMultiplier;
        encounterDamage = PassiveEffectResolver.ApplyIceArmor(passiveProfile, player.Barrier, encounterDamage);
        var damage = buildModifiers.Apply(BuildStatId.DamageTaken, encounterDamage);
        if (damage <= 0) return;
        player.Health = Math.Max(0, player.Health - damage);
        playerDamageGuardRemaining = PlayerDamageBufferSeconds;

        if (!passiveProfile.IceArmor || passiveProfile.WinterShell || player.Barrier) return;
        player.Barrier = true;
        player.BarrierRemaining = PassiveEffectResolver.IceArmorDurationSeconds;
    }
}
