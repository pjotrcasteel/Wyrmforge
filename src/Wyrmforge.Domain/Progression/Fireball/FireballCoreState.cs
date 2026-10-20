using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Fireball;

// Permanent signature-spell progression, separate from temporary Hunt XP and temporary spell ranks.
public enum FireballMutatorId { CinderNeedle, PhoenixVolley, MeteorHeart, Detonation }

public sealed record FireballMaterialNeed(DragonEssenceId Essence, int Count);

public sealed record FireballMutatorDefinition(
    FireballMutatorId Id, string Name, string Description, string Sigil, DragonEssenceId ResearchMaterial, bool ChangesForm);

public static class FireballCoreCatalog
{
    // This is the FIRST playable Fire slice, not the full proposed ten-mutation catalogue.
    public static IReadOnlyList<FireballMutatorDefinition> Mutators { get; } =
    [
        new(FireballMutatorId.CinderNeedle, "Cinder Needle", "A narrow, fast-moving ember with quicker casts.", "➤", DragonEssenceId.CinderHeart, true),
        new(FireballMutatorId.PhoenixVolley, "Phoenix Volley", "Launches three smaller fire projectiles.", "≋", DragonEssenceId.AshenWing, true),
        new(FireballMutatorId.MeteorHeart, "Meteor Heart", "A heavy molten orb: slower, larger and harder hitting.", "●", DragonEssenceId.MoltenFang, true),
        new(FireballMutatorId.Detonation, "Detonation", "Fireball erupts in a wider blast on impact.", "✳", DragonEssenceId.CinderHeart, false),
    ];

    public static FireballMutatorDefinition Get(FireballMutatorId id) => Mutators.Single(item => item.Id == id);

    // Provisional balance recipes using EXISTING secured Wyrm Essences. No parallel currency.
    public static IReadOnlyList<FireballMaterialNeed> UpgradeNeeds(int currentLevel) => currentLevel switch
    {
        1 => [new(DragonEssenceId.CinderHeart, 1)],
        2 => [new(DragonEssenceId.MoltenFang, 1)],
        3 => [new(DragonEssenceId.CinderHeart, 1), new(DragonEssenceId.AshenWing, 1)],
        4 => [new(DragonEssenceId.MoltenFang, 2), new(DragonEssenceId.AshenWing, 1)],
        _ => [],
    };
}

public sealed record FireballCoreSave(int Level, FireballMutatorId[] Learned, FireballMutatorId?[] Slots);

public sealed class FireballCoreState
{
    private readonly HashSet<FireballMutatorId> learned = [];
    private readonly FireballMutatorId?[] slots = new FireballMutatorId?[5];

    public int Level { get; private set; } = 1;
    public bool AtCap => Level == 5;
    public IReadOnlyList<FireballMutatorId?> Slots => slots.ToArray();
    public IReadOnlyList<FireballMutatorId> Learned => learned.Order().ToArray();
    public IReadOnlyList<FireballMutatorId> Equipped => slots.Take(Level).OfType<FireballMutatorId>().ToArray();
    public bool Knows(FireballMutatorId id) => learned.Contains(id);
    public IReadOnlyList<FireballMaterialNeed> NextUpgrade => FireballCoreCatalog.UpgradeNeeds(Level);
    public bool CanUpgrade(DragonEssenceVault vault) => !AtCap && HasMaterials(vault, NextUpgrade);

    // Spend only after ALL components were checked; impossible to spend half an upgrade.
    public bool Upgrade(DragonEssenceVault vault)
    {
        ArgumentNullException.ThrowIfNull(vault);
        if (!CanUpgrade(vault)) return false;
        foreach (var need in NextUpgrade)
            for (var index = 0; index < need.Count; index++)
                if (!vault.Consume(need.Essence)) throw new InvalidOperationException("Verified Essence disappeared during Fireball upgrade.");
        Level++;
        return true;
    }

    public bool CanStudy(FireballMutatorId id, DragonEssenceVault vault) =>
        Enum.IsDefined(id) && !learned.Contains(id) && vault.Count(FireballCoreCatalog.Get(id).ResearchMaterial) > 0;

    public bool Study(FireballMutatorId id, DragonEssenceVault vault)
    {
        ArgumentNullException.ThrowIfNull(vault);
        if (!CanStudy(id, vault)) return false;
        if (!vault.Consume(FireballCoreCatalog.Get(id).ResearchMaterial)) return false;
        learned.Add(id);
        return true;
    }

    public bool Slot(int position, FireballMutatorId? mutation)
    {
        if (position < 0 || position >= Level) return false;
        if (mutation is null) { slots[position] = null; return true; }
        if (!Enum.IsDefined(mutation.Value) || !learned.Contains(mutation.Value)) return false;
        if (slots.Where((_, index) => index != position).Contains(mutation.Value)) return false;
        var proposed = FireballCoreCatalog.Get(mutation.Value);
        if (proposed.ChangesForm && slots.Where((_, index) => index != position)
            .OfType<FireballMutatorId>().Any(id => FireballCoreCatalog.Get(id).ChangesForm)) return false;
        slots[position] = mutation;
        return true;
    }

    public FireballCoreSave ToSave() => new(Level, Learned.ToArray(), slots.ToArray());

    public void Restore(FireballCoreSave? save)
    {
        if (save is null) return;
        Level = Math.Clamp(save.Level, 1, 5);
        learned.Clear();
        foreach (var id in save.Learned ?? [])
            if (Enum.IsDefined(id)) learned.Add(id);
        Array.Clear(slots);
        if (save.Slots is null) return;
        for (var index = 0; index < Math.Min(Level, save.Slots.Length); index++)
            Slot(index, save.Slots[index]); // Ignore invalid/tampered/incompatible saved combinations.
    }

    private static bool HasMaterials(DragonEssenceVault vault, IEnumerable<FireballMaterialNeed> requirements) =>
        requirements.All(need => vault.Count(need.Essence) >= need.Count);
}
