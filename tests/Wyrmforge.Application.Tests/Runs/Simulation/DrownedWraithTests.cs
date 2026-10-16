using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class DrownedWraithTests
{
    [TestMethod]
    public void SubmergedWraith_IsUntargetableAndHarmless_UntilItSurfacesWithATelegraph()
    {
        var (simulation, player, enemies, submerged) = Encounter();
        var wraith = Wraith(player.Position + new Vector2D(100, 0));
        submerged.Add(wraith);

        var snapshot = simulation.CreateSnapshot();
        Assert.IsEmpty(snapshot.Enemies, "Under the water it is not an enemy anything can hit.");
        Assert.HasCount(1, snapshot.WraithRipples);
        Assert.IsFalse(snapshot.WraithRipples[0].Emerging);

        var sawEmergingRipple = false;
        var sawClaw = false;
        for (var time = 0d; time < 6 && !sawClaw; time += 0.05)
        {
            Step(simulation, 0.05);
            if (enemies.Count == 0) Assert.AreEqual(player.MaxHealth, player.Health, "Never damages while hidden.");
            var frame = simulation.CreateSnapshot();
            sawEmergingRipple |= frame.WraithRipples.Any(ripple => ripple.Emerging);
            if (frame.Enemies.SingleOrDefault()?.Telegraph is { Kind: "claw" } claw)
            {
                sawClaw = true;
                Assert.AreEqual(DrownedWraithBehaviorState.StrikeReach, claw.Radius);
                Assert.IsLessThan(1d, frame.Enemies.Single().Opacity, "It is still rising out of the water.");
                Assert.AreEqual(1, Invoke<int>(simulation, "CommittedThreatCount"));
            }
        }
        Assert.IsTrue(sawEmergingRipple, "A fixed ripple marks the rising spot first.");
        Assert.IsTrue(sawClaw, "The claw is telegraphed once it has surfaced.");
        Assert.Contains(wraith, enemies);
        Assert.IsEmpty(submerged);
    }

    [TestMethod]
    public void Claw_HitsInFront_ThenTheWraithSinksAgain()
    {
        var (simulation, player, enemies, submerged) = Encounter();
        var wraith = Wraith(player.Position + new Vector2D(100, 0));
        submerged.Add(wraith);
        var health = player.Health;
        for (var time = 0d; time < 8 && wraith.DrownedWraith!.Phase != DrownedWraithPhase.Exposed; time += 0.05)
        {
            Step(simulation, 0.05);
            // The hunter stays put inside the wedge so the strike lands.
        }
        Assert.AreEqual(DrownedWraithPhase.Exposed, wraith.DrownedWraith!.Phase);
        Assert.AreEqual(health - DrownedWraithBehaviorState.StrikeDamage, player.Health, 0.001);

        for (var time = 0d; time < 3 && enemies.Count > 0; time += 0.05)
        {
            Step(simulation, 0.05);
            player.Health = player.MaxHealth;
        }
        Assert.IsEmpty(enemies, "After the punish window it fades back under the water.");
        Assert.Contains(wraith, submerged);
    }

    [TestMethod]
    public void Claw_MissesAHunterWhoLeftTheWedge()
    {
        var (simulation, player, _, submerged) = Encounter();
        var wraith = Wraith(player.Position + new Vector2D(100, 0));
        submerged.Add(wraith);
        while (wraith.DrownedWraith!.Phase != DrownedWraithPhase.Windup) Step(simulation, 0.05);
        // Dodge sideways out of the locked arc during the 0.4s windup.
        player.Position = wraith.Position + new Vector2D(0, 90);
        var health = player.Health;
        while (wraith.DrownedWraith.Phase == DrownedWraithPhase.Windup) Step(simulation, 0.05);
        Assert.AreEqual(health, player.Health);
    }

    [TestMethod]
    public void SubmergedWraiths_StillCountTowardTheActiveCapAndClearing()
    {
        var (simulation, player, _, submerged) = Encounter();
        submerged.Add(Wraith(player.Position + new Vector2D(300, 0)));
        Assert.AreEqual(1, Property<int>(simulation, "HostileCount"), "A node is not clear while a wraith is under the water.");
    }

    [TestMethod]
    public void Wraiths_OnlyLiveWhereTheBriefPlacesThem()
    {
        Assert.IsTrue(EnemyCatalog.Get(EnemyKind.DrownedWraith).HabitatOnly, "Legacy pattern plans never field a wraith.");
        Assert.IsFalse(EnemyHabitatProfile.Allows(WyrmrealmHabitat.Outskirts, EnemyKind.DrownedWraith));
        Assert.IsTrue(EnemyHabitatProfile.Allows(WyrmrealmHabitat.FloodedCloister, EnemyKind.DrownedWraith));
    }

    private static EnemyState Wraith(Vector2D position) =>
        new(600, position, 12, 40, 70, EnemyKind.DrownedWraith);

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies, List<EnemyState> Submerged) Encounter()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
        var player = Field<PlayerState>(simulation, "player");
        player.Health = player.MaxHealth;
        return (simulation, player, Field<List<EnemyState>>(simulation, "enemies"), Field<List<EnemyState>>(simulation, "submergedWraiths"));
    }

    private static void Step(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Invoke(simulation, "UpdateEnemies", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static T Property<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);

    private static T Invoke<T>(RunSimulation simulation, string name, params object?[] arguments) =>
        (T)typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments)!;
}
