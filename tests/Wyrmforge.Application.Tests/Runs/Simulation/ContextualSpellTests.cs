using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Contextual;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ContextualSpellTests
{
    [TestMethod]
    public void PenitentWindup_TriggersThePulse_AndTheBashFindsEmptyAir()
    {
        var (simulation, player, enemies) = Encounter();
        var penitent = new EnemyState(600, player.Position + new Vector2D(40, 0), 12, 1000, 0, EnemyKind.Penitent);
        enemies.Add(penitent);
        while (penitent.Penitent!.Phase != PenitentPhase.Windup) Step(simulation, 0.05);
        var startDistance = Vector2D.Distance(penitent.Position, player.Position);

        Cast(simulation, 0.05);

        Assert.AreEqual(1, simulation.ContextualCasts);
        var entry = simulation.DecisionTrace.Single();
        Assert.AreEqual(SpellDecisionReason.Cast, entry.Reason);
        Assert.AreEqual(1, entry.Read.Telegraphs, "The windup is what the arbiter answered.");
        for (var time = 0d; time < WardingPulse.PushSeconds + 0.05; time += 0.05) Invoke(simulation, "UpdateContextualEffects", 0.05);
        Assert.AreEqual(startDistance + WardingPulse.PushDistance, Vector2D.Distance(penitent.Position, player.Position), 0.5);
        while (penitent.Penitent.Phase == PenitentPhase.Windup) Step(simulation, 0.05);
        Assert.AreEqual(simulation.MaxHealth, simulation.Health, 0.001, "The bash swings at the space the pulse cleared.");
    }

    [TestMethod]
    public void Crowd_IsShovedOutward_AndThePulseSpendsThePrimaryCast()
    {
        var (simulation, player, enemies) = Encounter();
        for (var index = 0; index < 4; index++)
        {
            var angle = index * Math.PI / 2;
            enemies.Add(new EnemyState(610 + index, player.Position + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * 70, 11, 1000, 0));
        }
        var cooldowns = Field<Dictionary<SpellId, double>>(simulation, "spellCooldowns");
        foreach (var id in cooldowns.Keys.ToArray()) cooldowns[id] = 0;
        var before = enemies.Select(enemy => enemy.Position).ToArray();

        Cast(simulation, 0.05);
        for (var time = 0d; time < 0.3; time += 0.05) Invoke(simulation, "UpdateContextualEffects", 0.05);

        Assert.AreEqual(1, simulation.ContextualCasts);
        Assert.AreEqual(1, simulation.PrimaryCastsYielded);
        Assert.IsTrue(cooldowns.Values.Any(value => value > 0), "The primary waits a full interval: one shared cast budget.");
        Assert.IsEmpty(simulation.CreateSnapshot().Projectiles, "No primary bolt fired on the pulse's tick.");
        for (var index = 0; index < enemies.Count; index++)
            Assert.IsGreaterThan(Vector2D.Distance(before[index], player.Position) + 70, Vector2D.Distance(enemies[index].Position, player.Position));
        Assert.IsNotNull(simulation.CreateSnapshot().WardPulse);
        Assert.AreEqual(0d, simulation.CreateSnapshot().Player.WardCharge!.Value, 1e-9);
    }

    [TestMethod]
    public void Recovering_IsTracedOncePerBlockedNeed()
    {
        var (simulation, player, enemies) = Encounter();
        for (var index = 0; index < 4; index++) enemies.Add(new EnemyState(620 + index, player.Position + new Vector2D(60 + index, 0), 11, 1000, 0));
        Cast(simulation, 0.05);
        foreach (var enemy in enemies) enemy.Position = player.Position + new Vector2D(60, 0);

        for (var tick = 0; tick < 20; tick++) Cast(simulation, 0.05);

        Assert.AreEqual(1, simulation.ContextualCasts);
        CollectionAssert.AreEqual(new[] { SpellDecisionReason.Cast, SpellDecisionReason.Recovering }, simulation.DecisionTrace.Select(entry => entry.Reason).ToArray());
    }

    [TestMethod]
    public void LoneEnemy_DoesNotTrigger_AndUnpreparedHuntsNeverPulse()
    {
        var (prepared, player, enemies) = Encounter();
        enemies.Add(new EnemyState(630, player.Position + new Vector2D(30, 0), 11, 1000, 0));
        Cast(prepared, 0.05);
        Assert.AreEqual(0, prepared.ContextualCasts);
        Assert.IsEmpty(prepared.DecisionTrace, "A quiet read below threshold is not worth a trace line.");

        var (unprepared, otherPlayer, crowd) = Encounter(prepare: false);
        for (var index = 0; index < 6; index++) crowd.Add(new EnemyState(640 + index, otherPlayer.Position + new Vector2D(40, index), 11, 1000, 0));
        Cast(unprepared, 0.05);
        Assert.AreEqual(0, unprepared.ContextualCasts);
        Assert.IsNull(unprepared.CreateSnapshot().Player.WardCharge);
        Assert.IsFalse(unprepared.CreateSnapshot().Hud.Spells.Any(spell => spell.Contextual));
    }

    [TestMethod]
    public void Factory_PreparesTheWardOnlyOutsideTheFirstHunt()
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var prepared = factory.Create(new HashSet<string>(), seed: 3, contextualSpell: true);
        Assert.IsTrue(prepared.ContextualSpellPrepared);
        Assert.AreEqual(WardingPulse.Name, prepared.CreateSnapshot().Hud.Spells.Single(spell => spell.Contextual).Name);
        Assert.IsFalse(factory.Create(new HashSet<string>(), seed: 3, firstHunt: true, contextualSpell: true).ContextualSpellPrepared);
        Assert.IsFalse(factory.Create(new HashSet<string>(), seed: 3).ContextualSpellPrepared);
    }

    [TestMethod]
    public void SameSeed_ProducesTheSameDecisionTrace()
    {
        static (int Casts, SpellDecisionTraceEntry[] Trace) Run()
        {
            var simulation = new RunSimulationFactory(new SeededRandomSource(1)).Create(new HashSet<string>(), seed: 41, contextualSpell: true);
            Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
            for (var tick = 0; tick < 60 * 60 && !simulation.IsEnded; tick++) simulation.Tick(1d / 60, default, 390, 700);
            return (simulation.ContextualCasts, simulation.DecisionTrace.ToArray());
        }

        var first = Run();
        var second = Run();

        Assert.AreEqual(first.Casts, second.Casts);
        CollectionAssert.AreEqual(first.Trace, second.Trace);
    }

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Encounter(bool prepare = true)
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
        Invoke(simulation, "PrepareContextualSpell", prepare);
        var enemies = Field<List<EnemyState>>(simulation, "enemies");
        enemies.Clear();
        return (simulation, Field<PlayerState>(simulation, "player"), enemies);
    }

    private static void Cast(RunSimulation simulation, double delta) => Invoke(simulation, "UpdateSpellcasting", delta, false);

    private static void Step(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Invoke(simulation, "UpdateEnemies", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
