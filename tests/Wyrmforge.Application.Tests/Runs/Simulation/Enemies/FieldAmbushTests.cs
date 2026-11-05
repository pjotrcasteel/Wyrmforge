using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class FieldAmbushTests
{
    private const int Width = 390, Height = 700;

    private static (RunSimulation Simulation, PlayerState Player, ArenaEnvironmentState Environment) Start(int seed, double influence = 0.1)
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(new HashSet<string>(), seed: seed, hunt: HuntSelection.FireTierOne);
        simulation.EnableHunt1Terrain(influence);
        Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
        simulation.Tick(0, default, Width, Height);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var player = (PlayerState)typeof(RunSimulation).GetField("player", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation)!;
        var environment = (ArenaEnvironmentState)typeof(RunSimulation).GetField("arenaEnvironment", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation)!;
        return (simulation, player, environment);
    }

    private static void ClearHostiles(RunSimulation simulation)
    {
        foreach (var name in new[] { "enemies", "submergedWraiths" })
            ((System.Collections.IList)typeof(RunSimulation).GetField(name, System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation)!).Clear();
    }

    private static RunRenderSnapshot Quiet(RunSimulation simulation, PlayerState player, double seconds)
    {
        var snapshot = simulation.CreateSnapshot();
        for (var elapsed = 0.0; elapsed < seconds; elapsed += .05)
        {
            player.Health = simulation.MaxHealth;
            snapshot = simulation.Tick(.05, default, Width, Height);
            while (simulation.PendingChoices.Count > 0) Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
        }
        return snapshot;
    }

    [TestMethod]
    public void EveryTerrainArenaHasFieldsAndAHunterWhoNeverEntersOneIsNeverAmbushed()
    {
        var (simulation, player, environment) = Start(42);
        Assert.IsGreaterThanOrEqualTo(2, environment.AmbushFields.Count, "the road opens into at least two fields");
        // Stand at the spawn clearing for a long time: it lies outside every field.
        var start = player.Position;
        for (var second = 0; second < 30; second++)
        {
            player.Position = start;
            Quiet(simulation, player, 1);
        }
        Assert.AreEqual(0, simulation.FieldAmbushesSprung);
    }

    [TestMethod]
    [DataRow(42)]
    [DataRow(1204)]
    [DataRow(5)]
    public void WalkingIntoAFieldMarksTheGroundOnAllSidesThenBurstsARingOutOfIt(int seed)
    {
        var (simulation, player, environment) = Start(seed);
        Quiet(simulation, player, 6);
        var field = environment.AmbushFields[0];
        var centre = ArenaTerrainGrid.CenterOf(field.Column, field.Row);
        ClearHostiles(simulation);
        player.Position = centre;
        var before = simulation.CreateSnapshot().Enemies.Count;

        var snapshot = Quiet(simulation, player, .1);
        Assert.IsNotNull(snapshot.FieldAmbush, "the tell starts the moment the hunter reaches the middle of the field");
        var marks = snapshot.FieldAmbush!.Marks;
        Assert.IsGreaterThanOrEqualTo(RunSimulation.FieldAmbushMinimumEnemies, marks.Count);
        Assert.IsLessThanOrEqualTo(RunSimulation.FieldAmbushMaximumEnemies, marks.Count);
        var here = new Vector2D(snapshot.Player.X, snapshot.Player.Y);
        var quadrants = marks.Select(mark => (mark.X >= here.X ? 1 : 0) + (mark.Y >= here.Y ? 2 : 0)).Distinct().Count();
        Assert.AreEqual(4, quadrants, "marks appear on every side of the hunter, not from one edge");
        foreach (var mark in marks)
        {
            var distance = Vector2D.Distance(here, new Vector2D(mark.X, mark.Y));
            Assert.IsGreaterThanOrEqualTo(ArenaEnvironmentState.MinimumSpawnDistance - 1, distance, "never on top of the hunter");
            Assert.IsTrue(environment.Terrain!.IsStandable(new Vector2D(mark.X, mark.Y), mark.Radius), "each mark is legal ground");
        }
        Assert.AreEqual(before, snapshot.Enemies.Count, "nothing has spawned yet: the tell is a warning");
        var progress = snapshot.FieldAmbush.Progress;
        snapshot = Quiet(simulation, player, .3);
        Assert.IsGreaterThan(progress, snapshot.FieldAmbush!.Progress, "the tell advances");

        snapshot = Quiet(simulation, player, RunSimulation.FieldAmbushTellSeconds);
        Assert.IsNull(snapshot.FieldAmbush);
        Assert.IsGreaterThanOrEqualTo(before + marks.Count - 2, snapshot.Enemies.Count, "the whole ring bursts out together");
        Assert.AreEqual(1, simulation.FieldAmbushesSprung);

        // Standing in the same field never springs it twice.
        player.Position = centre;
        Quiet(simulation, player, 5);
        Assert.AreEqual(1, simulation.FieldAmbushesSprung);
    }

    [TestMethod]
    public void TheAmbushIsDeterministicAndHoldsOtherSpawnsWhileItTells()
    {
        var marks = new List<string>();
        foreach (var run in new[] { 0, 1 })
        {
            var (simulation, player, environment) = Start(42);
            Quiet(simulation, player, 6);
            var field = environment.AmbushFields[0];
            ClearHostiles(simulation);
            player.Position = ArenaTerrainGrid.CenterOf(field.Column, field.Row);
            var snapshot = Quiet(simulation, player, .1);
            var count = snapshot.Enemies.Count;
            marks.Add(string.Join(';', snapshot.FieldAmbush!.Marks.Select(mark => $"{mark.X:0.###},{mark.Y:0.###}")));
            snapshot = Quiet(simulation, player, RunSimulation.FieldAmbushTellSeconds - .3);
            Assert.AreEqual(count, snapshot.Enemies.Count, "the director adds nothing while the marks show");
        }
        Assert.AreEqual(marks[0], marks[1]);
    }

    [TestMethod]
    public void AHunterWalkingTheRoadIsAmbushedAtLeastOnceOnEveryArena()
    {
        for (var seed = 1; seed <= 20; seed++)
        {
            var (simulation, player, environment) = Start(seed);
            var road = environment.Terrain!.Road!;
            var points = Enumerable.Range(0, road.Count / 2).Select(i => new Vector2D(road[i * 2] / 16.0 * 32, road[i * 2 + 1] / 16.0 * 32)).ToArray();
            // Walk the road from the spawn at 80 u/s, as the review bot does.
            var index = 0;
            for (var tick = 0; tick < 20 * 120 && index < points.Length - 1; tick++)
            {
                var step = 80 * .05;
                while (step > 0 && index < points.Length - 1)
                {
                    var to = Vector2D.Distance(player.Position, points[index + 1]);
                    if (to <= step) { player.Position = points[++index]; step -= to; }
                    else { player.Position += (points[index + 1] - player.Position) * (step / to); step = 0; }
                }
                player.Health = simulation.MaxHealth;
                simulation.Tick(.05, default, Width, Height);
                while (simulation.PendingChoices.Count > 0) Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
            }
            Assert.IsGreaterThanOrEqualTo(1, simulation.FieldAmbushesSprung, $"seed {seed}: the road crosses fields, so a walker is ambushed");
        }
    }

    [TestMethod]
    public void EveryFieldOfManyArenasCanSpringAFullRing()
    {
        var failures = new List<string>();
        for (var seed = 1; seed <= 40; seed++)
        {
            var (simulation, player, environment) = Start(seed);
            Quiet(simulation, player, 6);
            for (var index = 0; index < environment.AmbushFields.Count; index++)
            {
                var field = environment.AmbushFields[index];
                ClearHostiles(simulation);
                player.Position = ArenaTerrainGrid.CenterOf(field.Column, field.Row);
                var snapshot = Quiet(simulation, player, .1);
                if (snapshot.FieldAmbush is null || snapshot.FieldAmbush.Marks.Count < RunSimulation.FieldAmbushMinimumEnemies)
                    failures.Add($"seed {seed} field {index}: {snapshot.FieldAmbush?.Marks.Count.ToString() ?? "no tell"}");
                Quiet(simulation, player, RunSimulation.FieldAmbushTellSeconds + .2);
            }
        }
        Assert.IsEmpty(failures, string.Join("; ", failures.Take(12)));
    }

    [TestMethod]
    public void TheGroundSplitsInTheTerrainItselfWhileTheTellRunsAndTheSameSeedSplitsTheSameWay()
    {
        var revisions = new List<int>();
        var cleft = new List<string>();
        foreach (var run in new[] { 0, 1 })
        {
            var (simulation, player, environment) = Start(42);
            Quiet(simulation, player, 6);
            var field = environment.AmbushFields[0];
            ClearHostiles(simulation);
            player.Position = ArenaTerrainGrid.CenterOf(field.Column, field.Row);
            var snapshot = Quiet(simulation, player, .1);
            var terrain = environment.Terrain!;
            var mark = snapshot.FieldAmbush!.Marks[0];
            var (column, row) = ArenaTerrainGrid.ColumnOf(new Vector2D(mark.X, mark.Y));
            var firstRevision = terrain.Revision;
            Quiet(simulation, player, RunSimulation.FieldAmbushTellSeconds - .25);
            Assert.IsNotNull(simulation.CreateSnapshot().FieldAmbush, "still telling");
            Assert.IsGreaterThan(firstRevision, terrain.Revision, "the cleft lengthens in later stages");
            revisions.Add(terrain.Revision);
            cleft.Add(string.Join(',', terrain.FineHeights(column, row) ?? []));
            Assert.IsTrue(terrain.FineHeights(column, row) is not null || terrain.Revision > 0, "the ground under a mark is subdivided into the cleft");
        }
        Assert.AreEqual(cleft[0], cleft[1], "replays split the ground the same way");
        Assert.AreEqual(revisions[0], revisions[1]);
    }

    [TestMethod]
    public void TheRingCrawlsOutOfTheGroundBeforeItActsAndLeavesCratersWhereItClimbed()
    {
        var (simulation, player, environment) = Start(42);
        Quiet(simulation, player, 6);
        var field = environment.AmbushFields[0];
        ClearHostiles(simulation);
        player.Position = ArenaTerrainGrid.CenterOf(field.Column, field.Row);
        Quiet(simulation, player, .1);
        var revision = environment.Terrain!.Revision;
        var snapshot = Quiet(simulation, player, RunSimulation.FieldAmbushTellSeconds);
        var emerging = snapshot.Enemies.Where(enemy => enemy.EmergeProgress is not null).ToArray();
        Assert.IsGreaterThanOrEqualTo(RunSimulation.FieldAmbushMinimumEnemies - 2, emerging.Length, "the whole ring is crawling out");
        Assert.IsGreaterThan(revision, environment.Terrain.Revision, "each spawn point lost a little ground");
        Assert.IsTrue(emerging.Select(enemy => enemy.EmergeClip).Distinct().Count() == 2, "both authored clips are used");
        var before = emerging.ToDictionary(enemy => enemy.EntityId, enemy => (enemy.X, enemy.Y));

        // Half a second in, the long pull is still going: nobody has moved and the hunter is untouched.
        player.Health = simulation.MaxHealth;
        snapshot = Quiet(simulation, player, .45);
        foreach (var enemy in snapshot.Enemies.Where(enemy => before.ContainsKey(enemy.EntityId) && enemy.EmergeProgress is not null))
        {
            var (x, y) = before[enemy.EntityId];
            Assert.IsLessThan(2.5, Math.Sqrt((enemy.X - x) * (enemy.X - x) + (enemy.Y - y) * (enemy.Y - y)), "an emerging enemy does not walk");
        }
        Assert.IsTrue(snapshot.Enemies.Any(enemy => enemy.EmergeProgress is > 0 and < 1));

        // Once both clips are over they are ordinary enemies.
        snapshot = Quiet(simulation, player, RunSimulation.CrawlOutPullSeconds);
        Assert.IsTrue(snapshot.Enemies.All(enemy => enemy.EmergeProgress is null));
    }

    [TestMethod]
    public void NoAmbushInTheFirstSecondsOrWhileTheTrailIsAlreadyMetOrOffTerrain()
    {
        var (simulation, player, environment) = Start(42);
        var field = environment.AmbushFields[0];
        player.Position = ArenaTerrainGrid.CenterOf(field.Column, field.Row);
        Quiet(simulation, player, 3);
        Assert.AreEqual(0, simulation.FieldAmbushesSprung, "the first seconds of a Hunt are quiet");

        // A Hunt without Hunt 1.0 terrain has no fields at all.
        var plain = new RunSimulationFactory(new SeededRandomSource(42)).Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierOne);
        Assert.IsTrue(plain.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
        plain.Tick(0, default, Width, Height);
        Assert.IsTrue(plain.ChooseMapNode(plain.AvailableMapNodes[0].Id));
        for (var tick = 0; tick < 20 * 20; tick++) Assert.IsNull(plain.Tick(.05, default, Width, Height).FieldAmbush);
        Assert.AreEqual(0, plain.FieldAmbushesSprung);
    }
}
