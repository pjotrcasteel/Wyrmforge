using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Composition;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Progression.Laboratory;

public sealed record LaboratoryExperimentDefinition(
    LaboratoryExperimentId Id,
    LaboratoryMutationId Mutation,
    string Name,
    string Hypothesis,
    LaboratoryExperimentOutcome Outcome,
    LaboratoryObservationId Reveals,
    string Label,
    string Finding,
    string NextStep,
    DragonEssenceId? RequiresSample,
    IReadOnlyList<LaboratoryObservationId> RequiresObservations);

// A socket accepts blueprints by structural tags (its Arcane Web bridge's elements), not by SpellId.
public sealed record ArcaneMutationSocketDefinition(ArcaneMutationSocketId Id, string Name, string NodeId, string NodeName, string Route, IReadOnlyList<SpellTag> Accepts);

// A mutation changes the one primary cast; it never adds a second attack stream.
// Its blueprint's reaction realizes an existing synergy so the legacy and researched effect can never stack.
public sealed record LaboratoryMutationDefinition(
    LaboratoryMutationId Id,
    string Name,
    string Summary,
    string TradeOff,
    string AwakenedText,
    string ReactionNoun,
    SpellBlueprint Blueprint,
    DragonEssenceId Stabilizer,
    ArcaneMutationSocketId Socket,
    IReadOnlyList<LaboratoryObservationId> RequiresObservations,
    BuildModifierProfile Modifiers)
{
    public SpellId Foundation => Blueprint.Foundation;

    // Socket is the home socket the research points to; any socket whose tags accept the blueprint can hold it.
    public BlueprintValidation Validation => ValidationFor(Socket);

    public BlueprintValidation ValidationFor(ArcaneMutationSocketId socket) =>
        BlueprintValidator.Validate(Blueprint, BlueprintRuleset.Current, LaboratoryCatalog.Get(socket).Accepts);

    public IReadOnlyList<ArcaneMutationSocketId> CompatibleSockets =>
        LaboratoryCatalog.Sockets.Where(socket => ValidationFor(socket.Id).IsValid).Select(socket => socket.Id).ToArray();

    public SynergyId Realizes => Validation.Realizes ?? throw new InvalidOperationException($"{Name}'s blueprint realizes no reaction.");

    public DragonEssenceDefinition Specimen => DragonEssenceCatalog.All.Single(essence => essence.Id == Stabilizer);

    public DragonId SpecimenWyrm => DragonCatalog.All.First(dragon => DragonEssenceCatalog.ChoicesFor(dragon.Id).Any(choice => choice.Id == Stabilizer)).Id;
}

public static class LaboratoryCatalog
{
    // Tuning hypotheses (handover §17), not balance commitments. See docs/design/laboratory-tuning-v1.md.
    public const double RimeInfusionDamageTradeOff = -0.15;
    public const double StormInfusionCastIntervalTradeOff = 0.15;

    // Handover §15 Phase C: at most two socketed mutations; only the one matching the primary wakes.
    public const int MaxEquippedMutations = 2;

    public static IReadOnlyList<LaboratoryExperimentDefinition> Experiments { get; } =
    [
        new(LaboratoryExperimentId.ExamineRimeHeart, LaboratoryMutationId.RimeInfusion, "Examine the Rime Heart",
            "Does Rimeclaw's heart hold a cold that survives outside the Wyrm?",
            LaboratoryExperimentOutcome.Insight, LaboratoryObservationId.RimePreservesCold, "Rime holds cold",
            "The heart keeps a cold that does not melt. It could carry frost into a spell.",
            "Try binding that cold to Fire Bolt.",
            DragonEssenceId.RimeHeart, []),
        new(LaboratoryExperimentId.InfuseFireBoltWithRime, LaboratoryMutationId.RimeInfusion, "Infuse Fire Bolt with rime",
            "Can one bolt carry fire and frost together?",
            LaboratoryExperimentOutcome.InstructiveFailure, LaboratoryObservationId.ThermalShockUnstable, "Cold must land first",
            "The frost boils away in flight. Fire and frost cannot share one impact; the cold must reach the target first.",
            "Test freezing the target with the cast, then letting fire strike it.",
            null, [LaboratoryObservationId.RimePreservesCold]),
        new(LaboratoryExperimentId.QuenchFireBoltInRime, LaboratoryMutationId.RimeInfusion, "Quench Fire Bolt in rime",
            "Will cooling the flame make it stable?",
            LaboratoryExperimentOutcome.Incompatibility, LaboratoryObservationId.QuenchingSmothersFlame, "Smothered flame",
            "Quenching smothers the flame: weaker fire and no reaction. This path is ruled out.",
            "Infusion, not quenching, is the way forward.",
            null, [LaboratoryObservationId.RimePreservesCold]),
        new(LaboratoryExperimentId.ChillThenIgnite, LaboratoryMutationId.RimeInfusion, "Freeze, then ignite",
            "Does fire striking a frozen target release the trapped cold?",
            LaboratoryExperimentOutcome.Insight, LaboratoryObservationId.FireShattersFrozen, "Fire shatters ice",
            "A frozen target shatters when Fire Bolt hits it: double damage and a burst of thermal shock.",
            "Stabilize Rime Infusion with a secured Rime Heart.",
            null, [LaboratoryObservationId.ThermalShockUnstable]),

        new(LaboratoryExperimentId.ExamineStormHeart, LaboratoryMutationId.StormInfusion, "Examine the Storm Heart",
            "Does Stormcoil's heart still beat with its own rhythm?",
            LaboratoryExperimentOutcome.Insight, LaboratoryObservationId.StormHeartKeepsRhythm, "Heart keeps rhythm",
            "The heart pulses in a steady count, releasing lightning on every beat. Charge can be stored and timed.",
            "Try charging Arcane Orb with the pulse.",
            DragonEssenceId.StormHeart, []),
        new(LaboratoryExperimentId.ChargeArcaneOrb, LaboratoryMutationId.StormInfusion, "Charge Arcane Orb",
            "Can the orb carry the storm and release it on impact?",
            LaboratoryExperimentOutcome.InstructiveFailure, LaboratoryObservationId.ChargeBleedsOnContact, "Charge bleeds away",
            "Every impact bleeds the charge into the ground. A single hit cannot hold a storm; it must build over several.",
            "Count the impacts and see whether the charge accumulates.",
            null, [LaboratoryObservationId.StormHeartKeepsRhythm]),
        new(LaboratoryExperimentId.GroundArcaneOrb, LaboratoryMutationId.StormInfusion, "Ground the orb",
            "Will grounding the orb make the charge safe to carry?",
            LaboratoryExperimentOutcome.Incompatibility, LaboratoryObservationId.GroundingDrainsCharge, "Grounding drains it",
            "Grounding drains every spark: a quieter orb and no discharge. This path is ruled out.",
            "Store the charge across hits instead of draining it.",
            null, [LaboratoryObservationId.StormHeartKeepsRhythm]),
        new(LaboratoryExperimentId.CountOrbImpacts, LaboratoryMutationId.StormInfusion, "Count the impacts",
            "Does the orb remember charge across several hits?",
            LaboratoryExperimentOutcome.Insight, LaboratoryObservationId.OrbStoresCharge, "Orb stores charge",
            "The orb holds the pulse: every fourth impact discharges a chain of lightning from the target.",
            "Stabilize Storm Infusion with a secured Storm Heart.",
            null, [LaboratoryObservationId.ChargeBleedsOnContact]),
    ];

    public static IReadOnlyList<ArcaneMutationSocketDefinition> Sockets { get; } =
    [
        new(ArcaneMutationSocketId.Rimebrand, "Rimebrand socket", "hybrid-fire-frost-2", "Rimebrand", "Fire–Frost bridge", [SpellTag.Fire, SpellTag.Frost]),
        new(ArcaneMutationSocketId.ChargedFocus, "Charged Focus socket", "hybrid-storm-arcane-2", "Charged Focus", "Storm–Arcane bridge", [SpellTag.Storm, SpellTag.Arcane]),
        new(ArcaneMutationSocketId.Flashfire, "Flashfire socket", "hybrid-fire-storm-2", "Flashfire", "Fire–Storm bridge", [SpellTag.Fire, SpellTag.Storm]),
        new(ArcaneMutationSocketId.GlacialLens, "Glacial Lens socket", "hybrid-arcane-frost-2", "Glacial Lens", "Arcane–Frost bridge", [SpellTag.Arcane, SpellTag.Frost]),
    ];

    public static IReadOnlyList<LaboratoryMutationDefinition> Mutations { get; } =
    [
        new(LaboratoryMutationId.RimeInfusion, "Rime Infusion",
            "Fire Bolt freezes and burns from the first cast. Frozen targets shatter (Frostfire).",
            "−15% spell damage while Fire Bolt carries the rime.",
            "Fire Bolt freezes and burns. Strike frozen foes to shatter them.", "shatter",
            new SpellBlueprint(SpellId.FireBolt, SpellComponentId.Bolt, SpellComponentId.RimeInfusion, SpellComponentId.ThermalShatter), DragonEssenceId.RimeHeart, ArcaneMutationSocketId.Rimebrand,
            [LaboratoryObservationId.RimePreservesCold, LaboratoryObservationId.ThermalShockUnstable, LaboratoryObservationId.FireShattersFrozen],
            new BuildModifierProfile([new BuildStatModifier(BuildStatId.Damage, BuildStatOperation.PercentAdd, RimeInfusionDamageTradeOff)])),
        new(LaboratoryMutationId.StormInfusion, "Storm Infusion",
            "Arcane Orb stores charge from the first cast. Every 4th impact discharges chain lightning (Arcane Conduit).",
            "Casts 15% slower while Arcane Orb holds the storm.",
            "Arcane Orb holds the storm. Every 4th impact discharges lightning.", "discharge",
            new SpellBlueprint(SpellId.ArcaneOrb, SpellComponentId.Bolt, SpellComponentId.StormCharge, SpellComponentId.ConduitDischarge), DragonEssenceId.StormHeart, ArcaneMutationSocketId.ChargedFocus,
            [LaboratoryObservationId.StormHeartKeepsRhythm, LaboratoryObservationId.ChargeBleedsOnContact, LaboratoryObservationId.OrbStoresCharge],
            new BuildModifierProfile([new BuildStatModifier(BuildStatId.CastInterval, BuildStatOperation.PercentAdd, StormInfusionCastIntervalTradeOff)])),
    ];

    public static LaboratoryExperimentDefinition Get(LaboratoryExperimentId id) => Experiments.Single(experiment => experiment.Id == id);
    public static LaboratoryMutationDefinition Get(LaboratoryMutationId id) => Mutations.Single(mutation => mutation.Id == id);
    public static ArcaneMutationSocketDefinition Get(ArcaneMutationSocketId id) => Sockets.Single(socket => socket.Id == id);
    public static IReadOnlyList<LaboratoryExperimentDefinition> ExperimentsFor(LaboratoryMutationId id) => Experiments.Where(experiment => experiment.Mutation == id).ToArray();
    public static string ObservationLabel(LaboratoryObservationId id) => Experiments.Single(experiment => experiment.Reveals == id).Label;
}
