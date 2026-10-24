using Wyrmforge.Domain.Progression.Loot;

namespace Wyrmforge.Domain.Progression.DragonEssences;

public sealed record SecuredEssence(DragonEssenceId Id, LootRarity Rarity);

public sealed class DragonEssenceVault
{
    /// <summary>Essences secured before graded loot came from Tier-I Wyrms, so ungraded saves read as Rare.</summary>
    public const LootRarity UngradedRarity = LootRarity.Rare;

    private readonly List<SecuredEssence> securedEssences = [];

    public IReadOnlyList<DragonEssenceId> SecuredEssences => securedEssences.Select(essence => essence.Id).ToArray();

    public IReadOnlyList<SecuredEssence> Entries => securedEssences.ToArray();

    public int TotalCount => securedEssences.Count;

    public int Count(DragonEssenceId id) => securedEssences.Count(essence => essence.Id == id);

    public int Count(DragonEssenceId id, LootRarity rarity) => securedEssences.Count(essence => essence.Id == id && essence.Rarity == rarity);

    public void Store(DragonEssenceId id) => Store(id, UngradedRarity);

    public void Store(DragonEssenceId id, LootRarity rarity) => securedEssences.Add(new SecuredEssence(id, rarity));

    public bool Consume(DragonEssenceId id) => TryConsume(id, out _);

    /// <summary>Spends the lowest-rarity copy so better-graded Essences are kept for later.</summary>
    public bool TryConsume(DragonEssenceId id, out LootRarity rarity)
    {
        rarity = default;
        var index = -1;
        for (var i = 0; i < securedEssences.Count; i++)
            if (securedEssences[i].Id == id && (index < 0 || securedEssences[i].Rarity < securedEssences[index].Rarity)) index = i;
        if (index < 0) return false;
        rarity = securedEssences[index].Rarity;
        securedEssences.RemoveAt(index);
        return true;
    }

    public void Restore(IEnumerable<DragonEssenceId> essences) => Restore(essences, null);

    /// <summary>Restores ids plus an optional count of graded (non-Rare) copies per id; extra or unknown grades are ignored.</summary>
    public void Restore(IEnumerable<DragonEssenceId> essences, IReadOnlyDictionary<DragonEssenceId, IReadOnlyDictionary<LootRarity, int>>? grades)
    {
        ArgumentNullException.ThrowIfNull(essences);
        securedEssences.Clear();
        var remaining = grades?.ToDictionary(pair => pair.Key, pair => pair.Value
            .Where(grade => Enum.IsDefined(grade.Key) && grade.Key != UngradedRarity && grade.Value > 0)
            .OrderByDescending(grade => grade.Key)
            .Select(grade => (grade.Key, grade.Value)).ToList()) ?? [];
        foreach (var id in essences)
        {
            var rarity = UngradedRarity;
            if (remaining.TryGetValue(id, out var list) && list.Count > 0)
            {
                rarity = list[0].Key;
                list[0] = (list[0].Key, list[0].Value - 1);
                if (list[0].Value == 0) list.RemoveAt(0);
            }
            securedEssences.Add(new SecuredEssence(id, rarity));
        }
    }

    /// <summary>Counts of non-Rare copies per id, saved beside the plain id list so older builds still read the vault.</summary>
    public IReadOnlyDictionary<DragonEssenceId, IReadOnlyDictionary<LootRarity, int>> Grades() => securedEssences
        .Where(essence => essence.Rarity != UngradedRarity)
        .GroupBy(essence => essence.Id)
        .ToDictionary(group => group.Key, group => (IReadOnlyDictionary<LootRarity, int>)group
            .GroupBy(essence => essence.Rarity).ToDictionary(rarity => rarity.Key, rarity => rarity.Count()));
}
