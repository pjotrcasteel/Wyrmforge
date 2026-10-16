using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Tests.Progression.Laboratory;

[TestClass]
public sealed class LaboratoryResearchLeadTests
{
    private static readonly IReadOnlySet<string> NoNodes = new HashSet<string>();
    private static readonly IReadOnlySet<string> ChargedFocus = new HashSet<string> { "wyrmheart", "hybrid-storm-arcane-2" };

    private static DragonEssenceVault VaultWith(params DragonEssenceId[] essences)
    {
        var vault = new DragonEssenceVault();
        vault.Restore(essences);
        return vault;
    }

    private static LaboratoryState StormResearched(DragonEssenceVault vault)
    {
        var lab = new LaboratoryState();
        foreach (var experiment in new[] { LaboratoryExperimentId.ExamineStormHeart, LaboratoryExperimentId.ChargeArcaneOrb, LaboratoryExperimentId.CountOrbImpacts })
            Assert.IsTrue(lab.Run(experiment, vault).Novel);
        return lab;
    }

    [TestMethod]
    public void Catalog_StormInfusion_RealizesArcaneConduitThroughTheStormArcaneBridge()
    {
        var mutation = LaboratoryCatalog.Get(LaboratoryMutationId.StormInfusion);
        Assert.AreEqual(SpellId.ArcaneOrb, mutation.Foundation);
        Assert.AreEqual(SynergyId.ArcaneConduit, mutation.Realizes);
        Assert.IsTrue(SynergyCatalog.Get(SynergyId.ArcaneConduit).PrimarySpells!.Contains(SpellId.ArcaneOrb));
        Assert.AreEqual(DragonId.Stormcoil, mutation.SpecimenWyrm);
        Assert.AreEqual(BuildStatId.CastInterval, mutation.Modifiers.Stats.Single().Stat);
        var socket = LaboratoryCatalog.Get(mutation.Socket);
        Assert.IsTrue(PassiveTreeCatalog.All.Any(node => node.Id == socket.NodeId && node.Name == socket.NodeName));
    }

    [TestMethod]
    public void Catalog_EveryMutationHasItsOwnFourStepResearchArc()
    {
        foreach (var mutation in LaboratoryCatalog.Mutations)
        {
            var experiments = LaboratoryCatalog.ExperimentsFor(mutation.Id);
            Assert.AreEqual(4, experiments.Count, mutation.Name);
            Assert.AreEqual(1, experiments.Count(experiment => experiment.RequiresSample == mutation.Stabilizer), "One experiment examines the specimen.");
            Assert.IsTrue(experiments.Any(experiment => experiment.Outcome == LaboratoryExperimentOutcome.InstructiveFailure));
            Assert.IsTrue(experiments.Any(experiment => experiment.Outcome == LaboratoryExperimentOutcome.Incompatibility));
            CollectionAssert.IsSubsetOf(mutation.RequiresObservations.ToArray(), experiments.Select(experiment => experiment.Reveals).ToArray());
            Assert.IsTrue(mutation.RequiresObservations.All(observation => LaboratoryCatalog.ObservationLabel(observation).Length > 0));
            Assert.IsTrue(mutation.AwakenedText.Length > 0 && mutation.ReactionNoun.Length > 0);
        }
        Assert.AreEqual(LaboratoryCatalog.Mutations.Count, LaboratoryCatalog.Mutations.Select(mutation => mutation.Socket).Distinct().Count());
    }

    [TestMethod]
    public void StormInfusion_ResearchStabilizeAndEquip_ConsumesExactlyOneStormHeartWithConsent()
    {
        var vault = VaultWith(DragonEssenceId.StormHeart);
        var lab = StormResearched(vault);
        Assert.AreEqual(MutationResearchStatus.ReadyToStabilize, lab.Status(LaboratoryMutationId.StormInfusion, vault));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.StormHeart), "Experiments never consume the specimen.");
        Assert.IsFalse(lab.Stabilize(LaboratoryMutationId.StormInfusion, vault, consentToConsume: false));
        Assert.IsTrue(lab.Stabilize(LaboratoryMutationId.StormInfusion, vault, consentToConsume: true));
        Assert.AreEqual(0, vault.Count(DragonEssenceId.StormHeart));
        Assert.AreEqual(MutationEquipResult.SocketLocked, lab.Equip(LaboratoryMutationId.StormInfusion, NoNodes));
        Assert.AreEqual(MutationEquipResult.Equipped, lab.Equip(LaboratoryMutationId.StormInfusion, ChargedFocus));
        CollectionAssert.AreEqual(new[] { LaboratoryMutationId.StormInfusion }, lab.PreparedFor(ChargedFocus).ToArray());
        Assert.AreEqual(MutationResearchStatus.MissingObservations, lab.Status(LaboratoryMutationId.RimeInfusion, vault), "Research is per recipe.");
    }

    [TestMethod]
    public void Track_WhileSpecimenMissing_PointsTheNextHuntAtItsWyrm()
    {
        var vault = new DragonEssenceVault();
        var lab = new LaboratoryState();
        Assert.IsNull(lab.LeadWyrm(vault));
        Assert.IsTrue(lab.Track(LaboratoryMutationId.RimeInfusion, vault));
        Assert.AreEqual(DragonId.Rimeclaw, lab.LeadWyrm(vault));
        Assert.IsTrue(lab.Track(LaboratoryMutationId.StormInfusion, vault), "Only one lead at a time; tracking switches it.");
        Assert.AreEqual(DragonId.Stormcoil, lab.LeadWyrm(vault));
        lab.Untrack();
        Assert.IsNull(lab.LeadWyrm(vault));
    }

    [TestMethod]
    public void Track_WhenSpecimenHeldOrStabilized_IsRefused()
    {
        var vault = VaultWith(DragonEssenceId.RimeHeart);
        var lab = new LaboratoryState();
        Assert.IsFalse(lab.Track(LaboratoryMutationId.RimeInfusion, vault));
        Assert.IsNull(lab.Tracked);
    }

    [TestMethod]
    public void ReconcileLead_AfterSecuringTheSpecimen_ClearsTheLeadOnce()
    {
        var vault = new DragonEssenceVault();
        var lab = new LaboratoryState();
        lab.Track(LaboratoryMutationId.StormInfusion, vault);
        Assert.IsFalse(lab.ReconcileLead(vault), "A missed specimen keeps the lead for the next hunt.");
        vault.Store(DragonEssenceId.StormHeart);
        Assert.IsNull(lab.LeadWyrm(vault), "A held specimen never forces another encounter.");
        Assert.IsTrue(lab.ReconcileLead(vault));
        Assert.IsNull(lab.Tracked);
        Assert.IsFalse(lab.ReconcileLead(vault));
    }

    [TestMethod]
    public void Stabilize_TrackedMutation_ClearsItsLead()
    {
        var vault = VaultWith(DragonEssenceId.StormHeart);
        var lab = new LaboratoryState();
        lab.Track(LaboratoryMutationId.StormInfusion, new DragonEssenceVault());
        foreach (var experiment in LaboratoryCatalog.ExperimentsFor(LaboratoryMutationId.StormInfusion)) lab.Run(experiment.Id, vault);
        Assert.IsTrue(lab.Stabilize(LaboratoryMutationId.StormInfusion, vault, consentToConsume: true));
        Assert.IsNull(lab.Tracked);
        Assert.IsFalse(lab.Track(LaboratoryMutationId.StormInfusion, vault), "A stabilized recipe needs no specimen.");
    }

    [TestMethod]
    public void SaveRoundTrip_PreservesTrackedLead()
    {
        var lab = new LaboratoryState();
        lab.Track(LaboratoryMutationId.StormInfusion, new DragonEssenceVault());
        var json = JsonSerializer.Serialize(lab.ToSave());
        var restored = new LaboratoryState();
        restored.Restore(JsonSerializer.Deserialize<LaboratorySave>(json));
        Assert.AreEqual(LaboratoryMutationId.StormInfusion, restored.Tracked);
    }

    [TestMethod]
    public void Restore_V1SaveWithoutTracked_LoadsWithNoLead()
    {
        const string v1 = """{"Version":1,"Observations":["RimePreservesCold"],"Mutations":[],"Equipped":null,"FieldTests":0,"FieldReactions":0}""";
        var lab = new LaboratoryState();
        lab.Restore(JsonSerializer.Deserialize<LaboratorySave>(v1));
        Assert.IsNull(lab.Tracked);
        Assert.IsTrue(lab.HasObserved(LaboratoryObservationId.RimePreservesCold));
    }

    [TestMethod]
    public void Restore_TrackedButStabilizedOrUnknown_IsDropped()
    {
        var lab = new LaboratoryState();
        lab.Restore(new LaboratorySave(1, [], ["StormInfusion"], null, 0, 0, "StormInfusion"));
        Assert.IsNull(lab.Tracked);
        lab.Restore(new LaboratorySave(1, [], [], null, 0, 0, "NotAMutation"));
        Assert.IsNull(lab.Tracked);
    }

    [TestMethod]
    public void Advisor_FreshLaboratory_PointsAtTheSpecimenHunt()
    {
        var prompt = LaboratoryAdvisor.Next(new LaboratoryState(), new DragonEssenceVault(), NoNodes);
        Assert.IsNotNull(prompt);
        Assert.AreEqual(LaboratoryPromptKind.HuntSpecimen, prompt.Kind);
        Assert.AreEqual(LaboratoryMutationId.RimeInfusion, prompt.Mutation);
        StringAssert.Contains(prompt.Text, "Track Rimeclaw");
    }

    [TestMethod]
    public void Advisor_TrackedLead_IsPromptedFirstAndSaysTheWyrmAnswers()
    {
        var lab = new LaboratoryState();
        lab.Track(LaboratoryMutationId.StormInfusion, new DragonEssenceVault());
        var prompt = LaboratoryAdvisor.Next(lab, new DragonEssenceVault(), NoNodes)!;
        Assert.AreEqual(LaboratoryMutationId.StormInfusion, prompt.Mutation);
        StringAssert.Contains(prompt.Text, "Stormcoil answers your next hunt");
    }

    [TestMethod]
    public void Advisor_NewSpecimen_PromptsTheNovelExperimentBeforeAnyHunt()
    {
        var prompt = LaboratoryAdvisor.Next(new LaboratoryState(), VaultWith(DragonEssenceId.StormHeart), NoNodes)!;
        Assert.AreEqual(LaboratoryPromptKind.Experiment, prompt.Kind);
        Assert.AreEqual(LaboratoryMutationId.StormInfusion, prompt.Mutation);
        StringAssert.Contains(prompt.Text, "Examine the Storm Heart");
    }

    [TestMethod]
    public void Advisor_DeadEndExperiment_IsNeverPromoted()
    {
        var vault = VaultWith(DragonEssenceId.StormHeart);
        var lab = new LaboratoryState();
        lab.Run(LaboratoryExperimentId.ExamineStormHeart, vault);
        var prompt = LaboratoryAdvisor.Next(lab, vault, NoNodes)!;
        Assert.AreEqual(LaboratoryPromptKind.Experiment, prompt.Kind);
        StringAssert.Contains(prompt.Text, "Charge Arcane Orb");
    }

    [TestMethod]
    public void Advisor_ReadyToStabilize_OutranksEverything()
    {
        var vault = VaultWith(DragonEssenceId.StormHeart, DragonEssenceId.RimeHeart);
        var lab = StormResearched(vault);
        var prompt = LaboratoryAdvisor.Next(lab, vault, NoNodes)!;
        Assert.AreEqual(LaboratoryPromptKind.Stabilize, prompt.Kind);
        Assert.AreEqual(LaboratoryMutationId.StormInfusion, prompt.Mutation);
    }

    [TestMethod]
    public void Advisor_StabilizedButUnequipped_PointsAtTheSocketThenTheEquip()
    {
        var vault = VaultWith(DragonEssenceId.StormHeart, DragonEssenceId.RimeHeart);
        var lab = StormResearched(vault);
        lab.Stabilize(LaboratoryMutationId.StormInfusion, vault, consentToConsume: true);
        foreach (var experiment in LaboratoryCatalog.ExperimentsFor(LaboratoryMutationId.RimeInfusion)) lab.Run(experiment.Id, vault);
        lab.Stabilize(LaboratoryMutationId.RimeInfusion, vault, consentToConsume: true);

        var locked = LaboratoryAdvisor.Next(lab, vault, NoNodes)!;
        Assert.AreEqual(LaboratoryPromptKind.UnlockSocket, locked.Kind);
        var ready = LaboratoryAdvisor.Next(lab, vault, ChargedFocus)!;
        Assert.AreEqual(LaboratoryPromptKind.Equip, ready.Kind);

        lab.Equip(LaboratoryMutationId.StormInfusion, ChargedFocus);
        Assert.IsNull(LaboratoryAdvisor.Next(lab, vault, ChargedFocus), "Everything researched and a mutation equipped: nothing to nag about.");
    }
}
