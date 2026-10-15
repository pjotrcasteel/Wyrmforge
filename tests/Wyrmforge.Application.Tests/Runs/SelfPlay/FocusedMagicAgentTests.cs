using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.SelfPlay;

[TestClass]
public sealed class FocusedMagicAgentTests
{
    [TestMethod]
    public void ChooseLevelChoice_ForeignCardNamesReplacedPrimary_DoesNotMistakeItForPreferredSchool()
    {
        var agent = new HeuristicRunAgent(RunAgentPersonality.BuildFocused, 7, SpellSchool.Fire);
        LevelChoice[] choices =
        [
            new("spell:FrostShard", LevelChoiceKind.SpellUpgrade, "Frost Shard", "Replaces Fire Bolt as your primary cast.", "", 1, 3,
                RewardRarity.Rare, LevelChoiceDraftRole.Converge),
            new("spell:FireBolt", LevelChoiceKind.SpellUpgrade, "Fire Bolt", "Fire damage.", "", 1, 3),
        ];

        var choice = agent.ChooseLevelChoice(Observation(SpellId.FireBolt, 1, choices));

        Assert.AreEqual("spell:FireBolt", choice.Id);
    }

    [TestMethod]
    public void ChooseLevelChoice_PreferredSchoolPivotAvailable_CanLeaveInitialPrimary()
    {
        var agent = new HeuristicRunAgent(RunAgentPersonality.BuildFocused, 7, SpellSchool.Storm);
        LevelChoice[] choices =
        [
            new("spell:ArcaneOrb", LevelChoiceKind.SpellUpgrade, "Arcane Orb", "Arcane damage.", "", 1, 3),
            new("spell:ChainLightning", LevelChoiceKind.NewSpell, "Chain Lightning", "Storm damage.", "", 0, 3,
                RewardRarity.Uncommon, LevelChoiceDraftRole.Converge),
        ];

        var choice = agent.ChooseLevelChoice(Observation(SpellId.ArcaneOrb, 1, choices));

        Assert.AreEqual("spell:ChainLightning", choice.Id);
    }

    [TestMethod]
    public void ChooseMovement_DamagedHunter_SeeksVisibleUnlockedHealingCache()
    {
        var agent = new HeuristicRunAgent(RunAgentPersonality.BuildFocused, 7, SpellSchool.Fire);
        var open = ObservationWithRecoveryCache(40, true);
        var movement = agent.ChooseMovement(open);

        Assert.IsGreaterThan(0.2, movement.X);
        Assert.IsGreaterThan(0.2, movement.Y);

        var sealedMovement = agent.ChooseMovement(ObservationWithRecoveryCache(40, false));
        Assert.AreEqual(0d, sealedMovement.Y, .001, "Do not seek a locked cache behind real masonry.");
        Assert.AreEqual(0d, agent.ChooseMovement(ObservationWithRecoveryCache(95, true)).Y, .001,
            "Do not abandon combat to seek recovery while already healthy.");
    }

    private static RunAgentObservation ObservationWithRecoveryCache(double health, bool open)
    {
        var snapshot = new RunSimulationFactory(new SeededRandomSource(1)).Create(new HashSet<string>(), seed: 7).CreateSnapshot();
        snapshot = snapshot with
        {
            Player = snapshot.Player with { X = 700, Y = 1200 },
            Hud = snapshot.Hud with { Health = health, MaxHealth = 100 },
            World = new ArenaWorldRenderSnapshot(950, 1550),
            Environment = new ArenaEnvironmentRenderSnapshot(1, "River valley", "fire", 4, "Ruined waystation",
                [new ArenaSupplyRenderSnapshot("health", 0.8, 0.82, open)], [], "causeway"),
        };
        return new(snapshot, [], [], [], [], [], 1, 0, false);
    }

    private static RunAgentObservation Observation(SpellId primary, int rank, IReadOnlyList<LevelChoice> choices)
    {
        var snapshot = new RunSimulationFactory(new SeededRandomSource(1)).Create(new HashSet<string>(), seed: 7).CreateSnapshot();
        var spell = SpellCatalog.Get(primary);
        snapshot = snapshot with { Hud = snapshot.Hud with { Spells = new SpellHudSnapshot[] { new(spell.Icon, spell.Name, rank) } } };
        return new(snapshot, [], choices, [], [], [], 1, 0, false);
    }
}
