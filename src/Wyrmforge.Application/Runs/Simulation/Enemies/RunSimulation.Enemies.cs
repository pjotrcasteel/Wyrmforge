using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Application.Runs.Simulation.Snapshots;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private EnemyEncounterPattern encounterPattern = EnemyEncounterPattern.Mixed;
    private EnemyCompositionPlan? encounterPlan;
    private int encounterPlanIndex;
    private WyrmrealmHabitat? encounterHabitat;
    private readonly List<HostileProjectileState> hostileProjectiles = [];
    private double encounterSeconds;
    private double rangedStaggerRemaining;

    private void UpdateSpawn(double delta, double width, double height)
    {
        if (developmentHunt || trailExitPending || dragon is { Health: > 0 }) return;
        if (dragonEncounterStarted)
        {
            if (extractionState.IsActive) UpdateExtractionDefense(delta, width, height);
            return;
        }

        if (entryGraceRemaining > 0)
        {
            entryGraceRemaining = Math.Max(0, entryGraceRemaining - delta);
            return;
        }
        var mapEncounter = mapState.EncounterActive;
        if (mapEncounter)
        {
            encounterDirector.Tick(delta);
            arenaEnvironment?.SetPhase(encounterDirector.Phase);
            if (encounterDirector.CanComplete && mapState.CurrentNodeKills >= mapState.CurrentNodeKillsRequired)
            {
                // Stop spawning after the finale, but do not open a passage with live enemies on the floor.
                if (HostileCount == 0 && mapState.CurrentNode is { } completed && mapState.TryCompleteEncounter())
                    CompleteTrail(completed);
                spawnTimer = 0.08;
                return;
            }
        }
        if (mapEncounter && encounterDirector.Directive.SuppressSpawns)
        {
            spawnTimer = Math.Max(spawnTimer, 0.08);
            return;
        }

        spawnTimer -= delta;
        if (spawnTimer > 0) return;

        var stage = mapState.CurrentNode?.Stage ?? 1;
        var activeCap = mapEncounter ? EnemyStagePressure.ActiveEnemyCap(stage, depthState.Depth) : EnemyEncounterComposition.GetActiveEnemyCap(depthState.Depth);
        if (HostileCount >= activeCap)
        {
            spawnTimer = 0.08;
            return;
        }

        var directive = mapEncounter ? encounterDirector.Directive : EncounterDirective.Default;
        var batchSize = EnemyEncounterComposition.GetSpawnBatchSize(encounterPattern, randomSource) + directive.BatchSizeBonus;
        var spawned = 0;
        if (mapEncounter && encounterHabitat is { } habitat && encounterDirector.TryTakeRecipe(out var recipe))
        {
            encounterPlan = EnemyEncounterComposition.CreateRecipePlan(recipe, habitat, encounterPattern, randomSource,
                depthState.ThreatBudgetMultiplier * encounterModifiers.ThreatBudgetMultiplier);
            encounterPlanIndex = 0;
        }
        if (mapEncounter && HostileCount < activeCap && encounterDirector.TryTakeInsert(out var insert))
        {
            SpawnEnemy(width, height, insert);
            spawned++;
        }

        for (var index = spawned; index < batchSize && HostileCount < activeCap; index++)
        {
            EnsureEncounterPlan(mapEncounter);
            if (encounterPlan is null || encounterPlanIndex >= encounterPlan.Enemies.Count) break;
            SpawnEnemy(width, height, encounterPlan.Enemies[encounterPlanIndex++]);
        }

        var baseInterval = EnemyStagePressure.SpawnIntervalSeconds(stage);
        var routeMultiplier = Math.Max(0.35, CurrentRoute?.Encounter.SpawnIntervalMultiplier ?? 1);
        spawnTimer = baseInterval * depthState.SpawnIntervalMultiplier * EnemyEncounterComposition.GetSpawnIntervalMultiplier(encounterPattern) * routeMultiplier
            * encounterModifiers.SpawnIntervalMultiplier * directive.SpawnIntervalMultiplier * (mapEncounter ? EnemyStagePressure.OpeningSpawnIntervalMultiplier(stage, depthState.Depth) : 1);
    }

    private void UpdateExtractionDefense(double delta, double width, double height)
    {
        // Wyrm victory transitions into a bounded final stand rather than endless normal waves.
        spawnTimer -= delta;
        if (spawnTimer > 0 || !ExtractionDefenseProfile.CanSpawn(extractionState.RemainingSeconds)) return;
        if (HostileCount >= ExtractionDefenseProfile.ActiveEnemyCap(depthState.Depth))
        {
            spawnTimer = 0.1;
            return;
        }

        EnsureEncounterPlan(false);
        if (encounterPlan is not null && encounterPlanIndex < encounterPlan.Enemies.Count)
            SpawnEnemy(width, height, encounterPlan.Enemies[encounterPlanIndex++]);
        spawnTimer = ExtractionDefenseProfile.SpawnIntervalSeconds(depthState.Depth);
    }

    private void EnsureEncounterPlan(bool mapEncounter)
    {
        if (encounterPlan is not null && encounterPlanIndex < encounterPlan.Enemies.Count) return;
        if (!mapEncounter) encounterPattern = EnemyEncounterComposition.SelectNext(encounterPattern, randomSource.Next(2));
        var threatBudget = depthState.ThreatBudgetMultiplier * encounterModifiers.ThreatBudgetMultiplier;
        encounterPlan = EnemyEncounterComposition.CreatePlan(encounterPattern, depthState.Depth, randomSource, threatBudget,
            mapEncounter ? encounterHabitat : null);
        encounterPlanIndex = 0;
    }

    private void SpawnEnemy(double width, double height, EnemyKind kind)
    {
        const double margin = 30;
        // Map encounters enter from where their habitat hides them: along the road, out of the flanks, or from everywhere.
        var huntingPair = kind == EnemyKind.MireHound && encounterPlan?.Recipe == EnemyPackRecipe.HuntingPack;
        var edge = huntingPair
            // A hunting pack arrives in pairs, each pair from a different side (brief §6).
            ? (encounterPlanIndex - 1) / 2 % 4
            : (mapState.EncounterActive ? encounterHabitat : null) is { } habitat
            ? WyrmrealmHabitatCatalog.SpawnOrigin(habitat) switch
            {
                WyrmrealmSpawnOrigin.Road => enemyId % 2 * 2,
                WyrmrealmSpawnOrigin.Flanks => 1 + enemyId % 2 * 2,
                _ => randomSource.Next(4),
            }
            : encounterPattern switch
            {
                EnemyEncounterPattern.Swarm => enemyId % 2 * 2,
                EnemyEncounterPattern.StalkerPressure => enemyId % 4,
                _ => randomSource.Next(4),
            };
        // Spawn around the hunter's *camera*, not at the remote edge of a multi-screen world.
        // Otherwise roaming makes the opening waves invisible and changes encounter difficulty.
        var localWidth = mapState.EncounterActive ? viewportWidth : width;
        var localHeight = mapState.EncounterActive ? viewportHeight : height;
        var horizontal = (randomSource.NextDouble() - 0.5) * localWidth;
        var vertical = (randomSource.NextDouble() - 0.5) * localHeight;
        var position = edge switch
        {
            0 => new Vector2D(player.Position.X + horizontal, player.Position.Y - localHeight / 2 - margin),
            1 => new Vector2D(player.Position.X + localWidth / 2 + margin, player.Position.Y + vertical),
            2 => new Vector2D(player.Position.X + horizontal, player.Position.Y + localHeight / 2 + margin),
            _ => new Vector2D(player.Position.X - localWidth / 2 - margin, player.Position.Y + vertical),
        };
        position = new Vector2D(Math.Clamp(position.X, margin, Math.Max(margin, width - margin)),
            Math.Clamp(position.Y, margin, Math.Max(margin, height - margin)));
        var definition = EnemyCatalog.Get(kind);
        var (health, speed) = EnemyStats(definition);
        if (mapState.EncounterActive && arenaEnvironment is not null)
        {
            // No valid ground outside the hunter's safety ring: skip this spawn rather than drop it on the player.
            if (arenaEnvironment.AdjustSpawnPosition(position, player.Position, width, height, definition.Radius) is not { } safe) return;
            position = safe;
        }
        var elite = TakeEliteFor(kind);
        if (elite != EliteAffix.None) health *= EliteAffixCatalog.Get(elite).HealthMultiplier;
        var enemy = new EnemyState(++enemyId, position, definition.Radius, health, speed, kind) { Elite = elite };
        enemy.Penitent?.Face(Vector2D.DirectionTo(position, player.Position));
        // Wraiths arrive under the water and only join the fight when they surface.
        if (enemy.DrownedWraith is not null) submergedWraiths.Add(enemy);
        else enemies.Add(enemy);
    }

    private (double Health, double Speed) EnemyStats(EnemyDefinition definition)
    {
        var stage = mapState.CurrentNode?.Stage ?? 1;
        var routeHealth = Math.Max(0.25, CurrentRoute?.Encounter.EnemyHealthMultiplier ?? 1) * encounterModifiers.EnemyHealthMultiplier;
        var routeSpeed = Math.Max(0.25, CurrentRoute?.Encounter.EnemySpeedMultiplier ?? 1) * encounterModifiers.EnemySpeedMultiplier;
        var health = EnemyStagePressure.BaseHealth * EnemyStagePressure.HealthMultiplier(stage) * depthState.EnemyHealthMultiplier * routeHealth
            * definition.HealthMultiplier;
        var speed = EnemyStagePressure.BaseSpeed * EnemyStagePressure.SpeedMultiplier(stage) * depthState.EnemySpeedMultiplier * routeSpeed
            * definition.SpeedMultiplier;
        return (health, speed);
    }

    private void UpdateEnemies(double delta)
    {
        encounterSeconds += delta;
        rangedStaggerRemaining = Math.Max(0, rangedStaggerRemaining - delta);
        var committedCap = EnemyStagePressure.CommittedThreatCap(mapState.CurrentNode?.Stage ?? 1);
        var committed = CommittedThreatCount();
        var rangedAllowed = !mapState.EncounterActive || encounterSeconds >= EnemyStagePressure.RangedGraceSeconds;
        UpdateAshRemains(delta);
        RefreshPackbloodLeaders();
        UpdateSubmergedWraiths(delta, ref committed, committedCap);
        // Raised Ashlings are appended mid-loop; walking the frame's original count lets them start acting next frame.
        for (int index = 0, count = enemies.Count; index < count; index++)
        {
            var enemy = enemies[index];
            enemy.Statuses.Tick(delta);
            var statusTimeScale = enemy.Statuses.TimeScale(false);
            if (statusTimeScale <= 0) continue;

            var scaledDelta = delta * statusTimeScale;
            var target = mapState.EncounterActive && arenaEnvironment is not null
                ? arenaEnvironment.EnemyNavigationTarget(enemy.Position, player.Position, arenaWidth, arenaHeight, enemy.Radius)
                : player.Position;
            // While a ruined wall separates enemy and hunter, everyone simply heads for the crossing.
            var crossing = target != player.Position;
            var direction = Vector2D.DirectionTo(enemy.Position, target);
            var speed = enemy.Speed;
            var contactDamagePerSecond = 18d * EnemyCatalog.Get(enemy.Kind).ContactDamageMultiplier * EliteImpact(enemy);
            if (packbloodLeaders.Count > 0 && IsPackbloodEmpowered(enemy)) speed *= PackbloodSpeedMultiplier;
            if (enemy.RoutedRemaining > 0)
            {
                // Morale break: flee the hunter, then re-engage once the timer ends. Bounded, so it never soft-locks a node.
                enemy.RoutedRemaining = Math.Max(0, enemy.RoutedRemaining - scaledDelta);
                if (!crossing) direction = Vector2D.DirectionTo(player.Position, enemy.Position);
            }
            else if (enemy.AshPriest is { } priest)
                (direction, speed) = UpdateAshPriest(enemy, priest, scaledDelta, crossing, direction, speed);
            else if (enemy.Penitent is { } penitent)
            {
                (direction, speed, var bashCommitted) = UpdatePenitent(enemy, penitent, scaledDelta, crossing, direction, speed, committed < committedCap);
                committed += bashCommitted;
            }
            else if (enemy.DrownedWraith is { } wraith) speed = UpdateDrownedWraith(enemy, wraith, scaledDelta, speed);
            else if (enemy.MireHound is { } hound)
            {
                if (hound.Tick(scaledDelta, enemy.Position, player.Position, !crossing && committed < committedCap)) committed++;
                switch (hound.Phase)
                {
                    case MireHoundPhase.Windup or MireHoundPhase.Recover:
                        speed = 0;
                        break;
                    case MireHoundPhase.Pounce:
                        direction = hound.PounceDirection;
                        speed = MireHoundBehaviorState.PounceSpeed;
                        break;
                    case MireHoundPhase.Retreat:
                        direction = Vector2D.DirectionTo(player.Position, enemy.Position);
                        speed *= MireHoundBehaviorState.StalkSpeedMultiplier;
                        break;
                    default:
                        if (!crossing) direction = Vector2D.DirectionTo(enemy.Position, hound.StalkPoint(enemy.Position, player.Position));
                        speed *= MireHoundBehaviorState.StalkSpeedMultiplier;
                        break;
                }
            }
            else if (enemy.AshSlinger is { } slinger)
            {
                var mayThrow = rangedAllowed && rangedStaggerRemaining <= 0 && committed < committedCap;
                switch (slinger.Tick(scaledDelta, enemy.Position, player.Position, enemy.Health, enemy.MaxHealth, mayThrow))
                {
                    case AshSlingerEvent.WindupStarted:
                        committed++;
                        rangedStaggerRemaining = EnemyStagePressure.RangedStaggerSeconds;
                        break;
                    case AshSlingerEvent.Released:
                        hostileProjectiles.Add(new HostileProjectileState(enemy.Position, slinger.Target, AshSlingerBehaviorState.FlightSeconds,
                            AshSlingerBehaviorState.ImpactRadius, AshSlingerBehaviorState.Damage * EliteImpact(enemy), AshSlingerBehaviorState.ArcHeight));
                        if (enemy.Elite == EliteAffix.CinderMarksman) AddCinderMarksmanEmber(enemy, slinger.Target);
                        break;
                }
                if (slinger.Phase != AshSlingerPhase.Reposition) speed = 0;
                else if (!crossing)
                {
                    var (away, multiplier) = slinger.Movement(enemy.Position, player.Position);
                    direction = away;
                    speed *= multiplier;
                }
            }

            if (speed > 0)
            {
                var previous = enemy.Position;
                var proposed = previous + direction * speed * scaledDelta;
                enemy.Position = mapState.EncounterActive && arenaEnvironment is not null
                    ? arenaEnvironment.RestrictMovement(previous, proposed, arenaWidth, arenaHeight, enemy.Radius)
                    : proposed;
            }
            if (delta <= 0 || Vector2D.Distance(enemy.Position, player.Position) > enemy.Radius + player.Radius) continue;
            if (enemy.MireHound is { Phase: MireHoundPhase.Pounce } biter)
            {
                // One committed bite, then the hound is exposed; never a pounce-speed contact grind.
                DamagePlayer(MireHoundBehaviorState.PounceDamage * EliteImpact(enemy));
                biter.Land();
            }
            else DamagePlayerContact(contactDamagePerSecond * statusTimeScale);
        }
        SinkWraiths();
        UpdateHostileProjectiles(delta);
    }

    private int CommittedThreatCount() => hostileProjectiles.Count + submergedWraiths.Count(wraith => wraith.DrownedWraith!.IsCommitted)
        + enemies.Count(enemy => enemy.MireHound?.IsCommitted == true || enemy.AshSlinger?.IsCommitted == true || enemy.Penitent?.IsCommitted == true
            || enemy.DrownedWraith?.IsCommitted == true);

    private void UpdateHostileProjectiles(double delta)
    {
        foreach (var ember in hostileProjectiles)
        {
            ember.Advance(delta);
            if (!ember.Landed) continue;
            // Collision belongs to C#: the ember resolves once, exactly inside the mark the hunter was shown.
            RegisterElementalImpact(ember.Target, SpellId.FireBolt);
            if (Vector2D.Distance(player.Position, ember.Target) <= ember.Radius) DamagePlayer(ember.Damage);
        }
        hostileProjectiles.RemoveAll(ember => ember.Landed);
    }

    private EnemyTelegraphRenderSnapshot? CreateEnemyTelegraph(EnemyState enemy) => enemy switch
    {
        { MireHound: { Phase: MireHoundPhase.Windup } hound } => new EnemyTelegraphRenderSnapshot("pounce", hound.WindupProgress,
            hound.PounceEnd.X, hound.PounceEnd.Y, enemy.Radius),
        { AshSlinger: { Phase: AshSlingerPhase.Windup } slinger } => new EnemyTelegraphRenderSnapshot("lob", slinger.WindupProgress,
            slinger.Target.X, slinger.Target.Y, AshSlingerBehaviorState.ImpactRadius),
        { Penitent: { Phase: PenitentPhase.Windup } penitent } => new EnemyTelegraphRenderSnapshot("bash", penitent.WindupProgress,
            enemy.Position.X + penitent.Facing.X * PenitentBehaviorState.BashReach, enemy.Position.Y + penitent.Facing.Y * PenitentBehaviorState.BashReach,
            PenitentBehaviorState.BashReach),
        { DrownedWraith: { Phase: DrownedWraithPhase.Windup } claw } => new EnemyTelegraphRenderSnapshot("claw", claw.WindupProgress,
            enemy.Position.X + claw.Facing.X * DrownedWraithBehaviorState.StrikeReach, enemy.Position.Y + claw.Facing.Y * DrownedWraithBehaviorState.StrikeReach,
            DrownedWraithBehaviorState.StrikeReach),
        { AshPriest: { Phase: AshPriestPhase.Heal } healer } => enemies.FirstOrDefault(ally => ally.Id == healer.HealTargetId) is { } ward
            ? new EnemyTelegraphRenderSnapshot("heal", healer.CastProgress, ward.Position.X, ward.Position.Y, ward.Radius)
            : null,
        { AshPriest: { Phase: AshPriestPhase.Revive } raiser } => new EnemyTelegraphRenderSnapshot("revive", raiser.CastProgress,
            raiser.CastPoint.X, raiser.CastPoint.Y, AshPriestBehaviorState.ReviveRange * 0.5),
        _ => null,
    };

    private IReadOnlyList<HostileProjectileRenderSnapshot> CreateHostileProjectileSnapshots() => hostileProjectiles
        .Select(ember => new HostileProjectileRenderSnapshot(ember.Position.X, ember.Position.Y, ember.Height, ember.Target.X, ember.Target.Y,
            ember.Radius, ember.Progress, ember.Style.ToString().ToLowerInvariant())).ToArray();
}
