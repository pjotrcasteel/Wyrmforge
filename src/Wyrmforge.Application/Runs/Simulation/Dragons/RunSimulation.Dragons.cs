using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double DragonArrivalSeconds = 30;
    private const double DragonBreathRange = 340;
    private const double DragonBreathHalfAngle = 0.4;

    private void UpdateDragonEncounter(double delta, double width, double height)
    {
        if (!dragonEncounterStarted && elapsed >= DragonArrivalSeconds) SpawnDragon(width);
        if (dragon is not { Health: > 0 } activeDragon) return;

        activeDragon.FrozenFor = Math.Max(0, activeDragon.FrozenFor - delta);
        var timeScale = activeDragon.FrozenFor > 0 ? 0.45 : 1;
        var scaledDelta = delta * timeScale;

        if (activeDragon.IsTelegraphing)
        {
            activeDragon.TelegraphRemaining -= scaledDelta;
            if (activeDragon.TelegraphRemaining <= 0) ResolveDragonBreath(activeDragon);
        }
        else
        {
            activeDragon.AttackCooldown -= scaledDelta;
            if (activeDragon.AttackCooldown <= 0) StartDragonBreath(activeDragon);
            else MoveDragon(activeDragon, scaledDelta);
        }

        if (Vector2D.Distance(activeDragon.Position, player.Position) <= activeDragon.Radius + player.Radius) DamagePlayer(24 * delta);
    }

    private void SpawnDragon(double width)
    {
        dragonEncounterStarted = true;
        enemies.Clear();
        projectiles.Clear();
        lightning.Clear();
        var definition = DragonCatalog.Ashfang;
        dragon = new DragonState(++enemyId, definition, new Vector2D(width / 2, -definition.Radius - 18));
    }

    private void MoveDragon(DragonState activeDragon, double delta)
    {
        var distance = Vector2D.Distance(activeDragon.Position, player.Position);
        var direction = Vector2D.DirectionTo(activeDragon.Position, player.Position);
        var phaseSpeed = activeDragon.Speed * (activeDragon.Phase == 2 ? 1.25 : 1);
        if (distance > 190) activeDragon.Position += direction * phaseSpeed * delta;
        else if (distance < 120) activeDragon.Position -= direction * phaseSpeed * 0.65 * delta;
    }

    private void StartDragonBreath(DragonState activeDragon)
    {
        activeDragon.BreathDirection = Vector2D.DirectionTo(activeDragon.Position, player.Position);
        activeDragon.TelegraphRemaining = activeDragon.Phase == 2 ? 0.55 : 0.8;
    }

    private void ResolveDragonBreath(DragonState activeDragon)
    {
        activeDragon.TelegraphRemaining = 0;
        activeDragon.AttackCooldown = activeDragon.Phase == 2 ? 2.4 : 3.2;
        var offset = player.Position - activeDragon.Position;
        var distance = offset.Length;
        if (distance > DragonBreathRange || distance <= double.Epsilon) return;
        var playerDirection = offset.Normalized();
        var dot = (playerDirection.X * activeDragon.BreathDirection.X) + (playerDirection.Y * activeDragon.BreathDirection.Y);
        if (dot < Math.Cos(DragonBreathHalfAngle)) return;
        DamagePlayer(activeDragon.Phase == 2 ? 50 : 38);
    }

    private void DefeatDragon(DragonState defeatedDragon)
    {
        if (!ReferenceEquals(dragon, defeatedDragon)) return;
        dragonsSlain++;
        score += 2500 + (int)(elapsed * 10);
        GainExperience(5);
        dragon = null;
        spawnTimer = 1.2;
    }

    private DragonRenderSnapshot? CreateDragonSnapshot()
    {
        if (dragon is not { Health: > 0 } activeDragon) return null;
        return new DragonRenderSnapshot(
            activeDragon.Definition.Name,
            activeDragon.Definition.Title,
            activeDragon.Position.X,
            activeDragon.Position.Y,
            activeDragon.Radius,
            activeDragon.Health,
            activeDragon.MaxHealth,
            activeDragon.Phase,
            activeDragon.FrozenFor > 0);
    }

    private DragonBreathRenderSnapshot? CreateDragonBreathSnapshot()
    {
        if (dragon is not { IsTelegraphing: true } activeDragon) return null;
        return new DragonBreathRenderSnapshot(
            activeDragon.Position.X,
            activeDragon.Position.Y,
            activeDragon.BreathDirection.X,
            activeDragon.BreathDirection.Y,
            DragonBreathRange,
            DragonBreathHalfAngle);
    }
}
