using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Nexus;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class ArcaneNexusTests
{
    private const string Rimebrand = "hybrid-fire-frost-2";

    [TestMethod]
    public void OrdinaryNode_HasNoSocketOrResearch()
    {
        var node = ArcaneNexus.Node("hybrid-fire-frost-1", new LaboratoryState(), new DragonEssenceVault(), new HashSet<string>());

        Assert.IsNull(node.Socket);
        Assert.IsFalse(node.HasResearch);
        Assert.IsFalse(ArcaneNexus.IsResearchNode("hybrid-fire-frost-1"));
        Assert.IsNull(ArcaneNexus.Mark("hybrid-fire-frost-1", new LaboratoryState(), new DragonEssenceVault(), new HashSet<string>()));
    }

    [TestMethod]
    public void SocketWithoutHomeRecipe_ShowsSocketButNoResearch()
    {
        var node = ArcaneNexus.Node("hybrid-fire-storm-2", new LaboratoryState(), new DragonEssenceVault(), new HashSet<string>());

        Assert.AreEqual(ArcaneMutationSocketId.Flashfire, node.Socket!.Definition.Id);
        Assert.IsFalse(node.HasResearch);
        Assert.IsFalse(ArcaneNexus.IsResearchNode("hybrid-fire-storm-2"));
    }

    [TestMethod]
    public void Rimebrand_WithoutRimeHeart_NamesMaterialAndWhereToFindIt()
    {
        var research = ArcaneNexus.Node(Rimebrand, new LaboratoryState(), new DragonEssenceVault(), new HashSet<string>()).Research.Single();

        Assert.AreEqual(LaboratoryMutationId.RimeInfusion, research.Mutation.Id);
        Assert.AreEqual(NexusResearchStage.NeedsMaterial, research.Stage);
        Assert.AreEqual(DragonEssenceId.RimeHeart, research.Material!.Material.Id);
        Assert.AreEqual(0, research.Material.Owned);
        Assert.AreEqual(1, research.Material.Needed);
        Assert.IsFalse(research.Material.Met);
        Assert.AreEqual(DragonId.Rimeclaw, research.Material.Source);
        Assert.AreEqual(NexusActionKind.TrackMaterial, research.Next.Kind);
        StringAssert.Contains(research.Next.Text, "Rimeclaw");
        Assert.AreEqual(ExperimentAvailability.MissingSample, research.Experiments[0].Availability);
    }

    [TestMethod]
    public void TrackingTheMaterial_TurnsTheActionIntoTheHunt()
    {
        var laboratory = new LaboratoryState();
        var vault = new DragonEssenceVault();
        Assert.IsTrue(laboratory.Track(LaboratoryMutationId.RimeInfusion, vault));

        var research = ArcaneNexus.Node(Rimebrand, laboratory, vault, new HashSet<string>()).Research.Single();

        Assert.AreEqual(NexusActionKind.HuntMaterial, research.Next.Kind);
        Assert.IsTrue(research.Material!.Tracked);
        Assert.AreEqual(LaboratoryState.LeadHuntLimit, research.Material.TrackedHuntsLeft);
    }

    [TestMethod]
    public void FrostfireJourney_WalksFromMaterialToEquippedLoadout()
    {
        var laboratory = new LaboratoryState();
        var vault = new DragonEssenceVault();
        var selection = new PassiveTreeSelection();
        var loadouts = new HuntLoadoutBook();
        vault.Store(DragonEssenceId.RimeHeart);

        // The guided step follows the main line and skips the optional dead end.
        var seen = new List<LaboratoryExperimentId>();
        for (var guard = 0; guard < 10; guard++)
        {
            var step = ArcaneNexus.Node(Rimebrand, laboratory, vault, selection.Selected).Research.Single();
            if (step.Stage != NexusResearchStage.Experimenting) break;
            Assert.AreEqual(NexusActionKind.RunExperiment, step.Next.Kind);
            seen.Add(step.Next.Experiment!.Value);
            Assert.IsFalse(laboratory.Run(step.Next.Experiment.Value, vault).Rejected);
        }
        CollectionAssert.AreEqual(new[] { LaboratoryExperimentId.ExamineRimeHeart, LaboratoryExperimentId.InfuseFireBoltWithRime, LaboratoryExperimentId.ChillThenIgnite }, seen);
        Assert.AreEqual(1, vault.Count(DragonEssenceId.RimeHeart), "Experiments only study the specimen.");

        var ready = ArcaneNexus.Node(Rimebrand, laboratory, vault, selection.Selected).Research.Single();
        Assert.AreEqual(NexusResearchStage.ReadyToStabilize, ready.Stage);
        Assert.AreEqual(3, ready.ConditionsKnown);
        Assert.IsTrue(ready.Material!.Met);

        Assert.IsTrue(laboratory.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true));
        var discovered = ArcaneNexus.Node(Rimebrand, laboratory, vault, selection.Selected);
        Assert.AreEqual(NexusResearchStage.Discovered, discovered.Research.Single().Stage);
        Assert.IsNull(discovered.Research.Single().Material, "A permanent discovery needs no further material.");
        Assert.AreEqual(NexusActionKind.AllocateNode, discovered.Research.Single().Next.Kind);
        Assert.IsFalse(discovered.Socket!.Unlocked);

        var plan = PassiveTreePlanner.Plan(selection, Rimebrand)!;
        Assert.IsTrue(selection.SelectPath(plan.NodeIds));
        var open = ArcaneNexus.Node(Rimebrand, laboratory, vault, selection.Selected);
        Assert.AreEqual(NexusActionKind.Equip, open.Research.Single().Next.Kind);
        CollectionAssert.Contains(open.Socket!.Equippable.ToArray(), LaboratoryMutationId.RimeInfusion);

        Assert.AreEqual(MutationEquipResult.Equipped, laboratory.Equip(LaboratoryMutationId.RimeInfusion, ArcaneMutationSocketId.Rimebrand, selection.Selected));
        loadouts.Save(0, selection, laboratory);
        var equipped = ArcaneNexus.Node(Rimebrand, laboratory, vault, selection.Selected, loadouts);
        Assert.AreEqual(NexusResearchStage.Equipped, equipped.Research.Single().Stage);
        Assert.AreEqual(LaboratoryMutationId.RimeInfusion, equipped.Socket!.Holder);
        CollectionAssert.AreEqual(new[] { HuntLoadoutBook.DefaultName(0) }, equipped.Research.Single().LoadoutReferences.ToArray());
        Assert.AreEqual(NexusResearchStage.Equipped, ArcaneNexus.Mark(Rimebrand, laboratory, vault, selection.Selected));
    }

    [TestMethod]
    public void Suggest_PointsAtTheNodeHostingTheNextStep()
    {
        var laboratory = new LaboratoryState();
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.StormHeart);

        var suggestion = ArcaneNexus.Suggest(laboratory, vault, new HashSet<string>());

        Assert.IsNotNull(suggestion);
        Assert.AreEqual("hybrid-storm-arcane-2", suggestion.NodeId);
        Assert.AreEqual(LaboratoryMutationId.StormInfusion, suggestion.Mutation);
        Assert.AreEqual(LaboratoryPromptKind.Experiment, suggestion.Kind);
    }
}
