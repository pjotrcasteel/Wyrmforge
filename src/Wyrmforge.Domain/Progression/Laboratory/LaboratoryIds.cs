namespace Wyrmforge.Domain.Progression.Laboratory;

// Persisted by name: never rename or reorder without a save migration.
public enum LaboratoryObservationId
{
    RimePreservesCold,
    ThermalShockUnstable,
    FireShattersFrozen,
    QuenchingSmothersFlame,
    StormHeartKeepsRhythm,
    ChargeBleedsOnContact,
    OrbStoresCharge,
    GroundingDrainsCharge,
}

public enum LaboratoryExperimentId
{
    ExamineRimeHeart,
    InfuseFireBoltWithRime,
    QuenchFireBoltInRime,
    ChillThenIgnite,
    ExamineStormHeart,
    ChargeArcaneOrb,
    GroundArcaneOrb,
    CountOrbImpacts,
}

public enum LaboratoryMutationId
{
    RimeInfusion,
    StormInfusion,
}

public enum ArcaneMutationSocketId
{
    Rimebrand,
    ChargedFocus,
    Flashfire,
    GlacialLens,
}

public enum LaboratoryExperimentOutcome
{
    Insight,
    InstructiveFailure,
    Incompatibility,
}
