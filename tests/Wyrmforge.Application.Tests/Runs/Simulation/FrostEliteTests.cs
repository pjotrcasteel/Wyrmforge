using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

/// <summary>Frost F4: each Frost champion sharpens its own box-in rule rather than borrowing a Fire elite's.</summary>
[TestClass]
public sealed class FrostEliteTests
{
    [TestMethod]
    public void EveryFrostHunterHasItsOwnChampion()
    {
        var frost = new[] { EnemyKind.FrostlingPackling, EnemyKind.Shardcaster, EnemyKind.WhitefangStalker, EnemyKind.CairnSentinel,
            EnemyKind.HoarfrostCantor, EnemyKind.MirrorWisp };
        foreach (var kind in frost) Assert.IsNotNull(EliteAffixCatalog.TryFor(kind), kind.ToString());
        Assert.IsNull(EliteAffixCatalog.TryFor(EnemyKind.MirrorDouble), "An image never rolls elite.");
    }

    [TestMethod]
    public void Rimehowl_BiteFreezesDeeper()
    {
        var (simulation, player, enemies) = Encounter();
        var packling = new EnemyState(500, player.Position + new Vector2D(110, 0), 9, 1000, 60, EnemyKind.FrostlingPackling) { Elite = EliteAffix.Rimehowl };
        enemies.Add(packling);
        for (var time = 0d; time < 4 && !packling.Packling!.BiteLanded; time += 0.05) Step(simulation, 0.05);
        Assert.IsTrue(packling.Packling!.BiteLanded);
        Assert.AreEqual(FrostlingPacklingBehaviorState.BiteChill + RunSimulation.RimehowlExtraChill, player.Chill.Stacks);
    }

    [TestMethod]
    public void Splinterwright_SeedsBloomsAlongTheWholeLane()
    {
        var (simulation, player, enemies) = Encounter(graceElapsed: true);
        enemies.Add(new EnemyState(500, player.Position + new Vector2D(260, 0), 11, 1000, 0, EnemyKind.Shardcaster) { Elite = EliteAffix.Splinterwright });
        var most = 0;
        for (var time = 0d; time < 6 && most == 0; time += 0.05)
        {
            Step(simulation, 0.05);
            most = Math.Max(most, simulation.CreateSnapshot().SplinterBlooms.Count);
        }
        Assert.IsGreaterThanOrEqualTo(3, most, "Blooms seed the lane, not only its end.");
    }

    [TestMethod]
    public void Twinfang_LeapsASecondTimeBeforeItRests()
    {
        var (simulation, player, enemies) = Encounter();
        SetField(simulation, "playerHeading", new Vector2D(1, 0));
        var stalker = new EnemyState(500, player.Position + new Vector2D(0, -200), 13, 1000, 70, EnemyKind.WhitefangStalker) { Elite = EliteAffix.Twinfang };
        enemies.Add(stalker);
        Assert.IsTrue(stalker.Whitefang!.Twinleap);
        var windups = 0;
        var previous = stalker.Whitefang.Phase;
        for (var time = 0d; time < 4 && windups < 3; time += 0.05)
        {
            Step(simulation, 0.05);
            if (stalker.Whitefang.Phase == WhitefangPhase.Windup && previous != WhitefangPhase.Windup) windups++;
            if (stalker.Whitefang.Phase == WhitefangPhase.Prowl && windups > 0) break;
            previous = stalker.Whitefang.Phase;
        }
        Assert.AreEqual(2, windups, "Exactly two crouches per feint.");
    }

    [TestMethod]
    public void Barrowlord_StampRollsASecondDelayedRing()
    {
        var (simulation, player, enemies) = Encounter();
        var sentinel = new EnemyState(500, player.Position + new Vector2D(120, 0), 20, 1000, 0, EnemyKind.CairnSentinel) { Elite = EliteAffix.Barrowlord };
        enemies.Add(sentinel);
        while (sentinel.Sentinel!.Phase != CairnPhase.Brace) Step(simulation, 0.05);
        var start = simulation.Health;
        var mostRings = 0;
        for (var time = 0d; time < CairnSentinelBehaviorState.BraceSeconds + CairnSentinelBehaviorState.RingSeconds + RunSimulation.BarrowlordEchoDelaySeconds + 0.3; time += 0.05)
        {
            Step(simulation, 0.05);
            mostRings = Math.Max(mostRings, simulation.CreateSnapshot().AvalancheRings.Count);
        }
        var impact = EliteAffixCatalog.Get(EliteAffix.Barrowlord).ImpactMultiplier;
        Assert.AreEqual(2, mostRings);
        Assert.AreEqual(2 * CairnSentinelBehaviorState.RingDamage * impact, start - simulation.Health, 0.001, "Standing in front takes both waves.");
    }

    [TestMethod]
    public void Choirwarden_HymnReachesFartherThanAPlainCantor()
    {
        var (simulation, player, enemies) = Encounter();
        var cantor = new EnemyState(500, player.Position + new Vector2D(300, 0), 13, 1000, 0, EnemyKind.HoarfrostCantor) { Elite = EliteAffix.Choirwarden };
        var far = new EnemyState(501, cantor.Position + new Vector2D(0, HoarfrostCantorBehaviorState.HymnRadius * 1.5), 11, 1000, 0);
        var farther = new EnemyState(502, cantor.Position - new Vector2D(0, HoarfrostCantorBehaviorState.HymnRadius * 1.5), 11, 1000, 0);
        enemies.AddRange([cantor, far, farther]);
        for (var time = 0d; time < 6 && cantor.Cantor!.Phase != CantorPhase.Chant; time += 0.05) Step(simulation, 0.05);
        Assert.AreEqual(CantorVerse.RimeHymn, cantor.Cantor!.Verse);
        Assert.AreEqual(HoarfrostCantorBehaviorState.HymnRadius * RunSimulation.ChoirwardenHymnMultiplier,
            simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == 500).Telegraph!.Radius, 0.001);
        while (cantor.Cantor.Phase == CantorPhase.Chant) Step(simulation, 0.05);
        Assert.IsGreaterThan(0d, far.RimeArmor);
    }

    [TestMethod]
    public void Thousandface_LeavesTwoDoublesPerStep()
    {
        var (simulation, player, enemies) = Encounter();
        var wisp = new EnemyState(500, player.Position + new Vector2D(250, 0), 11, 1000, 0, EnemyKind.MirrorWisp) { Elite = EliteAffix.Thousandface };
        enemies.Add(wisp);
        while (wisp.Wisp!.Phase != WispPhase.Shimmer) Step(simulation, 0.05);
        while (wisp.Wisp.Phase == WispPhase.Shimmer) Step(simulation, 0.05);
        Assert.AreEqual(2, enemies.Count(enemy => enemy.Kind == EnemyKind.MirrorDouble));
        Assert.AreEqual(2, simulation.ReflectionDoubles);
    }

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Encounter(bool graceElapsed = false)
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
        if (graceElapsed) SetField(simulation, "encounterSeconds", EnemyStagePressure.RangedGraceSeconds);
        return (simulation, Field<PlayerState>(simulation, "player"), Field<List<EnemyState>>(simulation, "enemies"));
    }

    private static void Step(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Field<PlayerState>(simulation, "player").Chill.Tick(delta);
        Invoke(simulation, "UpdateEnemies", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void SetField(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
