using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.RealmInfluence;

public static class RealmInfluenceCatalog
{
    private static readonly IReadOnlyDictionary<DragonId, RealmInfluenceProfile> Profiles = new Dictionary<DragonId, RealmInfluenceProfile>
    {
        [DragonId.Ashfang] = Profile(DragonId.Ashfang, RealmInfluenceEffect.Ashfall, RealmInfluenceEffect.ScorchMarks, RealmInfluenceEffect.HeatHaze, RealmInfluenceEffect.WyrmShadow),
        [DragonId.Stormcoil] = Profile(DragonId.Stormcoil, RealmInfluenceEffect.StaticArcs, RealmInfluenceEffect.LightningFlashes, RealmInfluenceEffect.ChargedGround, RealmInfluenceEffect.StormPulse),
        [DragonId.Rimeclaw] = Profile(DragonId.Rimeclaw, RealmInfluenceEffect.FrostMotes, RealmInfluenceEffect.RimeVeins, RealmInfluenceEffect.ColdHaze, RealmInfluenceEffect.IcePulse),
        [DragonId.Voidweaver] = Profile(DragonId.Voidweaver, RealmInfluenceEffect.AetherMotes, RealmInfluenceEffect.RealityFractures, RealmInfluenceEffect.VoidHaze, RealmInfluenceEffect.ArcanePulse),
    };

    public static RealmInfluenceProfile Get(DragonId dragon) => Profiles.TryGetValue(dragon, out var profile)
        ? profile
        : throw new ArgumentOutOfRangeException(nameof(dragon), dragon, "No realm influence profile is registered for this dragon.");

    private static RealmInfluenceProfile Profile(DragonId dragon, RealmInfluenceEffect faint, RealmInfluenceEffect growing, RealmInfluenceEffect ominous, RealmInfluenceEffect imminent) =>
        new(dragon,
        [
            new(faint, DragonAttentionIntensity.Faint),
            new(growing, DragonAttentionIntensity.Growing),
            new(ominous, DragonAttentionIntensity.Ominous),
            new(imminent, DragonAttentionIntensity.Imminent),
        ]);
}
