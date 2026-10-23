using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class DragonPresentationTests
{
    private static RunSimulation Create() => new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(
        SelfPlayBuildCatalog.All.First().SelectedNodes,
        new DevelopmentHuntSetup(DragonId.Ashfang, false, 1, SpellId.FireBolt, 721, 402, 874, true));
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
}
