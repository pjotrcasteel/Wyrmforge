using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record DragonRenderSnapshot(string Name, string Title, SpellSchool School, double X, double Y, double Radius, double Health, double MaxHealth, int Phase, bool Frozen,
    IReadOnlyList<CombatStatusRenderSnapshot> Statuses);
