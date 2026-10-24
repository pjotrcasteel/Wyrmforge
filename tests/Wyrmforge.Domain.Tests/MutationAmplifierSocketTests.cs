using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Progression.Laboratory;

namespace Wyrmforge.Domain.Tests;

[TestClass]
public sealed class MutationAmplifierSocketTests
{
    private static readonly MutationEffectDescriptor Detonation = new("FireBolt", "Detonation", [MutationEffectCapability.Area]);
    private static readonly MutationEffectDescriptor ScorchedEarth = new("FireBolt", "ScorchedEarth", [MutationEffectCapability.Area, MutationEffectCapability.Duration]);
    private static readonly MutationEffectDescriptor Frostfire = new("FrostShard", "Frostfire", [MutationEffectCapability.Area, MutationEffectCapability.Duration]);

    [TestMethod]
    public void Assign_OwnedAndCompatibleMutation_Succeeds()
    {
        var sockets = MutationAmplifierCatalog.CreateSockets();
        var nodes = new HashSet<string> { "fire-spread-crown" };

        Assert.IsTrue(sockets.Assign("fire-spread-crown", Detonation, nodes, [Detonation]));
        Assert.AreEqual(1.2, sockets.FactorFor(Detonation, MutationEffectCapability.Area, nodes, [Detonation]), 0.00001);
    }

    [TestMethod]
    public void Assign_UnequippedOrUnlearnedOrUnsupported_Fails()
    {
        var sockets = MutationAmplifierCatalog.CreateSockets();
        var learned = new HashSet<string> { "fire-spread-crown" };
        Assert.IsFalse(sockets.Assign("fire-spread-crown", Detonation, learned, []));
        Assert.IsFalse(sockets.Assign("fire-spread-crown", Frostfire, new HashSet<string>(), [Frostfire]));
        Assert.IsFalse(sockets.Assign("fire-spread-crown", new("FireBolt", "MeteorHeart", [MutationEffectCapability.Potency]), learned,
            [new MutationEffectDescriptor("FireBolt", "MeteorHeart", [MutationEffectCapability.Potency])]));
        Assert.AreEqual(0, sockets.Assignments.Count);
    }

    [TestMethod]
    public void FactorFor_ChangesOnlyTheAssignedMutationsMatchingEffect()
    {
        var sockets = MutationAmplifierCatalog.CreateSockets();
        var learned = new HashSet<string> { "fire-spread-crown", "fire-ember-altar" };
        Assert.IsTrue(sockets.Assign("fire-spread-crown", Detonation, learned, [Detonation, ScorchedEarth]));
        Assert.IsTrue(sockets.Assign("fire-ember-altar", ScorchedEarth, learned, [Detonation, ScorchedEarth]));

        Assert.AreEqual(1.2, sockets.FactorFor(Detonation, MutationEffectCapability.Area, learned, [Detonation, ScorchedEarth]), 0.00001);
        Assert.AreEqual(1, sockets.FactorFor(ScorchedEarth, MutationEffectCapability.Area, learned, [Detonation, ScorchedEarth]), 0.00001);
        Assert.AreEqual(1.25, sockets.FactorFor(ScorchedEarth, MutationEffectCapability.Duration, learned, [Detonation, ScorchedEarth]), 0.00001);
        Assert.AreEqual(1, sockets.FactorFor(Frostfire, MutationEffectCapability.Area, learned, [Detonation, ScorchedEarth]), 0.00001);
    }

    [TestMethod]
    public void Restore_BecomesDormantWhenUnequippedOrRefunded_WithoutLosingAssignment()
    {
        var learned = new HashSet<string> { "fire-spread-crown" };
        var sockets = MutationAmplifierCatalog.CreateSockets();
        Assert.IsTrue(sockets.Assign("fire-spread-crown", Detonation, learned, [Detonation]));

        var restored = MutationAmplifierCatalog.CreateSockets();
        restored.Restore(sockets.ToSave());
        Assert.AreEqual(1, restored.FactorFor(Detonation, MutationEffectCapability.Area, learned, []), 0.00001);
        Assert.AreEqual(1, restored.FactorFor(Detonation, MutationEffectCapability.Area, new HashSet<string>(), [Detonation]), 0.00001);
        Assert.AreEqual(1.2, restored.FactorFor(Detonation, MutationEffectCapability.Area, learned, [Detonation]), 0.00001);
    }

    [TestMethod]
    public void Restore_UnknownNodes_AreDiscarded()
    {
        var sockets = MutationAmplifierCatalog.CreateSockets();
        sockets.Restore([new("unknown-node", "FireBolt", "Detonation"), new("fire-spread-crown", "FireBolt", "Detonation")]);
        Assert.AreEqual(1, sockets.Assignments.Count);
    }

    [TestMethod]
    public void FactorFor_RepeatedCompatibleSockets_NeverExceedBudget()
    {
        var sockets = new MutationAmplifierSockets([
            new("first", MutationEffectCapability.Area, 1.4), new("second", MutationEffectCapability.Area, 1.4)
        ]);
        var learned = new HashSet<string> { "first", "second" };
        Assert.IsTrue(sockets.Assign("first", Frostfire, learned, [Frostfire]));
        Assert.IsTrue(sockets.Assign("second", Frostfire, learned, [Frostfire]));
        Assert.AreEqual(MutationAmplifierSockets.MaximumCombinedFactor,
            sockets.FactorFor(Frostfire, MutationEffectCapability.Area, learned, [Frostfire]), 0.00001);
    }

    [TestMethod]
    public void HuntLoadout_SaveAndApply_RoundTripsMutationAmplifierAssignments()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Fire);
        selection.RestoreNodes([
            "fire-start", "fire-1", "fire-ember-drift", "fire-scorching-winds",
            "fire-cinder-halo", "fire-conflagration", "fire-ashfront", "fire-spread-crown"
        ]);
        Assert.IsTrue(selection.Selected.Contains("fire-spread-crown"));
        var original = MutationAmplifierCatalog.CreateSockets();
        Assert.IsTrue(original.Assign("fire-spread-crown", Detonation, selection.Selected, [Detonation]));

        var laboratory = new LaboratoryState();
        var book = new HuntLoadoutBook();
        book.Save(0, selection, laboratory, mutationAmplifiers: original);

        var reloaded = new HuntLoadoutBook();
        reloaded.Restore(book.ToSave());
        var assigned = MutationAmplifierCatalog.CreateSockets();
        Assert.IsNotNull(reloaded.Apply(0, selection, laboratory, mutationAmplifiers: assigned));

        Assert.AreEqual(1, assigned.Assignments.Count);
        Assert.AreEqual("Detonation", assigned.Assignments[0].MutationId);
        Assert.AreEqual(1.2, assigned.FactorFor(Detonation, MutationEffectCapability.Area, selection.Selected, [Detonation]), 0.00001);
    }

    [TestMethod]
    public void Catalog_FireballMutations_HaveReusableEffectCapabilities()
    {
        Assert.IsTrue(MutationAmplifierCatalog.ForFireball(FireballMutationId.Detonation)!.Capabilities.Contains(MutationEffectCapability.Area));
        Assert.IsTrue(MutationAmplifierCatalog.ForFireball(FireballMutationId.ScorchedEarth)!.Capabilities.Contains(MutationEffectCapability.Duration));
        Assert.IsNull(MutationAmplifierCatalog.ForFireball(FireballMutationId.PhoenixVolley));
    }
}
