using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.RealmInfluence;

public sealed record RealmInfluenceCue(DragonId Source, RealmInfluenceEffect Effect, double Strength);
