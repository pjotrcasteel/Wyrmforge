using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Signature;

public enum FireballMutationId { MeteorHeart, Detonation, ScorchedEarth }

public sealed record FireballMutationDefinition(FireballMutationId Id, string Name, string Description, DragonEssenceId ResearchSample, string Symbol);

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
    ];

    public static FireballMutationDefinition Get(FireballMutationId id) => Mutations.Single(mutation => mutation.Id == id);

    // Initial recipe tuning, using real secured Ashfang materials. No fictional wallet or resources.
    public static IReadOnlyList<FireballUpgradeNeed> UpgradeTo(int nextLevel) => nextLevel switch
    {
        2 => [new(DragonEssenceId.CinderHeart, 1)],
        3 => [new(DragonEssenceId.MoltenFang, 1)],
        4 => [new(DragonEssenceId.CinderHeart, 1), new(DragonEssenceId.AshenWing, 1)],
        5 => [new(DragonEssenceId.CinderHeart, 1), new(DragonEssenceId.MoltenFang, 1), new(DragonEssenceId.AshenWing, 1)],
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
    public bool CanUpgrade(DragonEssenceVault vault) =>
        Level < 5 && FireballCoreCatalog.UpgradeTo(Level + 1).All(need => vault.Count(need.Material) >= need.Required);

    public bool DiscoverSecured(IEnumerable<DragonEssenceId> secured)
    {
        ArgumentNullException.ThrowIfNull(secured);
        var owned = secured.ToHashSet();
        var changed = false;
        foreach (var candidate in FireballCoreCatalog.Mutations)
            if (owned.Contains(candidate.ResearchSample)) changed |= discovered.Add(candidate.Id);
        return changed;
    }

    public bool Equip(int index, FireballMutationId? mutation)
    {
        if (index < 0 || index >= Level) return false;
        if (mutation is { } id)
        {
            if (!discovered.Contains(id) || !FireballCoreCatalog.Mutations.Any(entry => entry.Id == id)) return false;
            if (slots.Where((_, i) => i != index).Any(value => value == id)) return false;
        }
        slots[index] = mutation;
        return true;
    }

    public bool Upgrade(DragonEssenceVault vault)
    {
        ArgumentNullException.ThrowIfNull(vault);
        if (!CanUpgrade(vault)) return false;
        var spent = new List<DragonEssenceId>();
        foreach (var need in FireballCoreCatalog.UpgradeTo(Level + 1))
        {
            for (var i = 0; i < need.Required; i++)
            {
                if (vault.Consume(need.Material)) { spent.Add(need.Material); continue; }
                foreach (var item in spent) vault.Store(item);
                return false;
            }
        }
        Level++;
        return true;
    }

    public FireballCoreSave ToSave() => new(Level, discovered.OrderBy(id => id).ToArray(), slots.ToArray());

    public void Restore(FireballCoreSave? state)
    {
        if (state is null) return;
        Level = Math.Clamp(state.Level, 1, 5);
        discovered.Clear();
        foreach (var mutation in state.Discovered ?? [])
            if (FireballCoreCatalog.Mutations.Any(entry => entry.Id == mutation)) discovered.Add(mutation);
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
