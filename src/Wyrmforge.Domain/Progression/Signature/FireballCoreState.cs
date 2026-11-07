using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Signature;

public enum FireballMutationId { MeteorHeart = 1, Detonation = 2, ScorchedEarth = 3, CinderNeedle = 4, PhoenixVolley = 5, PiercingEmber = 6, SeekerEmber = 7, Wildfire = 8, AshHarvest = 9, EmberRecall = 10 }

public sealed record FireballMutationDefinition(FireballMutationId Id, string Name, string Description, DragonEssenceId? ResearchSample, string Symbol, bool Playable = true);

public sealed record FireballCoreSave(int Level, FireballMutationId[]? Discovered, FireballMutationId?[]? Slots);

public static class FireballCoreCatalog
{
    // These are the currently implemented effects, not the remaining proposed Tier-I mutations.
    public static IReadOnlyList<FireballMutationDefinition> Mutations { get; } =
    [
        new(FireballMutationId.MeteorHeart, "Meteor Heart", "A larger, slower and harder-hitting molten projectile.", DragonEssenceId.MoltenFang, "◈"),
        new(FireballMutationId.Detonation, "Detonation", "Fireball explodes on impact, damaging nearby enemies.", DragonEssenceId.CinderHeart, "✹"),
        new(FireballMutationId.ScorchedEarth, "Scorched Earth", "Fireball leaves a short-lived patch of burning ground.", DragonEssenceId.AshenWing, "♨"),
        // Shown as future research only. Never equip or run concepts without implemented combat effects.
        new(FireballMutationId.CinderNeedle, "Cinder Needle", "A faster, smaller Fireball with reduced impact damage.", null, "➤"),
        new(FireballMutationId.PhoenixVolley, "Phoenix Volley", "Splits Fireball into several projectiles.", null, "✧", false),
        new(FireballMutationId.PiercingEmber, "Piercing Ember", "Fireball passes through enemies.", null, "↗", false),
        new(FireballMutationId.SeekerEmber, "Seeker Ember", "Curves toward eligible enemies.", null, "⌁", false),
        new(FireballMutationId.Wildfire, "Wildfire", "Flames spread to nearby targets.", null, "♧", false),
        new(FireballMutationId.AshHarvest, "Ash Harvest", "Gathers embers when a foe falls.", null, "✦", false),
        new(FireballMutationId.EmberRecall, "Ember Recall", "Fireball returns after its flight.", null, "↶", false),
    ];

    public static FireballMutationDefinition Get(FireballMutationId id) => Mutations.Single(mutation => mutation.Id == id);

    // Each permanent core level grows only Fireball base damage, independently of in-Hunt spell ranks.
    // Research adds possible mutations; Web investment augments the effects of equipped mutations.
    public static double DamageMultiplier(int level) => 1 + 0.08 * (Math.Clamp(level, 1, 5) - 1);

    // Level 1 is the unmodified signature. Level 5 is the double-socket capstone,
    // retaining the Nexus's five visible sockets without adding a sixth core level.
    public static int SocketCapacityForLevel(int level) => Math.Clamp(level, 1, 5) switch
    {
        1 => 0,
        2 => 1,
        3 => 2,
        4 => 3,
        _ => 5,
    };

    public static int UnlockLevelForSocket(int index) => index switch
    {
        0 => 2,
        1 => 3,
        2 => 4,
        3 or 4 => 5,
        _ => throw new ArgumentOutOfRangeException(nameof(index)),
    };

    // Initial pacing: 1/2/3/4 secured Ashfang Essences for Levels 2/3/4/5.
    // Accept any Ashfang part to avoid random boss parts blocking progression;
    // consume low-rarity copies first, preserving the rarest for other research.
    public static int EssenceCountTo(int nextLevel) => nextLevel is >= 2 and <= 5 ? nextLevel - 1 : 0;

    public static IReadOnlyList<SecuredEssence> SelectUpgradeEssences(DragonEssenceVault vault, int nextLevel)
    {
        ArgumentNullException.ThrowIfNull(vault);
        var allowed = DragonEssenceCatalog.AshfangChoices.Select(choice => choice.Id).ToHashSet();
        return vault.Entries.Where(essence => allowed.Contains(essence.Id))
            .OrderBy(essence => essence.Rarity)
            .ThenBy(essence => essence.Id)
            .Take(EssenceCountTo(nextLevel))
            .ToArray();
    }

    public static DragonEssenceId? FirstUpgradeEssenceChoice(DragonEssenceVault vault) =>
        SelectUpgradeEssences(vault, 2).FirstOrDefault()?.Id;

    // Level 3 asks players to hunt Ashlings and break props, not just repeat Ashfang.
    // Level 4 needs elite/refuge Tier-II Rare salvage; Level 5 needs Tier-III Epic salvage.
    // Legendary ordinary materials belong to future Tier-IV/V content, not inaccessible current recipes.
    public static IReadOnlyList<HuntMaterialNeed> UpgradeMaterialsTo(int nextLevel) => nextLevel switch
    {
        3 => [new(HuntMaterialId.EmberResidue, 2), new(HuntMaterialId.CharredScrap, 2)],
        4 => [new(HuntMaterialId.Emberglass, 1), new(HuntMaterialId.EmberResidue, 3)],
        5 => [new(HuntMaterialId.Emberglass, 2), new(HuntMaterialId.Wyrmcinder, 1), new(HuntMaterialId.CharredScrap, 4)],
        _ => [],
    };
}

public sealed class FireballCoreState
{
    private readonly HashSet<FireballMutationId> discovered = [];
    private readonly FireballMutationId?[] slots = new FireballMutationId?[5];

    public int Level { get; private set; } = 1;
    public int SocketCapacity => FireballCoreCatalog.SocketCapacityForLevel(Level);
    public IReadOnlySet<FireballMutationId> Discovered => new HashSet<FireballMutationId>(discovered);
    public IReadOnlyList<FireballMutationId?> Slots => slots.ToArray();
    public IReadOnlyList<FireballMutationId> Equipped => slots.Take(SocketCapacity).OfType<FireballMutationId>().ToArray();
    public bool CanUpgrade(DragonEssenceVault vault, HuntMaterialSatchel materials) =>
        Level < 5 && FireballCoreCatalog.SelectUpgradeEssences(vault, Level + 1).Count == FireballCoreCatalog.EssenceCountTo(Level + 1)
        && FireballCoreCatalog.UpgradeMaterialsTo(Level + 1).All(need => materials.Count(need.Material) >= need.Required);

    public bool DiscoverSecured(IEnumerable<DragonEssenceId> secured)
    {
        ArgumentNullException.ThrowIfNull(secured);
        var owned = secured.ToHashSet();
        var changed = false;
        foreach (var candidate in FireballCoreCatalog.Mutations)
            if (candidate is { Playable: true, ResearchSample: { } sample } && owned.Contains(sample)) changed |= discovered.Add(candidate.Id);
        return changed;
    }

    public bool CanCraftCinderNeedle(HuntMaterialSatchel satchel) =>
        !discovered.Contains(FireballMutationId.CinderNeedle) &&
        HuntMaterialCatalog.CinderNeedleRecipe.All(need => satchel.Count(need.Material) >= need.Required);

    public bool CraftCinderNeedle(HuntMaterialSatchel satchel)
    {
        ArgumentNullException.ThrowIfNull(satchel);
        if (!CanCraftCinderNeedle(satchel) || !satchel.ConsumeRecipe(HuntMaterialCatalog.CinderNeedleRecipe)) return false;
        discovered.Add(FireballMutationId.CinderNeedle);
        return true;
    }

    public bool Equip(int index, FireballMutationId? mutation)
    {
        if (index < 0 || index >= SocketCapacity) return false;
        if (mutation is { } id)
        {
            if (!discovered.Contains(id) || !FireballCoreCatalog.Mutations.Any(entry => entry.Id == id && entry.Playable)) return false;
            if (slots.Where((_, i) => i != index).Any(value => value == id)) return false;
        }
        slots[index] = mutation;
        return true;
    }

    public bool Upgrade(DragonEssenceVault vault, HuntMaterialSatchel materials)
    {
        ArgumentNullException.ThrowIfNull(vault);
        ArgumentNullException.ThrowIfNull(materials);
        if (!CanUpgrade(vault, materials)) return false;
        var spent = new List<SecuredEssence>();
        foreach (var essence in FireballCoreCatalog.SelectUpgradeEssences(vault, Level + 1))
        {
            if (vault.TryConsume(essence.Id, out var rarity)) { spent.Add(new SecuredEssence(essence.Id, rarity)); continue; }
            Refund(vault, spent);
            return false;
        }
        if (!materials.ConsumeRecipe(FireballCoreCatalog.UpgradeMaterialsTo(Level + 1)))
        {
            Refund(vault, spent);
            return false;
        }
        Level++;
        return true;
    }

    private static void Refund(DragonEssenceVault vault, IEnumerable<SecuredEssence> spent)
    {
        foreach (var item in spent) vault.Store(item.Id, item.Rarity);
    }

    public FireballCoreSave ToSave() => new(Level, discovered.OrderBy(id => id).ToArray(), slots.ToArray());

    public void Restore(FireballCoreSave? state)
    {
        if (state is null) return;
        Level = Math.Clamp(state.Level, 1, 5);
        discovered.Clear();
        foreach (var mutation in state.Discovered ?? [])
            if (FireballCoreCatalog.Mutations.Any(entry => entry.Id == mutation && entry.Playable)) discovered.Add(mutation);
        Array.Clear(slots, 0, slots.Length);
        var taken = new HashSet<FireballMutationId>();
        var savedSlots = state.Slots ?? [];
        // Keep legacy loadouts in sealed slots: older saves could equip at Lv1 and
        // had one more socket at Lv2-4. They stay dormant, not erased, until unlocked.
        for (var i = 0; i < Math.Min(Level, savedSlots.Length); i++)
        {
            if (savedSlots[i] is not { } id || !discovered.Contains(id) || !taken.Add(id)) continue;
            slots[i] = id;
        }
    }
}
