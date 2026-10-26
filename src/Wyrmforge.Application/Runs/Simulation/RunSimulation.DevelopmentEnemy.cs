using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    internal void StartDevelopmentEnemy(DevelopmentEnemySetup setup)
    {
        setup.Validate();
        agentFoundationEnabled = setup.AgentFoundation || setup.AgentPerception || setup.Intelligence is not null;
        agentTier = setup.Intelligence;
        agentPerceptionEnabled = setup.AgentPerception || setup.Intelligence is not null;
        agentFoundationSeed = setup.Seed;
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
                for (var i = 0; i < setup.Count; i++)
                {
                    var offset = setup.Count == 1 ? Vector2D.Zero : new Vector2D((i % 8 - 3.5) * 32, -(i / 8) * 32);
                    var position = spot + offset;
                    position = new(Math.Clamp(position.X, definition.Radius, setup.Width - definition.Radius),
                        Math.Clamp(position.Y, definition.Radius, setup.Height - definition.Radius));
                    enemies.Add(new EnemyState(++enemyId, position, definition.Radius, health, speed, setup.Kind));
                }
                RecordEnemyEncounter(setup.Kind);
                break;
        }
    }
}
