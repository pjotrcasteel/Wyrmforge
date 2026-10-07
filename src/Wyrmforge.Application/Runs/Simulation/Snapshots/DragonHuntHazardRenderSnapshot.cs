using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record DragonHuntHazardRenderSnapshot(
    double X,
    double Y,
    double Radius,
    double Progress,
    SpellSchool School,
    DragonHuntSignatureKind? Signature = null,
    bool Armed = true);
