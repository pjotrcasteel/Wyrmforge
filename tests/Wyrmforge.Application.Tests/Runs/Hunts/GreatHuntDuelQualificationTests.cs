using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Tests.Runs.Hunts;

[TestClass]
public sealed class GreatHuntDuelQualificationTests
{
    [TestMethod]
    public void Qualifies_ShallowHunt_DoesNotAwardEvolvedDuel()
    {
        var (spells, evolutions) = BuildEvolved(SpellId.FireBolt, SpellEvolutionId.MeteorHeart);

        Assert.IsFalse(GreatHuntDuelQualification.Qualifies(DragonCatalog.Ashfang, 1, spells, evolutions));
    }

    [TestMethod]
    public void Qualifies_MatchingSchoolAndEvolvedRankThree_AwardsDeepDuel()
    {
        var (spells, evolutions) = BuildEvolved(SpellId.FireBolt, SpellEvolutionId.MeteorHeart);

        Assert.IsTrue(GreatHuntDuelQualification.Qualifies(DragonCatalog.Ashfang, 2, spells, evolutions));
        Assert.IsFalse(GreatHuntDuelQualification.Qualifies(DragonCatalog.Rimeclaw, 2, spells, evolutions));
    }

    [TestMethod]
    public void Qualifies_OnlyRankThreeOrPostKillEvolution_DoesNotAwardFeat()
    {
        var spells = new SpellBook();
        while (spells[SpellId.FireBolt] < 3) spells.LearnOrUpgrade(SpellId.FireBolt);
        var evolutions = new SpellEvolutionSelection();

        Assert.IsFalse(GreatHuntDuelQualification.Qualifies(DragonCatalog.Ashfang, 2, spells, evolutions));
        Assert.IsTrue(evolutions.Select(SpellEvolutionId.MeteorHeart, spells));
        Assert.IsTrue(GreatHuntDuelQualification.Qualifies(DragonCatalog.Ashfang, 2, spells, evolutions));
    }

    private static (SpellBook Spells, SpellEvolutionSelection Evolutions) BuildEvolved(SpellId spell, SpellEvolutionId evolution)
    {
        var spells = new SpellBook();
        while (spells[spell] < SpellCatalog.Get(spell).MaxRank) spells.LearnOrUpgrade(spell);
        var evolutions = new SpellEvolutionSelection();
        Assert.IsTrue(evolutions.Select(evolution, spells));
        return (spells, evolutions);
    }
}
