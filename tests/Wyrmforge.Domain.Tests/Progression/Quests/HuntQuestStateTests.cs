using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Quests;

namespace Wyrmforge.Domain.Tests.Progression.Quests;

[TestClass]
public sealed class HuntQuestStateTests
{
    [TestMethod]
    public void Record_AbandonedHunt_DoesNotAdvanceOrUnlockRewards()
    {
        var state = new HuntQuestState();
        state.Record(new(48, 12, 3, true, [DragonId.Ashfang], [], true, true));
        Assert.AreEqual(0, state.ReadyCount);
    }

    [TestMethod]
    public void Claim_CompletedQuest_GrantsOnceAcrossSaveRestore()
    {
        var state = new HuntQuestState();
        state.Record(new(4, 1, 1, false, [], [], false, false));
        var reward = state.Claim("trail-4");
        Assert.IsNotNull(reward);
        Assert.AreEqual(30, reward.Experience);
        Assert.AreEqual(1, state.Caches);
        Assert.IsNull(state.Claim("trail-4"));
        var restored = new HuntQuestState();
        restored.Restore(state.Snapshot());
        Assert.IsNull(restored.Claim("trail-4"));
        Assert.IsTrue(restored.ConsumeCache());
        Assert.IsFalse(restored.ConsumeCache());
    }

    [TestMethod]
    public void Record_RepeatWyrm_DoesNotCountAsFourDifferentWyrms()
    {
        var state = new HuntQuestState();
        for (var index = 0; index < 4; index++) state.Record(new(4, 0, 1, false, [DragonId.Ashfang], [], false, false));
        Assert.AreEqual(1, state.Progress(HuntQuestCatalog.Get("wyrm-4")));
        Assert.IsFalse(state.CanClaim(HuntQuestCatalog.Get("wyrm-4")));
        Assert.IsNull(state.Claim("wyrm-4"));
        Assert.IsNull(state.Claim("unknown"));
    }

    [TestMethod]
    public void Catalog_AllRewards_ProvideHunterExperienceAndSpecificLoot()
    {
        Assert.AreEqual(660, HuntQuestCatalog.All.Sum(quest => quest.Experience));
        Assert.AreEqual(3, HuntQuestCatalog.All.Sum(quest => quest.Caches));
        Assert.AreEqual(HuntQuestCatalog.All.Count, HuntQuestCatalog.All.Select(quest => quest.Id).Distinct().Count());
    }

    [TestMethod]
    public void Restore_InvalidProgress_ClampsCountersAndCacheBalance()
    {
        var state = new HuntQuestState();
        state.Restore(new(-10, 100, 100, [(DragonId)100], [(DragonEssenceId)100], false, false, ["unknown"], 100));
        Assert.AreEqual(0, state.Progress(HuntQuestCatalog.Get("trail-1")));
        Assert.AreEqual(0, state.Caches);
        Assert.AreEqual(0, state.Progress(HuntQuestCatalog.Get("wyrm-1")));
    }
}
