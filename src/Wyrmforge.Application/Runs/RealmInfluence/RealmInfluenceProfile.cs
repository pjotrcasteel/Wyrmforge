using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.RealmInfluence;

public sealed record RealmInfluenceProfile(DragonId Dragon, IReadOnlyList<RealmInfluenceRule> Rules);
