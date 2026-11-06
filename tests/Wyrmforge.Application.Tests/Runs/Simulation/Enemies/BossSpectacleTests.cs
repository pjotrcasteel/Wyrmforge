using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Lighting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class BossSpectacleTests
{
    private static T Field<T>(RunSimulation run, string name) => (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(run)!;
    private static void Invoke(RunSimulation run, string name, params object?[] args) => typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(run, args);

    private static (RunSimulation Simulation, PlayerState Player, ArenaEnvironmentState Environment) TerrainRun(int seed)
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(new HashSet<string>(), seed: seed, hunt: HuntSelection.FireTierOne);
        simulation.EnableHunt1Terrain(.1);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var player = Field<PlayerState>(simulation, "player");
        for (var tick = 0; tick < 4; tick++) { player.Health = simulation.MaxHealth; simulation.Tick(.05, default, 390, 700); }
        return (simulation, player, Field<ArenaEnvironmentState>(simulation, "arenaEnvironment"));
    }

    [TestMethod]
    public void ABossBreakingOpenSplitsTheTerrainAndRollsAShockwaveOutOfIt()
    {
        var (simulation, player, environment) = TerrainRun(42);
        var revision = environment.Terrain!.Revision;
        Invoke(simulation, "TransformationBurst", player.Position + new Vector2D(150, 0), 4, 14, SpellId.FireBolt);
        Assert.IsGreaterThan(revision, environment.Terrain.Revision, "the ground under and around it is really cut");
        Assert.HasCount(1, simulation.CreateSnapshot().BellShockwaves);
    }

    [TestMethod]
    public void FlameScoursTheGroundItCrossesAndASweepBurnsAnArc()
    {
        var (simulation, player, environment) = TerrainRun(42);
        var dragon = new DragonState(99, DragonCatalog.Ashfang, player.Position + new Vector2D(0, -200));
        var brain = Field<AshfangBehaviorState>(simulation, "ashfangBehavior");
        brain.Begin("breath_sweep", dragon.Position, player.Position, 1.0);
        brain.Tick(1.2); brain.Strike();
        var revisions = new List<int> { environment.Terrain!.Revision };
        for (var step = 0; step < 6; step++)
        {
            brain.Tick(.25);
            Invoke(simulation, "ScorchBreathGround", dragon, .25);
            revisions.Add(environment.Terrain.Revision);
        }
        Assert.IsGreaterThan(revisions[0], revisions[^1], "the beam leaves real scorch in the terrain");
        Assert.IsGreaterThan(1, revisions.Distinct().Count());
    }

    [TestMethod]
    public void AReliquaryChangingFormCannotBeHurtUntilTheShiftEnds()
    {
        var (simulation, player, _) = TerrainRun(42);
        var definition = EnemyCatalog.Get(EnemyKind.Reliquary);
        var rite = new EnemyState(777, player.Position + new Vector2D(200, 0), definition.Radius, 100, 0, EnemyKind.Reliquary);
        Field<List<EnemyState>>(simulation, "enemies").Add(rite);
        rite.Health = 40;
        Assert.AreEqual(ReliquaryEvent.ShiftStarted, rite.Reliquary!.Tick(.05, rite.Health, rite.MaxHealth, player.Position, true));
        Invoke(simulation, "DamageTarget", rite, 10d, null, null);
        Assert.AreEqual(40, rite.Health, "no hit lands during the shift");
        Assert.IsTrue(simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == 777).Invulnerable);
        for (var time = 0d; time < ReliquaryBehaviorState.ShiftSeconds + .1; time += .05) rite.Reliquary.Tick(.05, rite.Health, rite.MaxHealth, player.Position, false);
        Invoke(simulation, "DamageTarget", rite, 10d, null, null);
        Assert.IsLessThan(40, rite.Health, "afterwards it is flesh again");
    }

    [TestMethod]
    public void ABurstInTheMiddleOfAWindUpStaggersAshfangOnceAndTheLockoutHoldsItOffAfterwards()
    {
        var run = new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(new HashSet<string>(),
            new DevelopmentHuntSetup(DragonId.Ashfang, false, 1, SpellId.FireBolt, 42, 402, 874, false));
        var dragon = Field<DragonState>(run, "dragon");
        Field<DragonHuntState>(run, "dragonHuntState").TickStage(10);
        var brain = Field<AshfangBehaviorState>(run, "ashfangBehavior");
        brain.Begin("pounce", dragon.Position, dragon.Position + new Vector2D(300, 0), .8);
        Invoke(run, "DamageTarget", dragon, dragon.MaxHealth * .01, null, null);
        Assert.AreEqual("pounce", brain.Action, "a scratch does not break a wind-up");
        Invoke(run, "DamageTarget", dragon, dragon.MaxHealth * RunSimulation.AshfangPoiseFraction, null, null);
        Assert.AreEqual("stagger", brain.Action);
        Assert.IsTrue(run.CreateSnapshot().AshfangEffects.Any(effect => effect.Kind == "stagger"));
        Assert.AreEqual(0, dragon.TelegraphRemaining);
        brain.Finish();
        brain.Begin("claw_right", dragon.Position, dragon.Position + new Vector2D(100, 0), .8);
        Invoke(run, "DamageTarget", dragon, dragon.MaxHealth * .2, null, null);
        Assert.AreEqual("claw_right", brain.Action, "it cannot be locked down: the next stagger waits for the lockout");
    }

    [TestMethod]
    public void TheFireBossesGlowAndBurnHotterWiderAndBrighterInTheirSecondForm()
    {
        var run = new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(new HashSet<string>(),
            new DevelopmentHuntSetup(DragonId.Ashfang, false, 1, SpellId.FireBolt, 42, 402, 874, true));
        var dragon = Field<DragonState>(run, "dragon");
        var glow = () => run.CreateSnapshot().Lighting!.Lights.Where(light => light.OwnerId.StartsWith("boss:ashfang:", StringComparison.Ordinal)).ToArray();
        var first = glow();
        Assert.HasCount(1, first, "one body glow in the first form");
        Assert.IsFalse(first[0].CastsShadow);
        dragon.Health = dragon.MaxHealth * .4;
        var second = glow();
        Assert.HasCount(2, second, "the enraged Wyrm adds a white-hot core");
        var body = second.Single(light => !light.Id.EndsWith(":core", StringComparison.Ordinal));
        Assert.IsGreaterThan(first[0].Intensity, body.Intensity);
        Assert.IsGreaterThan(first[0].Range, body.Range);
        Assert.AreNotEqual(first[0].Color, body.Color);

        var player = new PlayerState();
        foreach (var (kind, firstReach) in new[] { (EnemyKind.BellWarden, 5d), (EnemyKind.Reliquary, 4.5d) })
        {
            var boss = new EnemyState(5, Vector2D.Zero, EnemyCatalog.Get(kind).Radius, 100, 0, kind);
            var calm = BossGlowLightingProjection.Capture(null, [boss]).Single();
            Assert.AreEqual(boss.Radius * firstReach, calm.Radius, 1e-9);
            // Half health starts the change; the glow climbs while it lasts and is brightest as it breaks open.
            boss.Health = 45;
            var changing = false;
            for (var time = 0d; time < 2.5 && !changing; time += .05) changing = kind == EnemyKind.BellWarden
                ? boss.BellWarden!.Tick(.05, boss.Position, boss.Health, boss.MaxHealth, player.Position, true) == BellWardenEvent.CrackStarted
                : boss.Reliquary!.Tick(.05, boss.Health, boss.MaxHealth, player.Position, true) == ReliquaryEvent.ShiftStarted;
            Assert.IsTrue(changing);
            var early = BossGlowLightingProjection.Capture(null, [boss]).Single().Intensity;
            for (var time = 0d; time < 1.6; time += .05)
                if (kind == EnemyKind.BellWarden) boss.BellWarden!.Tick(.05, boss.Position, boss.Health, boss.MaxHealth, player.Position, true);
                else boss.Reliquary!.Tick(.05, boss.Health, boss.MaxHealth, player.Position, false);
            var late = BossGlowLightingProjection.Capture(null, [boss]).Single().Intensity;
            Assert.IsGreaterThan(calm.Intensity, early);
            Assert.IsGreaterThan(early, late, "the glow swells as the change nears its end");
        }
    }
}
