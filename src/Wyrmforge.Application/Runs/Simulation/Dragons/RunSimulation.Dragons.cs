using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly DragonHuntState dragonHuntState = new();
    private readonly List<DragonHuntHazardState> dragonHuntHazards = [];
    private bool dragonPending;
    private bool dragonEncounterStarted;

    private void UpdateDragonEncounter(double delta, double width, double height)
    {
        if (dragonPending && !dragonEncounterStarted && attractedDragon is { } target) SpawnDragon(DragonCatalog.Get(target), width, height);
        if (dragon is not { Health: > 0 } activeDragon) return;

        if (dragonHuntState.Stage == DragonHuntStage.Entrance)
        {
            UpdateDragonEntrance(activeDragon, delta, width, height);
            return;
        }

        if (dragonHuntState.Stage == DragonHuntStage.PhaseBreak)
        {
            if (dragonHuntState.TickStage(delta)) activeDragon.AttackCooldown = 0.8;
            return;
        }

        if (dragonHuntState.TryStartPhaseBreak(activeDragon.Phase))
        {
            BeginDragonPhaseBreak(activeDragon);
            return;
        }

        UpdateDragonHuntPressure(delta, activeDragon, width, height);
        activeDragon.FrozenFor = Math.Max(0, activeDragon.FrozenFor - delta);
        var scaledDelta = delta * (activeDragon.FrozenFor > 0 ? 0.45 : 1);
        UpdateDragonCombat(activeDragon, scaledDelta);

        var contactDamage = activeDragon.Definition.Combat.ContactDamagePerSecond;
        if (Vector2D.Distance(activeDragon.Position, player.Position) <= activeDragon.Radius + player.Radius) DamagePlayer(contactDamage * delta);
    }

    private void UpdateDragonEntrance(DragonState activeDragon, double delta, double width, double height)
    {
        var entrance = dragonHuntState.Profile?.Entrance ?? throw new InvalidOperationException("Active dragon hunt requires an entrance profile.");
        dragonHuntState.TickStage(delta);
        var progress = dragonHuntState.Stage == DragonHuntStage.Entrance ? EaseOutCubic(dragonHuntState.StageProgress) : 1;
        var from = ArenaPoint(entrance.Start, width, height);
        var to = ArenaPoint(entrance.Destination, width, height);
        activeDragon.Position = from + ((to - from) * progress);
        if (dragonHuntState.Stage == DragonHuntStage.Battle) activeDragon.AttackCooldown = 1.15;
    }

    private void BeginDragonPhaseBreak(DragonState activeDragon)
    {
        activeDragon.TelegraphRemaining = 0;
        activeDragon.AttackCooldown = 1;
        dragonHuntHazards.Clear();
    }

    private void UpdateDragonHuntPressure(double delta, DragonState activeDragon, double width, double height)
    {
        for (var index = dragonHuntHazards.Count - 1; index >= 0; index--)
        {
            var hazard = dragonHuntHazards[index];
            hazard.Remaining -= delta;
            if (hazard.Remaining > 0) continue;
            ResolveDragonHuntHazard(hazard);
            dragonHuntHazards.RemoveAt(index);
        }

        if (!dragonHuntState.TickPressure(delta, activeDragon.Phase)) return;
        ScheduleDragonHuntPressure(activeDragon, width, height);
    }

    private void ScheduleDragonHuntPressure(DragonState activeDragon, double width, double height)
    {
        var profile = dragonHuntState.Profile?.Pressure ?? throw new InvalidOperationException("Active dragon hunt requires a pressure profile.");
        var radius = profile.Radius.For(activeDragon.Phase);
        var damage = profile.Damage.For(activeDragon.Phase);
        var telegraph = profile.Cadence.TelegraphSeconds.For(activeDragon.Phase);

        for (var strike = 0; strike < profile.Strikes; strike++)
        {
            var position = HuntPressurePosition(profile.Origin, activeDragon, width, height, radius);
            dragonHuntHazards.Add(new DragonHuntHazardState(position, radius, damage, telegraph, profile.VisualSpell, activeDragon.Definition.School));
        }
    }

    private Vector2D HuntPressurePosition(DragonHuntPressureOrigin origin, DragonState activeDragon, double width, double height, double radius) => origin switch
    {
        DragonHuntPressureOrigin.Player => player.Position,
        DragonHuntPressureOrigin.Dragon => activeDragon.Position,
        DragonHuntPressureOrigin.ArenaRandom => RandomArenaPosition(width, height, radius),
        _ => player.Position,
    };

    private Vector2D RandomArenaPosition(double width, double height, double radius)
    {
        var maximumMargin = Math.Min(width, height) * 0.22;
        var margin = Math.Min(radius + 18, maximumMargin);
        var usableWidth = Math.Max(1, width - margin * 2);
        var usableHeight = Math.Max(1, height - margin * 2);
        return new Vector2D(margin + randomSource.NextDouble() * usableWidth, margin + randomSource.NextDouble() * usableHeight);
    }

    private void ResolveDragonHuntHazard(DragonHuntHazardState hazard)
    {
        RegisterElementalImpact(hazard.Position, hazard.VisualSpell);
        if (Vector2D.Distance(player.Position, hazard.Position) <= hazard.Radius) DamagePlayer(hazard.Damage);
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

    private void SpawnDragon(DragonDefinition definition, double width, double height)
    {
        dragonEncounterStarted = true;
        dragonPending = false;
        enemies.Clear();
        projectiles.Clear();
        lightning.Clear();
        var hunt = DragonHuntCatalog.Get(definition.Id);
        dragonHuntState.Start(hunt);
        dragonHuntHazards.Clear();
        dragon = new DragonState(++enemyId, definition, ArenaPoint(hunt.Entrance.Start, width, height));
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
        dragonHuntHazards.Clear();
        dragonHuntState.Reset();
        spawnTimer = 1.2;
        mapState.CompleteDragon();
        pendingDragonEssenceChoices = DragonEssenceCatalog.ChoicesFor(definition.Id).Where(choice => !build.DragonEssences.Contains(choice.Id)).ToArray();
        GainExperience(reward.Experience);
        if (pendingDragonEssenceChoices.Count == 0 && !extractionState.Start(player.Position)) checkpointState.Enter();
    }

    private void ResetDragonHunt()
    {
        dragonHuntHazards.Clear();
        dragonHuntState.Reset();
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
        if (dragon is not { IsTelegraphing: true } activeDragon || !dragonHuntState.CanDragonAct) return null;
        var attack = activeDragon.Definition.Combat.Attack;
        if (attack.Pattern != DragonAttackPattern.Cone) return null;
        return new DragonBreathRenderSnapshot(activeDragon.Position.X, activeDragon.Position.Y, activeDragon.BreathDirection.X, activeDragon.BreathDirection.Y,
            attack.Geometry.Range, attack.Geometry.HalfAngle);
    }

    private DragonHuntRenderSnapshot? CreateDragonHuntSnapshot()
    {
        if (dragon is not { Health: > 0 } activeDragon || dragonHuntState.Profile is not { } hunt) return null;
        return new DragonHuntRenderSnapshot(activeDragon.Definition.School, dragonHuntState.Stage, hunt.Arena, hunt.Entrance.Style, dragonHuntState.StageProgress);
    }

    private IReadOnlyList<DragonHuntHazardRenderSnapshot> CreateDragonHuntHazardSnapshots() => dragonHuntHazards
        .Select(hazard => new DragonHuntHazardRenderSnapshot(hazard.Position.X, hazard.Position.Y, hazard.Radius, hazard.Progress, hazard.School))
        .ToArray();

    private static Vector2D ArenaPoint(DragonHuntPoint point, double width, double height) => new(point.X * width, point.Y * height);

    private static double EaseOutCubic(double value)
    {
        var inverse = 1 - Math.Clamp(value, 0, 1);
        return 1 - inverse * inverse * inverse;
    }

    private sealed class DragonHuntHazardState(
        Vector2D position,
        double radius,
        double damage,
        double duration,
        SpellId visualSpell,
        SpellSchool school)
    {
        public Vector2D Position { get; } = position;
        public double Radius { get; } = radius;
        public double Damage { get; } = damage;
        public double Duration { get; } = duration;
        public double Remaining { get; set; } = duration;
        public SpellId VisualSpell { get; } = visualSpell;
        public SpellSchool School { get; } = school;
        public double Progress => 1 - Math.Clamp(Remaining / Duration, 0, 1);
    }
}
