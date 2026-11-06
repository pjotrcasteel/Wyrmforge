using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    /// <summary>A boss changing form cannot be hurt: the cracking bell, the shifting rite and the rimed bell are all untouchable until they finish.</summary>
    private static bool IsTransforming(EnemyState enemy) => enemy is { BellWarden.Phase: BellWardenPhase.Crack } or { WinterBell.Phase: BellOfWinterPhase.Rime }
        or { Reliquary.Phase: ReliquaryPhase.Shift } or { GlassReliquary.Phase: ReliquaryPhase.Shift };

    /// <summary>
    /// The moment a boss breaks open: the ground splits around it in real terrain, a crater is dug under it and a shockwave rolls out.
    /// The ring only hurts at its front, so standing close is safe; its job is to move the hunter and to be seen.
    /// </summary>
    private void TransformationBurst(Vector2D at, int power, int fissureReach, SpellId spell = SpellId.FireBolt)
    {
        RegisterElementalImpact(at, spell);
        EnemyTerrainBlast(at, power);
        ApplyTerrainFissure(at, fissureReach);
        bellShockwaves.Add(new BellShockwaveState(at));
    }

    private void BeginBellWardenCrack(EnemyState warden)
    {
        BellWardenCracks++;
        // Nothing half-swung lands during the change: the tolls already rolling out are swallowed.
        hostileProjectiles.RemoveAll(toll => toll.Style == HostileProjectileStyle.Toll);
        TransformationBurst(warden.Position, 4, 14);
    }
}
