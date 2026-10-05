using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Domain.Combat.Projectiles;

public sealed record ProjectileStatusEffect(CombatStatusId Status, double DurationSeconds, int Stacks = 1);
