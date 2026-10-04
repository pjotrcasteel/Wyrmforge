using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.RealmInfluence;

public static class RealmInfluenceCatalog
{
    private static readonly IReadOnlyDictionary<DragonId, RealmInfluenceProfile> Profiles = new Dictionary<DragonId, RealmInfluenceProfile>
    {
        [DragonId.Ashfang] = new(
            DragonId.Ashfang,
            [
                new(RealmInfluenceEffect.Ashfall, DragonAttentionIntensity.Faint),
                new(RealmInfluenceEffect.ScorchMarks, DragonAttentionIntensity.Growing),
                new(RealmInfluenceEffect.HeatHaze, DragonAttentionIntensity.Ominous),
                new(RealmInfluenceEffect.WyrmShadow, DragonAttentionIntensity.Imminent),
            ]),
        [DragonId.Stormcoil] = new(
            DragonId.Stormcoil,
            [
                new(RealmInfluenceEffect.StaticArcs, DragonAttentionIntensity.Faint),
                new(RealmInfluenceEffect.LightningFlashes, DragonAttentionIntensity.Growing),
                new(RealmInfluenceEffect.ChargedGround, DragonAttentionIntensity.Ominous),
                new(RealmInfluenceEffect.StormPulse, DragonAttentionIntensity.Imminent),
            ]),
    };

    public static RealmInfluenceProfile Get(DragonId dragon) => Profiles.TryGetValue(dragon, out var profile)
        ? profile
        : throw new ArgumentOutOfRangeException(nameof(dragon), dragon, "No realm influence profile is registered for this dragon.");
}
