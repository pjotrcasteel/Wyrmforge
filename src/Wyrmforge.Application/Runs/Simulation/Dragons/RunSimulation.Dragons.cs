using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double DragonArrivalSeconds = 30;
    private const double DragonBreathRange = 340;
    private const double DragonBreathHalfAngle = 0.4;
    private bool initialDragonEncounterStarted;
    private bool deepDragonPending;
    private bool deepDragonEncounterStarted;

    private void UpdateDragonEncounter(double delta, double width, double height)
    {
        if (!initialDragonEncounterStarted && elapsed >= DragonArrivalSeconds) SpawnDragon(DragonCatalog.Get(huntRoute.First), width, false);
        if (deepDragonPending && !deepDragonEncounterStarted && dragon is null) SpawnDragon(DragonCatalog.Get(huntRoute.Deep), width, true);
        if (dragon is not { Health: > 0 } activeDragon) return;

        activeDragon.FrozenFor = Math.Max(0, activeDragon.FrozenFor - delta);
        var timeScale = activeDragon.FrozenFor > 0 ? 0.45 : 1;
        var scaledDelta = delta * timeScale;
        if (activeDragon.Definition.Id == DragonId.Stormcoil) UpdateStormcoil(activeDragon, scaledDelta);
        else UpdateAshfang(activeDragon, scaledDelta);

        var contactDamagePerSecond = activeDragon.Definition.Id == DragonId.Stormcoil ? 30 : 24;
        if (Vector2D.Distance(activeDragon.Position, player.Position) <= activeDragon.Radius + player.Radius) DamagePlayer(contactDamagePerSecond * delta);
    }

    private void UpdateAshfang(DragonState activeDragon, double delta)
    {
        if (activeDragon.IsTelegraphing)
        {
            activeDragon.TelegraphRemaining -= delta;
            if (activeDragon.TelegraphRemaining <= 0) ResolveDragonBreath(activeDragon);
            return;
        }
        activeDragon.AttackCooldown -= delta;
        if (activeDragon.AttackCooldown <= 0) StartDragonBreath(activeDragon);
        else MoveAshfang(activeDragon, delta);
    }

    private void UpdateStormcoil(DragonState activeDragon, double delta)
    {
        if (activeDragon.IsTelegraphing)
        {
            activeDragon.TelegraphRemaining -= delta;
            if (activeDragon.TelegraphRemaining <= 0) ResolveStormPulse(activeDragon);
            return;
        }
        activeDragon.AttackCooldown -= delta;
        if (activeDragon.AttackCooldown <= 0) StartStormPulse(activeDragon);
        else MoveStormcoil(activeDragon, delta);
    }

    private void SpawnDragon(DragonDefinition definition, double width, bool deep)
    {
        if (deep)
        {
            deepDragonEncounterStarted = true;
            deepDragonPending = false;
        }
        else initialDragonEncounterStarted = true;

        enemies.Clear();
        projectiles.Clear();
        lightning.Clear();
        dragon = new DragonState(++enemyId, definition, new Vector2D(width / 2, -definition.Radius - 18));
    }

    private void MoveAshfang(DragonState activeDragon, double delta)
    {
        var distance = Vector2D.Distance(activeDragon.Position, player.Position);
        var direction = Vector2D.DirectionTo(activeDragon.Position, player.Position);
        var phaseSpeed = activeDragon.Speed * (activeDragon.Phase == 2 ? 1.25 : 1);
        if (distance > 190) activeDragon.Position += direction * phaseSpeed * delta;
        else if (distance < 120) activeDragon.Position -= direction * phaseSpeed * 0.65 * delta;
    }

    private void MoveStormcoil(DragonState activeDragon, double delta)
    {
        var distance = Vector2D.Distance(activeDragon.Position, player.Position);
        var towardPlayer = Vector2D.DirectionTo(activeDragon.Position, player.Position);
        var tangent = new Vector2D(-towardPlayer.Y, towardPlayer.X);
        var movement = distance switch
        {
            > 235 => (towardPlayer + tangent * 0.55).Normalized(),
            < 160 => (towardPlayer * -1 + tangent * 0.55).Normalized(),
            _ => tangent,
        };
        activeDragon.Position += movement * activeDragon.Speed * (activeDragon.Phase == 2 ? 1.2 : 1) * delta;
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

    private void StartStormPulse(DragonState activeDragon)
    {
        var telegraphSeconds = StormcoilProfile.TelegraphSeconds(activeDragon.Phase);
        activeDragon.TelegraphRemaining = telegraphSeconds;
        RegisterSplashPulse(activeDragon.Position, StormcoilProfile.PulseRadius(activeDragon.Phase), telegraphSeconds);
    }

    private void ResolveStormPulse(DragonState activeDragon)
    {
        activeDragon.TelegraphRemaining = 0;
        activeDragon.AttackCooldown = StormcoilProfile.CooldownSeconds(activeDragon.Phase);
        var radius = StormcoilProfile.PulseRadius(activeDragon.Phase);
        RegisterElementalImpact(activeDragon.Position, SpellId.ChainLightning);
        if (Vector2D.Distance(activeDragon.Position, player.Position) <= radius) DamagePlayer(StormcoilProfile.PulseDamage(activeDragon.Phase));
    }

    private void DefeatDragon(DragonState defeatedDragon)
    {
        if (!ReferenceEquals(dragon, defeatedDragon)) return;
        dragonsSlain++;
        var defeatedId = defeatedDragon.Definition.Id;
        score += defeatedId == DragonId.Stormcoil ? 4000 + (int)(elapsed * 12) : 2500 + (int)(elapsed * 10);
        dragon = null;
        spawnTimer = 1.2;
        pendingDragonEssenceChoices = DragonEssenceCatalog.ChoicesFor(defeatedId).Where(choice => !build.DragonEssences.Contains(choice.Id)).ToArray();
        GainExperience(defeatedId == DragonId.Stormcoil ? 8 : 5);
    }

    private DragonRenderSnapshot? CreateDragonSnapshot()
    {
        if (dragon is not { Health: > 0 } activeDragon) return null;
        return new DragonRenderSnapshot(activeDragon.Definition.Name, activeDragon.Definition.Title, activeDragon.Position.X, activeDragon.Position.Y, activeDragon.Radius, activeDragon.Health, activeDragon.MaxHealth, activeDragon.Phase, activeDragon.FrozenFor > 0);
    }

    private DragonBreathRenderSnapshot? CreateDragonBreathSnapshot()
    {
        if (dragon is not { IsTelegraphing: true } activeDragon || activeDragon.Definition.Id != DragonId.Ashfang) return null;
        return new DragonBreathRenderSnapshot(activeDragon.Position.X, activeDragon.Position.Y, activeDragon.BreathDirection.X, activeDragon.BreathDirection.Y, DragonBreathRange, DragonBreathHalfAngle);
    }
}
