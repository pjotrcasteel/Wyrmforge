using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Signature;

public enum FireballMutationId { MeteorHeart = 1, Detonation = 2, ScorchedEarth = 3, CinderNeedle = 4, PhoenixVolley = 5, PiercingEmber = 6, SeekerEmber = 7, Wildfire = 8, AshHarvest = 9, EmberRecall = 10 }

public sealed record FireballMutationDefinition(FireballMutationId Id, string Name, string Description, DragonEssenceId? ResearchSample, string Symbol, bool Playable = true);

public sealed record FireballUpgradeNeed(DragonEssenceId Material, int Required);

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

    // Initial recipe tuning, using real secured Ashfang materials. No fictional wallet or resources.
    public static IReadOnlyList<FireballUpgradeNeed> UpgradeTo(int nextLevel) => nextLevel switch
    {
        2 => [new(DragonEssenceId.CinderHeart, 1)],
        3 => [new(DragonEssenceId.MoltenFang, 1)],
        4 => [new(DragonEssenceId.CinderHeart, 1), new(DragonEssenceId.AshenWing, 1)],
        5 => [new(DragonEssenceId.CinderHeart, 1), new(DragonEssenceId.MoltenFang, 1), new(DragonEssenceId.AshenWing, 1)],
        _ => [],
    };

    // Rare Tier-II salvage gates the two highest core levels and Epic Tier-III salvage the last; the Essence costs above are unchanged.
    public static IReadOnlyList<HuntMaterialNeed> UpgradeMaterialsTo(int nextLevel) => nextLevel switch
    {
        4 => [new(HuntMaterialId.Emberglass, 1)],
        5 => [new(HuntMaterialId.Emberglass, 1), new(HuntMaterialId.Wyrmcinder, 1)],
        _ => [],
    };
}

public sealed class FireballCoreState
{
    private readonly HashSet<FireballMutationId> discovered = [];
    private readonly FireballMutationId?[] slots = new FireballMutationId?[5];

    public int Level { get; private set; } = 1;
    public IReadOnlySet<FireballMutationId> Discovered => new HashSet<FireballMutationId>(discovered);
    public IReadOnlyList<FireballMutationId?> Slots => slots.ToArray();
    public IReadOnlyList<FireballMutationId> Equipped => slots.Take(Level).OfType<FireballMutationId>().ToArray();
    public bool CanUpgrade(DragonEssenceVault vault, HuntMaterialSatchel materials) =>
        Level < 5 && FireballCoreCatalog.UpgradeTo(Level + 1).All(need => vault.Count(need.Material) >= need.Required)
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
        if (index < 0 || index >= Level) return false;
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
        foreach (var need in FireballCoreCatalog.UpgradeTo(Level + 1))
        {
            for (var i = 0; i < need.Required; i++)
            {
                if (vault.TryConsume(need.Material, out var rarity)) { spent.Add(new SecuredEssence(need.Material, rarity)); continue; }
                Refund(vault, spent);
                return false;
            }
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
        for (var i = 0; i < Math.Min(Level, savedSlots.Length); i++)
        {
            if (savedSlots[i] is not { } id || !discovered.Contains(id) || !taken.Add(id)) continue;
            slots[i] = id;
        }
    }
}
