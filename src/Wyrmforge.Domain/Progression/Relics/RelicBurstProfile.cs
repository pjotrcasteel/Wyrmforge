using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Progression.Relics;

public sealed record RelicBurstProfile(CombatStatusId Status, double Damage, double Radius, double SpreadSeconds)
{
    public bool Matches(CombatStatusCollection statuses) => statuses.Has(Status) || Status == CombatStatusId.Chilled && statuses.Has(CombatStatusId.Frozen);
}
