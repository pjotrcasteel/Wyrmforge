using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Tests.Combat.Statuses;

[TestClass]
public sealed class CombatStatusCollectionTests
{
    [TestMethod]
    public void Apply_FrozenStatus_UsesConfiguredTimeScales()
    {
        var statuses = new CombatStatusCollection();
        var frozen = CombatStatusCatalog.Get(CombatStatusId.Frozen);

        statuses.Apply(frozen, 1.4);

        Assert.IsTrue(statuses.Has(CombatStatusId.Frozen));
        Assert.AreEqual(0d, statuses.TimeScale(false), 0.0001);
        Assert.AreEqual(0.45d, statuses.TimeScale(true), 0.0001);
        Assert.AreEqual(1.4d, statuses.RemainingSeconds(CombatStatusId.Frozen), 0.0001);
    }

    [TestMethod]
    public void Apply_RefreshDuration_PreservesLongerExistingDuration()
    {
        var statuses = new CombatStatusCollection();
        var frozen = CombatStatusCatalog.Get(CombatStatusId.Frozen);
        statuses.Apply(frozen, 1.5);

        statuses.Apply(frozen, 0.5);

        Assert.AreEqual(1.5d, statuses.RemainingSeconds(CombatStatusId.Frozen), 0.0001);
        Assert.AreEqual(1, statuses.Stacks(CombatStatusId.Frozen));
    }

    [TestMethod]
    public void Tick_ExpiredStatus_RemovesEffect()
    {
        var statuses = new CombatStatusCollection();
        statuses.Apply(CombatStatusCatalog.Get(CombatStatusId.Frozen), 0.5);

        statuses.Tick(0.5);

        Assert.IsFalse(statuses.Has(CombatStatusId.Frozen));
        Assert.AreEqual(1d, statuses.TimeScale(false), 0.0001);
    }

    [TestMethod]
    public void FrozenDefinition_BossDurationMultiplier_PreservesExistingResistance()
    {
        Assert.AreEqual(0.35d, CombatStatusCatalog.Get(CombatStatusId.Frozen).BossDurationMultiplier, 0.0001);
    }
}
