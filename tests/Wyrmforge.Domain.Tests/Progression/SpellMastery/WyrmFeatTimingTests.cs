using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.SpellMastery;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Progression.SpellMastery;

[TestClass]
public sealed class WyrmFeatTimingTests
{
    [TestMethod]
    public void FeatsEarnedAtDefeat_SpellRankTwo_DoesNotAwardWyrmFeat()
    {
        var spells = new SpellBook();
        Assert.IsTrue(spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(spells.LearnOrUpgrade(SpellId.FireBolt));

        var feats = SpellLineageCatalog.FeatsEarnedAtDefeat(DragonId.Ashfang, spells);

        Assert.AreEqual(0, feats.Count);
        Assert.IsTrue(spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.AreEqual(0, feats.Count, "A later spell upgrade cannot retroactively qualify a defeated Wyrm.");
    }

    [TestMethod]
    public void FeatsEarnedAtDefeat_SpellAlreadyMastered_AwardsMatchingWyrmOnly()
    {
        var spells = new SpellBook();
        Assert.IsTrue(spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(spells.LearnOrUpgrade(SpellId.FireBolt));

        var matching = SpellLineageCatalog.FeatsEarnedAtDefeat(DragonId.Ashfang, spells);
        var differentWyrm = SpellLineageCatalog.FeatsEarnedAtDefeat(DragonId.Stormcoil, spells);

        CollectionAssert.AreEqual(new[] { SpellId.FireBolt }, matching.ToArray());
        Assert.AreEqual(0, differentWyrm.Count);
    }
}
