using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class AshfangGroundFirePatchTests
{
    [TestMethod]
    public void BreathScorch_BurnsInsideItsExactRadius_UntilItCools()
    {
        var patch = new AshfangGroundFirePatch(12, new Vector2D(100, 200));
        Assert.IsTrue(patch.Burns(new Vector2D(134, 200)));
        Assert.IsFalse(patch.Burns(new Vector2D(134.01, 200)));
        patch.Advance(AshfangGroundFirePatch.HotSeconds);
        Assert.IsFalse(patch.Burning);
        Assert.IsFalse(patch.Burns(new Vector2D(100, 200)), "Cooling marks must not deal invisible damage.");
        Assert.IsFalse(patch.Expired, "The scorched-earth visual must outlive the damaging fire.");
        patch.Advance(AshfangGroundFirePatch.VisibleSeconds);
        Assert.IsTrue(patch.Expired);
    }

    [TestMethod]
    public void RekindlingExistingPatch_RestartsItsHotPhaseWithoutAddingAnotherPatch()
    {
        var patch = new AshfangGroundFirePatch(1, Vector2D.Zero);
        patch.Advance(AshfangGroundFirePatch.HotSeconds + 0.1);
        Assert.IsFalse(patch.Burning);
        patch.Rekindle();
        Assert.IsTrue(patch.Burning);
        Assert.AreEqual(0, patch.AgeSeconds);
    }

    [TestMethod]
    public void RealSimulation_OverlappingPatchesDamageOnlyOnce_AndCoolingMarksAreSafe()
    {
        var random = new SeededRandomSource(73);
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        var player = (PlayerState)typeof(RunSimulation).GetField("player", BindingFlags.Instance | BindingFlags.NonPublic)!
            .GetValue(simulation)!;
        var center = new Vector2D(200, 200);
        player.Position = center;

        Invoke(simulation, "RegisterAshfangGroundFire", center);
        Invoke(simulation, "RegisterAshfangGroundFire", new Vector2D(206, 200));
        Assert.HasCount(1, simulation.CreateSnapshot().AshfangGroundFires, "A repeated scorch must rekindle, not stack.");
        Invoke(simulation, "RegisterAshfangGroundFire", new Vector2D(225, 200));
        Assert.HasCount(2, simulation.CreateSnapshot().AshfangGroundFires);
        Assert.IsTrue(simulation.CreateSnapshot().AshfangGroundFires.All(patch => patch.Burning));

        var startHealth = player.Health;
        Invoke(simulation, "BeginPlayerDamageFrame", 0.05d);
        Invoke(simulation, "UpdateAshfangGroundFires", 0.05d);
        Invoke(simulation, "ResolvePlayerDamage");
        Assert.IsTrue(startHealth - player.Health is > 0 and < 10,
            "Active fire must damage the hunter once, without stacking into a boss-sized hit.");

        player.Position = new Vector2D(500, 400);
        Invoke(simulation, "BeginPlayerDamageFrame", 2.8d);
        Invoke(simulation, "UpdateAshfangGroundFires", 2.8d);
        Invoke(simulation, "ResolvePlayerDamage");
        Assert.IsTrue(simulation.CreateSnapshot().AshfangGroundFires.All(patch => !patch.Burning));
        player.Position = center;
        var afterCoolingHealth = player.Health;
        Invoke(simulation, "BeginPlayerDamageFrame", 0.55d);
        Invoke(simulation, "UpdateAshfangGroundFires", 0.55d);
        Invoke(simulation, "ResolvePlayerDamage");
        Assert.AreEqual(afterCoolingHealth, player.Health, "Visible charcoal is not a hidden damaging floor.");
    }

    private static void Invoke(RunSimulation simulation, string name, params object[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);

    [TestMethod]
    public void ZeroOrNegativeDelta_DoesNotAdvanceFire()
    {
        var patch = new AshfangGroundFirePatch(1, Vector2D.Zero);
        patch.Advance(0);
        patch.Advance(-2);
        Assert.AreEqual(0, patch.AgeSeconds);
    }
}
