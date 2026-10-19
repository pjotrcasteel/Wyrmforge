using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    /// <summary>
    /// Reproducible visual acceptance only. This is a real hit routed through the
    /// canonical damage/death pipeline, not a presentation-side invented event.
    /// Normal runs can never use this development-only entry point.
    /// </summary>
    public bool ApplyDevelopmentArtHit(EnemyKind kind, bool lethal = false)
    {
        if (!developmentHunt || !developmentInvulnerable) return false;
        var target = enemies.FirstOrDefault(enemy => enemy.Kind == kind && enemy.Health > 0);
        if (target is null) return false;
        var damage = lethal ? target.Health + 1 : target.MaxHealth * 0.2;
        if (DamageTarget(target, damage)) enemies.Remove(target);
        return true;
    }

    internal void StartDevelopmentEnemy(DevelopmentEnemySetup setup)
    {
        setup.Validate();
        developmentHunt = true;
        developmentInvulnerable = true;
        arenaWidth = viewportWidth = setup.Width;
        arenaHeight = viewportHeight = setup.Height;
        EnsurePlayerPosition(setup.Width, setup.Height);
        ChoosePrimary(SpellId.FireBolt);
        if (!setup.Casting)
            foreach (var spell in spellCooldowns.Keys) spellCooldowns[spell] = double.PositiveInfinity;
        var spot = new Vector2D(setup.Width * .55, setup.Height * .32);
        switch (setup.Kind)
        {
            case EnemyKind.BellWarden:
            case EnemyKind.BellOfWinter:
                bellRoadKind = setup.Kind;
                bellWardenSpot = spot;
                BeginBellWardenFight();
                break;
            case EnemyKind.Reliquary:
            case EnemyKind.ReliquaryWard:
            case EnemyKind.ReliquaryOfGlass:
            case EnemyKind.CrystalWard:
            case EnemyKind.GlassFalseForm:
                reliquaryKind = setup.Kind is EnemyKind.Reliquary or EnemyKind.ReliquaryWard ? EnemyKind.Reliquary : EnemyKind.ReliquaryOfGlass;
                reliquarySigil = spot;
                BeginReliquaryDuel();
                if (setup.Kind == EnemyKind.ReliquaryWard) PlantWard(reliquary!);
                if (setup.Kind == EnemyKind.CrystalWard) RaiseCrystalWard(reliquary!);
                if (setup.Kind == EnemyKind.GlassFalseForm) CastRefractionVeil(reliquary!, reliquary!.GlassReliquary!);
                break;
            case EnemyKind.MirrorDouble:
                SpawnReflectionDouble(spot);
                break;
            default:
                var definition = EnemyCatalog.Get(setup.Kind);
                var (health, speed) = EnemyStats(definition);
                enemies.Add(new EnemyState(++enemyId, spot, definition.Radius, health, speed, setup.Kind));
                RecordEnemyEncounter(setup.Kind);
                break;
        }
    }
}
