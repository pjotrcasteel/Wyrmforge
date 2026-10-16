using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Tests.Progression.Laboratory;

namespace Wyrmforge.Domain.Tests.Progression.Loadouts;

[TestClass]
public sealed class HuntLoadoutBookTests
{
    private static PassiveTreeSelection RoutedTo(params string[] targets)
    {
        var selection = new PassiveTreeSelection();
        foreach (var target in targets)
            Assert.IsTrue(selection.SelectPath(PassiveTreePlanner.Plan(selection, target)!.NodeIds), target);
        return selection;
    }

    [TestMethod]
    public void SaveThenApply_AfterRespec_RestoresNodesAndSocketsForFree()
    {
        var lab = LaboratorySocketTests.BothStabilized();
        var selection = RoutedTo("hybrid-fire-frost-2", "hybrid-storm-arcane-2");
        lab.Equip(LaboratoryMutationId.RimeInfusion, selection.Selected);
        lab.Equip(LaboratoryMutationId.StormInfusion, selection.Selected);
        var book = new HuntLoadoutBook();
        var saved = book.Save(1, selection, lab);
        Assert.AreEqual("Loadout II", saved.Name);

        var nodes = selection.Selected;
        selection.Reset();
        lab.ReconcileSocket(selection.Selected);
        Assert.AreEqual(0, lab.Slotted.Count);

        var result = book.Apply(1, selection, lab)!;
        Assert.IsTrue(result.Complete);
        Assert.AreEqual(nodes.Count, result.NodesRestored);
        Assert.IsTrue(nodes.SetEquals(selection.Selected));
        Assert.AreEqual(ArcaneMutationSocketId.Rimebrand, lab.SocketOf(LaboratoryMutationId.RimeInfusion));
        Assert.AreEqual(ArcaneMutationSocketId.ChargedFocus, lab.SocketOf(LaboratoryMutationId.StormInfusion));
    }

    [TestMethod]
    public void Apply_ReplacesCurrentSocketsAndReportsWhatCouldNotBeEquipped()
    {
        var lab = LaboratorySocketTests.BothStabilized();
        var selection = RoutedTo("hybrid-fire-frost-2");
        lab.Equip(LaboratoryMutationId.RimeInfusion, selection.Selected);
        var book = new HuntLoadoutBook();
        book.Save(0, selection, lab);

        // A Laboratory where the recipe was never stabilized (e.g. a loadout from another save) skips it.
        var fresh = new LaboratoryState();
        var result = book.Apply(0, selection, fresh)!;
        Assert.IsFalse(result.Complete);
        CollectionAssert.AreEqual(new[] { LaboratoryMutationId.RimeInfusion }, result.Skipped.ToArray());

        book.Save(2, new PassiveTreeSelection(), new LaboratoryState());
        Assert.IsTrue(book.Apply(2, selection, lab)!.Complete);
        Assert.AreEqual(0, lab.Slotted.Count, "Applying an empty loadout clears the sockets.");
        Assert.AreEqual(0, selection.Selected.Count);
    }

    [TestMethod]
    public void Apply_UnaffordableNodes_AreSkippedNotForced()
    {
        var lab = new LaboratoryState();
        var book = new HuntLoadoutBook();
        book.Save(0, RoutedTo("hybrid-fire-frost-2"), lab);
        var poor = new PassiveTreeSelection(1);
        var result = book.Apply(0, poor, lab)!;
        Assert.IsTrue(result.NodesSkipped > 0);
        Assert.IsTrue(poor.SpentPoints <= poor.PointBudget);
    }

    [TestMethod]
    public void EmptyOrOutOfRangeSlots_DoNothing()
    {
        var book = new HuntLoadoutBook();
        Assert.IsNull(book.Apply(0, new PassiveTreeSelection(), new LaboratoryState()));
        Assert.IsNull(book[7]);
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => book.Save(3, new PassiveTreeSelection(), new LaboratoryState()));
        book.Clear(-1);
    }

    [TestMethod]
    public void SaveRoundTrip_KeepsNamesNodesAndSockets_AndDropsUnknownIds()
    {
        var lab = LaboratorySocketTests.BothStabilized();
        var selection = RoutedTo("hybrid-fire-frost-2");
        lab.Equip(LaboratoryMutationId.RimeInfusion, selection.Selected);
        var book = new HuntLoadoutBook();
        book.Save(0, selection, lab, "  Frostfire  ");
        book.Save(2, new PassiveTreeSelection(), lab);
        book.Clear(2);

        var save = book.ToSave();
        var first = save.Slots[0]!;
        var restored = new HuntLoadoutBook();
        restored.Restore(save with { Slots = [first with { Sockets = [.. first.Sockets, "Nowhere:RimeInfusion", "Flashfire:Future"] }, null, null, first] });
        Assert.AreEqual("Frostfire", restored[0]!.Name);
        CollectionAssert.AreEquivalent(selection.Selected.ToArray(), restored[0]!.Nodes.ToArray());
        Assert.AreEqual(1, restored[0]!.Slots.Count);
        Assert.AreEqual(LaboratoryMutationId.RimeInfusion, restored[0]!.Slots[ArcaneMutationSocketId.Rimebrand]);
        Assert.IsNull(restored[1]);
        Assert.IsNull(restored[2]);

        restored.Restore(null);
        Assert.IsNull(restored[0]);
    }

    [TestMethod]
    public void PrimaryAndOffering_RoundTripAndApply_OnlyWhileTheOfferingIsAvailable()
    {
        var lab = LaboratorySocketTests.BothStabilized();
        var selection = RoutedTo("hybrid-fire-frost-2");
        var book = new HuntLoadoutBook();
        book.Save(0, selection, lab, primary: SpellId.FireBolt, offering: DragonEssenceId.RimeHeart);

        var restored = new HuntLoadoutBook();
        restored.Restore(JsonSerializer.Deserialize<HuntLoadoutSave>(JsonSerializer.Serialize(book.ToSave())));
        Assert.AreEqual(SpellId.FireBolt, restored[0]!.Primary);
        Assert.AreEqual(DragonEssenceId.RimeHeart, restored[0]!.Offering);

        var held = restored.Apply(0, selection, lab, _ => true)!;
        Assert.AreEqual(SpellId.FireBolt, held.Primary);
        Assert.AreEqual(DragonEssenceId.RimeHeart, held.Offering);
        Assert.IsTrue(held.Complete);

        var spent = restored.Apply(0, selection, lab, _ => false)!;
        Assert.IsNull(spent.Offering, "Without the Essence the offering is never selected.");
        Assert.AreEqual(DragonEssenceId.RimeHeart, spent.OfferingSkipped);
        Assert.IsFalse(spent.Complete);
    }

    [TestMethod]
    public void Restore_OlderSaveOrUnknownPrimaryAndOffering_LoadsWithout()
    {
        const string v1 = """{"Version":1,"Slots":[{"Name":"Old","Nodes":[],"Sockets":[]},{"Name":"Bad","Nodes":[],"Sockets":[],"Primary":"Meteor","Offering":"99"}]}""";
        var book = new HuntLoadoutBook();
        book.Restore(JsonSerializer.Deserialize<HuntLoadoutSave>(v1));
        Assert.IsNull(book[0]!.Primary);
        Assert.IsNull(book[0]!.Offering);
        Assert.IsNull(book[1]!.Primary);
        Assert.IsNull(book[1]!.Offering);
        Assert.IsTrue(book.Apply(0, new PassiveTreeSelection(), new LaboratoryState())!.Complete);
    }
}
