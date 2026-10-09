using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Domain.Tests.Progression.Relics;

[TestClass]
public sealed class RelicInventoryStateTests
{
    [TestMethod]
    public void TryEquip_TwoOwnedRelics_FillsAvailableSlots()
    {
        var state = new RelicInventoryState();
        state.Acquire(RelicId.EmberheartCharm);
        state.Acquire(RelicId.ChronoglassShard);

        Assert.IsTrue(state.TryEquip(RelicId.EmberheartCharm));
        Assert.IsTrue(state.TryEquip(RelicId.ChronoglassShard));
        Assert.IsFalse(state.HasFreeSlot);
    }

    [TestMethod]
    public void TryEquip_ThirdRelicWhenFull_IsRejectedUntilSlotFreed()
    {
        var state = new RelicInventoryState();
        foreach (var id in new[] { RelicId.EmberheartCharm, RelicId.ChronoglassShard, RelicId.GalefootSigil }) state.Acquire(id);
        state.TryEquip(RelicId.EmberheartCharm);
        state.TryEquip(RelicId.ChronoglassShard);

        Assert.IsFalse(state.TryEquip(RelicId.GalefootSigil));
        Assert.IsTrue(state.TryUnequip(RelicId.EmberheartCharm));
        Assert.IsTrue(state.TryEquip(RelicId.GalefootSigil));
    }

    [TestMethod]
    public void Aggregate_EquippedRelics_ComposesIndependentModifiers()
    {
        var modifiers = BuildModifierSet.Aggregate(
        [
            RelicCatalog.Get(RelicId.EmberheartCharm).Modifiers,
            RelicCatalog.Get(RelicId.GalefootSigil).Modifiers,
        ]);

        Assert.AreEqual(1.18d, modifiers.Apply(BuildStatId.Damage, 1), 0.001);
        Assert.AreEqual(1.20d, modifiers.Apply(BuildStatId.MoveSpeed, 1), 0.001);
        Assert.AreEqual(1d, modifiers.Apply(BuildStatId.CastInterval, 1), 0.001);
    }
    [TestMethod]
    public void TryReplace_FullSlots_SwapsImmediatelyWithoutLosingOwnedRelic()
    {
        var state = new RelicInventoryState();
        foreach (var id in new[] { RelicId.Vitalstone, RelicId.ChronoglassShard, RelicId.GalefootSigil }) state.Acquire(id);
        state.TryEquip(RelicId.Vitalstone);
        state.TryEquip(RelicId.ChronoglassShard);
        Assert.IsFalse(state.TryReplace(RelicId.DuelistLens, RelicId.GalefootSigil));
        Assert.IsTrue(state.TryReplace(RelicId.Vitalstone, RelicId.GalefootSigil));
        Assert.IsTrue(state.IsEquipped(RelicId.GalefootSigil));
        Assert.IsFalse(state.IsEquipped(RelicId.Vitalstone));
        Assert.IsTrue(state.IsOwned(RelicId.Vitalstone));
        Assert.AreEqual(2, state.Equipped.Count);
    }
}
