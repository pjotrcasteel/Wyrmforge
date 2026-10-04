using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private bool dragonPending;
    private bool dragonEncounterStarted;

    private void UpdateDragonEncounter(double delta, double width, double height)
    {
        if (dragonPending && !dragonEncounterStarted && attractedDragon is { } target) SpawnDragon(DragonCatalog.Get(target), width);
        if (dragon is not { Health: > 0 } activeDragon) return;

        activeDragon.FrozenFor = Math.Max(0, activeDragon.FrozenFor - delta);
        var scaledDelta = delta * (activeDragon.FrozenFor > 0 ? 0.45 : 1);
        UpdateDragonCombat(activeDragon, scaledDelta);

        var contactDamage = activeDragon.Definition.Combat.ContactDamagePerSecond;
        if (Vector2D.Distance(activeDragon.Position, player.Position) <= activeDragon.Radius + player.Radius) DamagePlayer(contactDamage * delta);
    }

    private void UpdateDragonCombat(DragonState activeDragon, double delta)
    {
        if (activeDragon.IsTelegraphing)
        {
            activeDragon.TelegraphRemaining -= delta;
            if (activeDragon.TelegraphRemaining <= 0) ResolveDragonAttack(activeDragon);
            return;
        }

        activeDragon.AttackCooldown -= delta;
        if (activeDragon.AttackCooldown <= 0) StartDragonAttack(activeDragon);
        else MoveDragon(activeDragon, delta);
    }

    private void SpawnDragon(DragonDefinition definition, double width)
    {
        dragonEncounterStarted = true;
        dragonPending = false;
        enemies.Clear();
        projectiles.Clear();
        lightning.Clear();
        dragon = new DragonState(++enemyId, definition, new Vector2D(width / 2, -definition.Radius - 18));
    }

    private void MoveDragon(DragonState activeDragon, double delta)
    {
        var profile = activeDragon.Definition.Combat.Movement;
        var distance = Vector2D.Distance(activeDragon.Position, player.Position);
        var towardPlayer = Vector2D.DirectionTo(activeDragon.Position, player.Position);
        var direction = MovementDirection(profile, distance, towardPlayer);
        var speed = activeDragon.Speed * profile.SpeedMultiplier.For(activeDragon.Phase);
        activeDragon.Position += direction * speed * delta;
    }

    private static Vector2D MovementDirection(DragonMovementProfile profile, double distance, Vector2D towardPlayer)
    {
        var tangent = new Vector2D(-towardPlayer.Y, towardPlayer.X);
        return profile.Style switch
        {
            DragonMovementStyle.Pursue when distance > profile.MaximumRange => towardPlayer,
            DragonMovementStyle.Pursue when distance < profile.MinimumRange => towardPlayer * -0.65,
            DragonMovementStyle.Pursue => Vector2D.Zero,
            DragonMovementStyle.Kite when distance > profile.MaximumRange => towardPlayer,
            DragonMovementStyle.Kite when distance < profile.MinimumRange => towardPlayer * -1,
            DragonMovementStyle.Kite => tangent * profile.TangentWeight,
            DragonMovementStyle.Orbit when distance > profile.MaximumRange => (towardPlayer + tangent * profile.TangentWeight).Normalized(),
            DragonMovementStyle.Orbit when distance < profile.MinimumRange => (towardPlayer * -1 + tangent * profile.TangentWeight).Normalized(),
            _ => tangent,
        };
    }

    private void StartDragonAttack(DragonState activeDragon)
    {
        var attack = activeDragon.Definition.Combat.Attack;
        activeDragon.TelegraphRemaining = attack.TelegraphSeconds.For(activeDragon.Phase);
        switch (attack.Pattern)
        {
            case DragonAttackPattern.Cone:
                activeDragon.BreathDirection = Vector2D.DirectionTo(activeDragon.Position, player.Position);
                break;
            case DragonAttackPattern.SelfBurst:
                RegisterSplashPulse(activeDragon.Position, attack.Geometry.Radius.For(activeDragon.Phase), activeDragon.TelegraphRemaining);
                break;
            case DragonAttackPattern.TargetBurst:
                activeDragon.AttackTarget = player.Position;
                RegisterSplashPulse(activeDragon.AttackTarget, attack.Geometry.Radius.For(activeDragon.Phase), activeDragon.TelegraphRemaining);
                break;
            default:
                throw new InvalidOperationException($"Unsupported dragon attack pattern {attack.Pattern}.");
        }
    }

    private void ResolveDragonAttack(DragonState activeDragon)
    {
        var attack = activeDragon.Definition.Combat.Attack;
        activeDragon.TelegraphRemaining = 0;
        activeDragon.AttackCooldown = attack.CooldownSeconds.For(activeDragon.Phase);
        switch (attack.Pattern)
        {
            case DragonAttackPattern.Cone:
                ResolveConeAttack(activeDragon, attack);
                break;
            case DragonAttackPattern.SelfBurst:
                ResolveBurstAttack(activeDragon.Position, activeDragon, attack);
                break;
            case DragonAttackPattern.TargetBurst:
                ResolveBurstAttack(activeDragon.AttackTarget, activeDragon, attack);
                break;
            default:
                throw new InvalidOperationException($"Unsupported dragon attack pattern {attack.Pattern}.");
        }
    }

    private void ResolveConeAttack(DragonState activeDragon, DragonAttackProfile attack)
    {
        var offset = player.Position - activeDragon.Position;
        var distance = offset.Length;
        if (distance > attack.Geometry.Range || distance <= double.Epsilon) return;
        var playerDirection = offset.Normalized();
        var dot = playerDirection.X * activeDragon.BreathDirection.X + playerDirection.Y * activeDragon.BreathDirection.Y;
        if (dot < Math.Cos(attack.Geometry.HalfAngle)) return;
        RegisterElementalImpact(player.Position, attack.VisualSpell);
        DamagePlayer(attack.Damage.For(activeDragon.Phase));
    }

    private void ResolveBurstAttack(Vector2D center, DragonState activeDragon, DragonAttackProfile attack)
    {
        var radius = attack.Geometry.Radius.For(activeDragon.Phase);
        RegisterElementalImpact(center, attack.VisualSpell);
        if (Vector2D.Distance(player.Position, center) <= radius) DamagePlayer(attack.Damage.For(activeDragon.Phase));
    }

    private void DefeatDragon(DragonState defeatedDragon)
    {
        if (!ReferenceEquals(dragon, defeatedDragon)) return;
        dragonsSlain++;
        var definition = defeatedDragon.Definition;
        defeatedDragonIds.Add(definition.Id);
        var reward = definition.Combat.Reward;
        score += reward.BaseScore + (int)(elapsed * reward.ScorePerElapsedSecond);
        dragon = null;
        spawnTimer = 1.2;
        mapState.CompleteDragon();
        pendingDragonEssenceChoices = DragonEssenceCatalog.ChoicesFor(definition.Id).Where(choice => !build.DragonEssences.Contains(choice.Id)).ToArray();
        GainExperience(reward.Experience);
        if (pendingDragonEssenceChoices.Count == 0 && !extractionState.Start(player.Position)) checkpointState.Enter();
    }

    private DragonRenderSnapshot? CreateDragonSnapshot()
    {
        if (dragon is not { Health: > 0 } activeDragon) return null;
        var definition = activeDragon.Definition;
        return new DragonRenderSnapshot(definition.Name, definition.Title, definition.School, activeDragon.Position.X, activeDragon.Position.Y, activeDragon.Radius,
            activeDragon.Health, activeDragon.MaxHealth, activeDragon.Phase, activeDragon.FrozenFor > 0);
    }

    private DragonBreathRenderSnapshot? CreateDragonBreathSnapshot()
    {
        if (dragon is not { IsTelegraphing: true } activeDragon) return null;
        var attack = activeDragon.Definition.Combat.Attack;
        if (attack.Pattern != DragonAttackPattern.Cone) return null;
        return new DragonBreathRenderSnapshot(activeDragon.Position.X, activeDragon.Position.Y, activeDragon.BreathDirection.X, activeDragon.BreathDirection.Y,
            attack.Geometry.Range, attack.Geometry.HalfAngle);
    }
}
