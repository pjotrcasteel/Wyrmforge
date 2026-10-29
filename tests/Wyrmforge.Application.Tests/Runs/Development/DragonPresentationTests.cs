using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class DragonPresentationTests
{
    private static RunSimulation Create(bool invulnerable = true) => new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(
        SelfPlayBuildCatalog.All.First().SelectedNodes,
        new DevelopmentHuntSetup(DragonId.Ashfang, false, 1, SpellId.FireBolt, 721, 402, 874, invulnerable));
    private static DragonState Dragon(RunSimulation run) => (DragonState)typeof(RunSimulation).GetField("dragon", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(run)!;
    private static void Invoke(RunSimulation run, string method, params object[] args) => typeof(RunSimulation).GetMethod(method, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(run, args);

    [TestMethod]
    public void TelegraphAndStrikeSignalsFollowAuthoritativeAttackWithoutChangingGeometry()
    {
        var run = Create(); var dragon = Dragon(run);
        var first = run.CreateSnapshot().Dragon!;
        Assert.AreEqual(dragon.Id, first.EntityId);
        Assert.AreEqual(-1, first.AttackElapsed);
        Invoke(run, "StartDragonAttack", dragon);
        var warning = run.CreateSnapshot().Dragon!;
        Assert.AreEqual(first.AttackSequence + 1, warning.AttackSequence);
        Assert.AreEqual(0, warning.TelegraphProgress, .000001);
        dragon.TelegraphRemaining *= .5;
        Assert.AreEqual(.5, run.CreateSnapshot().Dragon!.TelegraphProgress, .000001);
        Invoke(run, "ResolveDragonAttack", dragon);
        var strike = run.CreateSnapshot().Dragon!;
        Assert.AreEqual(0, strike.AttackElapsed, .000001);
        Assert.AreEqual(warning.AttackSequence, strike.AttackSequence);
        Assert.AreEqual(60, strike.Radius);
        Assert.AreEqual(dragon.BreathDirection.X, strike.DirectionX);
        Assert.AreEqual(dragon.BreathDirection.Y, strike.DirectionY);
    }

    [TestMethod]
    public void OnlyActualDefeatCreatesPersistentIdentityBearingCollapseAndResetClearsIt()
    {
        var run = Create(); var dragon = Dragon(run);
        Assert.IsNull(run.CreateSnapshot().DragonDefeat);
        dragon.Health = 0;
        Invoke(run, "DefeatDragon", dragon);
        var snapshot = run.CreateSnapshot();
        Assert.IsNull(snapshot.Dragon);
        Assert.AreEqual(dragon.Id, snapshot.DragonDefeat!.EntityId);
        Assert.AreEqual(dragon.Position.X, snapshot.DragonDefeat.X);
        Assert.AreEqual(0, snapshot.DragonDefeat.Health);
        Assert.AreEqual(snapshot.DragonDefeat, run.CreateSnapshot().DragonDefeat);
        Invoke(run, "ResetDragonHunt");
        Assert.IsNull(run.CreateSnapshot().DragonDefeat);
    }
    [TestMethod]
    public void LivePredatorLocksWarningAndAnEscapingPlayerAvoidsTheStrike()
    {
        var run=Create(false);var dragon=Dragon(run);
        var player=(PlayerState)typeof(RunSimulation).GetField("player",BindingFlags.Instance|BindingFlags.NonPublic)!.GetValue(run)!;
        dragon.Position=new Vector2D(100,200);player.Position=new Vector2D(200,200);dragon.AttackCooldown=0;
        Invoke(run,"UpdateAshfangCombat",dragon,.05);
        Assert.AreEqual("claw_right",run.CreateSnapshot().Dragon!.Action);
        var health=player.Health;player.Position=new Vector2D(100,400);
        for(var i=0;i<15;i++)Invoke(run,"UpdateAshfangCombat",dragon,.05);
        Invoke(run,"ResolvePlayerDamage");
        Assert.AreEqual(health,player.Health,.000001);
        Assert.AreEqual(1,run.CreateSnapshot().Dragon!.DirectionX,.000001);
        Assert.AreEqual("strike",run.CreateSnapshot().Dragon!.ActionPhase);
    }

    [TestMethod]
    public void LivePredatorHitsOnceThenExposesRecoveryInsteadOfDamageEveryFrame()
    {
        var run=Create(false);var dragon=Dragon(run);
        var player=(PlayerState)typeof(RunSimulation).GetField("player",BindingFlags.Instance|BindingFlags.NonPublic)!.GetValue(run)!;
        dragon.Position=new Vector2D(100,200);player.Position=new Vector2D(200,200);dragon.AttackCooldown=0;
        var health=player.Health;Invoke(run,"UpdateAshfangCombat",dragon,.05);
        for(var i=0;i<16;i++)Invoke(run,"UpdateAshfangCombat",dragon,.05);
        Invoke(run,"ResolvePlayerDamage");
        Assert.IsLessThan(health,player.Health);
        var afterHit=player.Health;
        for(var i=0;i<5;i++)Invoke(run,"UpdateAshfangCombat",dragon,.05);
        Assert.AreEqual("recover",run.CreateSnapshot().Dragon!.ActionPhase);
        Invoke(run,"ResolvePlayerDamage");
        Assert.AreEqual(afterHit,player.Health,.000001);
    }
    [TestMethod]
    public void AerialPassRemovesGroundTargetAndCreatesWarnedRainThenLands()
    {
        var run=Create();var dragon=Dragon(run);
        var hunt=(DragonHuntState)typeof(RunSimulation).GetField("dragonHuntState",BindingFlags.Instance|BindingFlags.NonPublic)!.GetValue(run)!;
        hunt.TickStage(10);
        typeof(RunSimulation).GetField("arenaWidth",BindingFlags.Instance|BindingFlags.NonPublic)!.SetValue(run,402d);
        typeof(RunSimulation).GetField("arenaHeight",BindingFlags.Instance|BindingFlags.NonPublic)!.SetValue(run,874d);
        Invoke(run,"UpdateAshfangFlight",dragon,8.01);
        Assert.AreEqual("takeoff",run.CreateSnapshot().Dragon!.FlightStage);
        Invoke(run,"UpdateAshfangFlight",dragon,1.4);
        var overhead=run.CreateSnapshot();
        Assert.AreEqual("overhead",overhead.Dragon!.FlightStage);Assert.IsFalse(overhead.Dragon.Targetable);
        Assert.IsTrue(overhead.HuntHazards!.Any(h=>h.FromAbove&&h.Progress==0));
        var targets=(bool)typeof(RunSimulation).GetProperty("HasCombatTargets",BindingFlags.Instance|BindingFlags.NonPublic)!.GetValue(run)!;
        Assert.IsFalse(targets);
        var health=dragon.Health;
        typeof(RunSimulation).GetMethod("DamageTarget",BindingFlags.Instance|BindingFlags.NonPublic)!.Invoke(run,[dragon,999d,null,null]);
        Assert.AreEqual(health,dragon.Health);
        Invoke(run,"UpdateAshfangFlight",dragon,4.8);
        Assert.AreEqual("land",run.CreateSnapshot().Dragon!.FlightStage);
        Invoke(run,"UpdateAshfangFlight",dragon,1.0);
        Assert.IsTrue(run.CreateSnapshot().Dragon!.Targetable);
        Invoke(run,"UpdateAshfangFlight",dragon,.5);
        Assert.AreEqual("recover",run.CreateSnapshot().Dragon!.FlightStage);
        Invoke(run,"UpdateAshfangFlight",dragon,1.2);
        Assert.AreEqual("ground",run.CreateSnapshot().Dragon!.FlightStage);
    }
}

