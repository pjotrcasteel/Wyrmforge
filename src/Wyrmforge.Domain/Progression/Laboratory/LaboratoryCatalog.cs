using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Progression.Laboratory;

public sealed record LaboratoryExperimentDefinition(
    LaboratoryExperimentId Id,
    string Name,
    string Hypothesis,
    LaboratoryExperimentOutcome Outcome,
    LaboratoryObservationId Reveals,
    string Finding,
    string NextStep,
    DragonEssenceId? RequiresSample,
    IReadOnlyList<LaboratoryObservationId> RequiresObservations);

public sealed record ArcaneMutationSocketDefinition(ArcaneMutationSocketId Id, string Name, string NodeId, string NodeName, string Route);

// A mutation changes the one primary cast; it never adds a second attack stream.
// It realizes an existing synergy so the legacy and researched effect can never stack.
public sealed record LaboratoryMutationDefinition(
    LaboratoryMutationId Id,
    string Name,
    string Summary,
    string TradeOff,
    SpellId Foundation,
    SynergyId Realizes,
    DragonEssenceId Stabilizer,
    ArcaneMutationSocketId Socket,
    IReadOnlyList<LaboratoryObservationId> RequiresObservations,
    BuildModifierProfile Modifiers);

public static class LaboratoryCatalog
{
    // Tuning hypothesis (handover §17), not a balance commitment.
    public const double RimeInfusionDamageTradeOff = -0.10;

    public static IReadOnlyList<LaboratoryExperimentDefinition> Experiments { get; } =
    [
        new(LaboratoryExperimentId.ExamineRimeHeart, "Examine the Rime Heart",
            "Does Rimeclaw's heart hold a cold that survives outside the Wyrm?",
            LaboratoryExperimentOutcome.Insight, LaboratoryObservationId.RimePreservesCold,
            "The heart keeps a cold that does not melt. It could carry frost into a spell.",
            "Try binding that cold to Fire Bolt.",
            DragonEssenceId.RimeHeart, []),
        new(LaboratoryExperimentId.InfuseFireBoltWithRime, "Infuse Fire Bolt with rime",
            "Can one bolt carry fire and frost together?",
            LaboratoryExperimentOutcome.InstructiveFailure, LaboratoryObservationId.ThermalShockUnstable,
            "The frost boils away in flight. Fire and frost cannot share one impact; the cold must reach the target first.",
            "Test freezing the target with the cast, then letting fire strike it.",
            null, [LaboratoryObservationId.RimePreservesCold]),
        new(LaboratoryExperimentId.QuenchFireBoltInRime, "Quench Fire Bolt in rime",
            "Will cooling the flame make it stable?",
            LaboratoryExperimentOutcome.Incompatibility, LaboratoryObservationId.QuenchingSmothersFlame,
            "Quenching smothers the flame: weaker fire and no reaction. This path is ruled out.",
            "Infusion, not quenching, is the way forward.",
            null, [LaboratoryObservationId.RimePreservesCold]),
        new(LaboratoryExperimentId.ChillThenIgnite, "Freeze, then ignite",
            "Does fire striking a frozen target release the trapped cold?",
            LaboratoryExperimentOutcome.Insight, LaboratoryObservationId.FireShattersFrozen,
            "A frozen target shatters when Fire Bolt hits it: double damage and a burst of thermal shock.",
            "Stabilize Rime Infusion with a secured Rime Heart.",
            null, [LaboratoryObservationId.ThermalShockUnstable]),
    ];

    public static IReadOnlyList<ArcaneMutationSocketDefinition> Sockets { get; } =
    [
        new(ArcaneMutationSocketId.Rimebrand, "Rimebrand socket", "hybrid-fire-frost-2", "Rimebrand", "Fire–Frost bridge"),
    ];

    public static IReadOnlyList<LaboratoryMutationDefinition> Mutations { get; } =
    [
        new(LaboratoryMutationId.RimeInfusion, "Rime Infusion",
            "Fire Bolt freezes and burns from the first cast. Frozen targets shatter (Frostfire).",
            "−10% spell damage while Fire Bolt carries the rime.",
            SpellId.FireBolt, SynergyId.Frostfire, DragonEssenceId.RimeHeart, ArcaneMutationSocketId.Rimebrand,
            [LaboratoryObservationId.RimePreservesCold, LaboratoryObservationId.ThermalShockUnstable, LaboratoryObservationId.FireShattersFrozen],
            new BuildModifierProfile([new BuildStatModifier(BuildStatId.Damage, BuildStatOperation.PercentAdd, RimeInfusionDamageTradeOff)])),
    ];

    public static LaboratoryExperimentDefinition Get(LaboratoryExperimentId id) => Experiments.Single(experiment => experiment.Id == id);
    public static LaboratoryMutationDefinition Get(LaboratoryMutationId id) => Mutations.Single(mutation => mutation.Id == id);
    public static ArcaneMutationSocketDefinition Get(ArcaneMutationSocketId id) => Sockets.Single(socket => socket.Id == id);
}
