using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private long nextTerrainImpactId;

    /// <summary>Terrain columns changed in the latest tick, for presentation, audio and navigation consumers.</summary>
    public IReadOnlyList<ArenaTerrainChange> TerrainChangesThisTick => terrainChangesThisTick;
    private readonly List<ArenaTerrainChange> terrainChangesThisTick = [];

    // Every confirmed Fireball contact chips the ground; heavier Fireballs dig deeper.
    private void ApplyFireballTerrainImpact(Vector2D at, ProjectileState projectile)
    {
        if (arenaEnvironment?.Terrain is null || projectile.Spell != SpellId.FireBolt) return;
        var power = HasFireballMutation(FireballMutationId.MeteorHeart) ? 3 : projectile.SplashRadius > 0 ? 2 : 1;
        var changes = arenaEnvironment.ApplyTerrainImpact(new ArenaTerrainImpact(++nextTerrainImpactId, at, power),
            player.Position, player.Radius, arenaWidth, arenaHeight);
        terrainChangesThisTick.AddRange(changes);
    }
}
