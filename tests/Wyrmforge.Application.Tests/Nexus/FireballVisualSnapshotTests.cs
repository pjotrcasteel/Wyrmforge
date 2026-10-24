using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class FireballVisualSnapshotTests
{
    [TestMethod]
    public void CreateSnapshot_PreparedMutationComposition_RemainsFrozenDuringTheHunt()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        simulation.PrepareFireballCoreLevel(3);
        simulation.PrepareFireballMutations(
            [FireballMutationId.MeteorHeart, FireballMutationId.Detonation, FireballMutationId.ScorchedEarth]);

        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        var snapshot = simulation.CreateSnapshot();

        Assert.IsNotNull(snapshot.FireballVisual);
        Assert.AreEqual(3, snapshot.FireballVisual.Level);
        Assert.AreEqual("meteor", snapshot.FireballVisual.CoreShape);
        Assert.IsTrue(snapshot.FireballVisual.Detonation);
        Assert.IsTrue(snapshot.FireballVisual.ScorchedEarth);
        simulation.PrepareFireballMutations([FireballMutationId.CinderNeedle]);
        Assert.AreEqual(snapshot.FireballVisual, simulation.CreateSnapshot().FireballVisual);
    }

    [TestMethod]
    public void CreateSnapshot_BurningGround_ReportsActualRadiusAndLifetimeWithoutGenericBurstDuplication()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        var ground = new BurningGroundState(new Vector2D(80, 90), 5, 1.25, 1.20);
        var field = typeof(RunSimulation).GetField("burningGrounds", BindingFlags.Instance | BindingFlags.NonPublic)!;
        ((List<BurningGroundState>)field.GetValue(simulation)!).Add(ground);

        var snapshot = simulation.CreateSnapshot();

        Assert.AreEqual(1, snapshot.BurningGrounds.Count);
        Assert.AreEqual(ground.EffectiveRadius, snapshot.BurningGrounds[0].Radius, .00001);
        Assert.AreEqual(ground.RemainingSeconds, snapshot.BurningGrounds[0].RemainingSeconds, .00001);
        Assert.AreEqual(0, snapshot.EssenceBursts.Count, "A real hazard should not be disguised as a short-lived essence burst.");
    }
}
