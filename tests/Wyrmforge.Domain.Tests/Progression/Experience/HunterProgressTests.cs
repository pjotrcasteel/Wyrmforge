using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.Experience;

namespace Wyrmforge.Domain.Tests.Progression.Experience;

[TestClass]
public sealed class HunterProgressTests
{
    [TestMethod]
    public void AddExperience_FirstThreshold_GrantsOneAtlasPointAndRetainsRemainder()
    {
        var hunter = new HunterProgress();
        var gain = hunter.AddExperience(47);
        Assert.AreEqual(2, hunter.Level);
        Assert.AreEqual(1, gain.AtlasPoints);
        Assert.AreEqual(7, hunter.ExperienceInLevel);
        Assert.AreEqual(45, hunter.ExperienceToNext);
    }

    [TestMethod]
    public void AddExperience_CrossesSeveralLevels_AwardsEveryRewardExactlyOnce()
    {
        var hunter = new HunterProgress();
        var gain = hunter.AddExperience((int)HunterProgress.TotalForLevel(10));
        Assert.AreEqual(10, hunter.Level);
        Assert.AreEqual(9, gain.AtlasPoints);
        Assert.AreEqual(2, gain.RelicCaches);
        var after = hunter.AddExperience(1);
        Assert.AreEqual(0, after.AtlasPoints);
        Assert.AreEqual(0, after.RelicCaches);
        var restored = new HunterProgress();
        restored.Restore(hunter.TotalExperience);
        Assert.AreEqual(0, restored.AddExperience(0).RelicCaches);
    }

    [TestMethod]
    public void AddExperience_BeyondCurrentContent_PreservesXpWithoutInflatingAtlas()
    {
        var hunter = new HunterProgress();
        var gain = hunter.AddExperience(100_000);
        Assert.AreEqual(24, hunter.AtlasBudget);
        Assert.AreEqual(23, gain.AtlasPoints);
        Assert.AreEqual(4, gain.RelicCaches);
        Assert.IsTrue(hunter.AtCap);
        Assert.AreEqual(100_000L, hunter.TotalExperience);
        Assert.AreEqual(0, hunter.AddExperience(10).AtlasPoints);
    }

    [TestMethod]
    public void NextReward_LegacyFullAtlas_PointsToActualMilestoneReward()
    {
        var hunter = new HunterProgress();
        hunter.Restore(null);
        Assert.AreEqual(1, hunter.Level, "Missing historic XP must not be fabricated from the old point budget.");
        Assert.AreEqual("Hunter 5: relic cache", hunter.NextRewardForBudget(24));
        Assert.AreEqual("Hunter 2: 1 Arcane point", hunter.NextRewardForBudget(1));
    }
}
