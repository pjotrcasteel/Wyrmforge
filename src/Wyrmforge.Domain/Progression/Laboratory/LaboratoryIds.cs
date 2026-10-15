namespace Wyrmforge.Domain.Progression.Laboratory;

// Persisted by name: never rename or reorder without a save migration.
public enum LaboratoryObservationId
{
    RimePreservesCold,
    ThermalShockUnstable,
    FireShattersFrozen,
    QuenchingSmothersFlame,
}

public enum LaboratoryExperimentId
{
    ExamineRimeHeart,
    InfuseFireBoltWithRime,
    QuenchFireBoltInRime,
    ChillThenIgnite,
}

public enum LaboratoryMutationId
{
    RimeInfusion,
}

public enum ArcaneMutationSocketId
{
    Rimebrand,
}

public enum LaboratoryExperimentOutcome
{
    Insight,
    InstructiveFailure,
    Incompatibility,
}
