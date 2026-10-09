using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class EncounterDirectorTests
{
    [TestMethod]
    public void Start_BeginsAtPressureWithoutElapsedTimeEscalation()
    {
        var director = new EncounterDirector();

        director.Start(EnemyEncounterPattern.Mixed, 1);
        director.Tick(120);

        Assert.AreEqual(EncounterPhase.Pressure, director.Phase);
        Assert.IsFalse(director.Directive.SuppressSpawns);
    }

    [TestMethod]
    public void RegisterProgress_HalfObjective_OpensBreathingRoomThenSurge()
    {
        var director = new EncounterDirector();
        director.Start(EnemyEncounterPattern.Mixed, 1);

        director.RegisterProgress(4, 16);
        Assert.AreEqual(EncounterPhase.Escalation, director.Phase);

        director.RegisterProgress(8, 16);
        Assert.AreEqual(EncounterPhase.BreathingRoom, director.Phase);
        Assert.IsTrue(director.Directive.SuppressSpawns);

        director.Tick(EncounterDirector.BreathingRoomSeconds);
        Assert.AreEqual(EncounterPhase.Surge, director.Phase);
        Assert.IsFalse(director.Directive.SuppressSpawns);
    }

    [TestMethod]
    public void RegisterProgress_Climax_QueuesDepthAppropriateComplication()
    {
        var director = new EncounterDirector();
        director.Start(EnemyEncounterPattern.Mixed, 2);
        director.RegisterProgress(4, 16);
        director.RegisterProgress(8, 16);
        director.Tick(EncounterDirector.BreathingRoomSeconds);
        Assert.IsTrue(director.TryTakeInsert(out var surgeInsert));
        Assert.AreEqual(EnemyKind.RiftStalker, surgeInsert);

        director.RegisterProgress(13, 16);

        Assert.AreEqual(EncounterPhase.Climax, director.Phase);
        Assert.IsTrue(director.TryTakeInsert(out var climaxInsert));
        Assert.AreEqual(EnemyKind.Brute, climaxInsert);
        Assert.IsTrue(director.Directive.BatchSizeBonus > 0);
        Assert.IsTrue(director.Directive.SpawnIntervalMultiplier < 1);
    }

    [TestMethod]
    public void Swarm_Climax_PreservesMassIdentityAndAddsBruteOnlyWhenEligible()
    {
        var depthOne = new EncounterDirector();
        depthOne.Start(EnemyEncounterPattern.Swarm, 1);
        depthOne.RegisterProgress(5, 20);
        depthOne.RegisterProgress(10, 20);
        depthOne.Tick(EncounterDirector.BreathingRoomSeconds);
        depthOne.RegisterProgress(16, 20);

        Assert.AreEqual(EncounterPhase.Climax, depthOne.Phase);
        Assert.IsFalse(depthOne.TryTakeInsert(out _));
        Assert.AreEqual(2, depthOne.Directive.BatchSizeBonus);

        var depthTwo = new EncounterDirector();
        depthTwo.Start(EnemyEncounterPattern.Swarm, 2);
        depthTwo.RegisterProgress(6, 24);
        depthTwo.RegisterProgress(12, 24);
        depthTwo.Tick(EncounterDirector.BreathingRoomSeconds);
        depthTwo.RegisterProgress(20, 24);

        Assert.IsTrue(depthTwo.TryTakeInsert(out var insert));
        Assert.AreEqual(EnemyKind.Brute, insert);
    }

    [TestMethod]
    public void StalkerPressure_EscalationAndSurge_QueueAmbusherComplications()
    {
        var director = new EncounterDirector();
        director.Start(EnemyEncounterPattern.StalkerPressure, 1);

        director.RegisterProgress(3, 12);
        Assert.IsTrue(director.TryTakeInsert(out var escalationInsert));
        Assert.AreEqual(EnemyKind.RiftStalker, escalationInsert);

        director.RegisterProgress(6, 12);
        director.Tick(EncounterDirector.BreathingRoomSeconds);

        Assert.IsTrue(director.TryTakeInsert(out var surgeInsert));
        Assert.AreEqual(EnemyKind.RiftStalker, surgeInsert);
    }
    [TestMethod]
    public void Start_FinalTrailAtDepthOne_LeadsWithBrute()
    {
        var director = new EncounterDirector();
        director.Start(EnemyEncounterPattern.Mixed, 1, 4);
        Assert.IsTrue(director.TryTakeInsert(out var first));
        Assert.AreEqual(EnemyKind.Brute, first);
        Assert.IsFalse(director.TryTakeInsert(out _));
    }
}
