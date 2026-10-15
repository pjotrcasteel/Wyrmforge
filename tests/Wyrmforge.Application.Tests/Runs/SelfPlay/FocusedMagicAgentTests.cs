using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
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

    private static RunAgentObservation Observation(SpellId primary, int rank, IReadOnlyList<LevelChoice> choices)
    {
        var snapshot = new RunSimulationFactory(new SeededRandomSource(1)).Create(new HashSet<string>(), seed: 7).CreateSnapshot();
        var spell = SpellCatalog.Get(primary);
        snapshot = snapshot with { Hud = snapshot.Hud with { Spells = new SpellHudSnapshot[] { new(spell.Icon, spell.Name, rank) } } };
        return new(snapshot, [], choices, [], [], [], 1, 0, false);
    }
}
