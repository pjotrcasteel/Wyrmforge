using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class BestiaryRecordTests
{
    [TestMethod]
    public void Summary_ListsEverySpawnedKind_EvenWhenNoneFell()
    {
        var (simulation, _, enemies) = Encounter();
        for (var time = 0d; time < 10 && Field<int>(simulation, "nodeSpawnCount") < 4; time += 0.05) Invoke(simulation, "UpdateSpawn", 0.05, 390d, 700d);
        var spawnedKinds = enemies.Concat(Field<List<EnemyState>>(simulation, "submergedWraiths")).Select(enemy => enemy.Kind).Distinct().Order().ToArray();
        Assert.IsNotEmpty(spawnedKinds);

        var records = simulation.CreateSummary().EnemyRecords;

        CollectionAssert.AreEqual(spawnedKinds, records.Select(record => record.Kind).ToArray());
        Assert.IsTrue(records.All(record => record.Kills == 0));
    }

    [TestMethod]
    public void Summary_CountsKillsPerKind_AndSlainElites()
    {
        var (simulation, player, enemies) = Encounter();
        var hound = new EnemyState(700, player.Position + new Vector2D(300, 0), 12, 20, 0, EnemyKind.MireHound);
        var otherHound = new EnemyState(701, player.Position + new Vector2D(-300, 0), 12, 20, 0, EnemyKind.MireHound);
        var elite = new EnemyState(702, player.Position + new Vector2D(0, 300), 12, 20, 0, EnemyKind.Penitent) { Elite = EliteAffix.Oathshield };
        enemies.AddRange([hound, otherHound, elite]);

        Kill(simulation, hound);
        Kill(simulation, otherHound);
        Kill(simulation, elite);
        Kill(simulation, elite);

        var summary = simulation.CreateSummary();
        Assert.AreEqual(2, summary.EnemyRecords.Single(record => record.Kind == EnemyKind.MireHound).Kills);
        Assert.AreEqual(1, summary.EnemyRecords.Single(record => record.Kind == EnemyKind.Penitent).Kills, "A corpse cannot be counted twice.");
        CollectionAssert.AreEqual(new[] { EliteAffix.Oathshield }, summary.ElitesSlain.ToArray());
    }

    private static RunSimulation Create()
    {
        var random = new FirstRandomSource();
        return new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
    }

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Encounter()
    {
        var simulation = Create();
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
        var player = Field<PlayerState>(simulation, "player");
        player.Health = player.MaxHealth;
        return (simulation, player, Field<List<EnemyState>>(simulation, "enemies"));
    }

    private static void Kill(RunSimulation simulation, EnemyState enemy) =>
        Invoke(simulation, "DamageTarget", enemy, enemy.Health + 1, null, null);

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
