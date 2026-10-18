using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class StormglassDischargeTests
{
    [TestMethod]
    public void OnlyTheFirstLinkOfAStormglassChainFreezes()
    {
        var spells = new SpellBook();
        Assert.IsTrue(spells.TryChoosePrimary(SpellId.ChainLightning));
        spells.LearnOrUpgrade(SpellId.FrostShard);
        var synergies = new SynergySelection();
        Assert.IsTrue(synergies.Select(SynergyId.Stormglass, spells));

        var first = SpellCombinationResolver.Resolve(SpellId.ChainLightning, spells, synergies);
        Assert.AreEqual(CombatStatusId.Frozen, first.Single().Status);
        Assert.AreEqual(0, SpellCombinationResolver.Resolve(SpellId.ChainLightning, spells, synergies, firstLink: false).Count);
    }

    [TestMethod]
    public void FrostfireProjectilesAreUnaffectedByTheLinkRule()
    {
        var spells = new SpellBook();
        Assert.IsTrue(spells.TryChoosePrimary(SpellId.FireBolt));
        spells.LearnOrUpgrade(SpellId.FrostShard);
        var synergies = new SynergySelection();
        Assert.IsTrue(synergies.Select(SynergyId.Frostfire, spells));
        var statuses = SpellCombinationResolver.Resolve(SpellId.FireBolt, spells, synergies).Select(effect => effect.Status).ToArray();
        CollectionAssert.AreEquivalent(new[] { CombatStatusId.Burning, CombatStatusId.Frozen }, statuses);
    }
}
