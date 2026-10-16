using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Progression.Loadouts;

// A saved hunt setup: the Arcane Web path, which researched mutation sits in which socket, the preferred
// primary spell and the Forge offering to bring.
public sealed record HuntLoadout(string Name, IReadOnlyList<string> Nodes, IReadOnlyDictionary<ArcaneMutationSocketId, LaboratoryMutationId> Slots,
    SpellId? Primary = null, DragonEssenceId? Offering = null);

public sealed record HuntLoadoutApplyResult(int NodesRestored, int NodesSkipped, IReadOnlyList<LaboratoryMutationId> Equipped, IReadOnlyList<LaboratoryMutationId> Skipped,
    SpellId? Primary = null, DragonEssenceId? Offering = null, DragonEssenceId? OfferingSkipped = null)
{
    public bool Complete => NodesSkipped == 0 && Skipped.Count == 0 && OfferingSkipped is null;
}

public sealed record HuntLoadoutSave(int Version, HuntLoadoutSlotSave?[] Slots);

// Primary and Offering were added after v1 shipped; older saves omit them and deserialize them as null.
public sealed record HuntLoadoutSlotSave(string Name, string[] Nodes, string[] Sockets, string? Primary = null, string? Offering = null);

// Applying a loadout is a free respec: no currency, no cooldown. It only re-selects nodes the player can
// afford and re-equips mutations that are still stabilized and legal; anything else is reported, never forced.
// The offering is only re-selected while one is in the vault: selecting it never spends, starting the hunt does.
public sealed class HuntLoadoutBook
{
    public const int SaveVersion = 1;
    public const int SlotCount = 3;

    private static readonly string[] Numerals = ["I", "II", "III"];
    private readonly HuntLoadout?[] slots = new HuntLoadout?[SlotCount];

    public HuntLoadout? this[int index] => InRange(index) ? slots[index] : null;

    public static string DefaultName(int index) => $"Loadout {Numerals[Math.Clamp(index, 0, SlotCount - 1)]}";

    public HuntLoadout Save(int index, PassiveTreeSelection selection, LaboratoryState laboratory, string? name = null,
        SpellId? primary = null, DragonEssenceId? offering = null)
    {
        ArgumentNullException.ThrowIfNull(selection);
        ArgumentNullException.ThrowIfNull(laboratory);
        if (!InRange(index)) throw new ArgumentOutOfRangeException(nameof(index));
        var loadout = new HuntLoadout(
            string.IsNullOrWhiteSpace(name) ? DefaultName(index) : name.Trim(),
            selection.Selected.Order(StringComparer.Ordinal).ToArray(),
            laboratory.Slotted, primary, offering);
        slots[index] = loadout;
        return loadout;
    }

    public HuntLoadoutApplyResult? Apply(int index, PassiveTreeSelection selection, LaboratoryState laboratory, Func<DragonEssenceId, bool>? canOffer = null)
    {
        ArgumentNullException.ThrowIfNull(selection);
        ArgumentNullException.ThrowIfNull(laboratory);
        if (this[index] is not { } loadout) return null;
        selection.RestoreNodes(loadout.Nodes);
        var selected = selection.Selected;
        var restored = loadout.Nodes.Count(selected.Contains);
        laboratory.Unequip();
        var equipped = new List<LaboratoryMutationId>();
        var skipped = new List<LaboratoryMutationId>();
        foreach (var (socket, mutation) in loadout.Slots.OrderBy(pair => pair.Key))
            (laboratory.Equip(mutation, socket, selected) == MutationEquipResult.Equipped ? equipped : skipped).Add(mutation);
        var offered = loadout.Offering is { } offering && canOffer?.Invoke(offering) == true ? offering : (DragonEssenceId?)null;
        return new(restored, loadout.Nodes.Count - restored, equipped, skipped, loadout.Primary, offered, offered is null ? loadout.Offering : null);
    }

    public void Clear(int index)
    {
        if (InRange(index)) slots[index] = null;
    }

    public HuntLoadoutSave ToSave() => new(SaveVersion, slots
        .Select(slot => slot is null ? null : new HuntLoadoutSlotSave(slot.Name, slot.Nodes.ToArray(),
            slot.Slots.OrderBy(pair => pair.Key).Select(pair => $"{pair.Key}:{pair.Value}").ToArray(), slot.Primary?.ToString(), slot.Offering?.ToString()))
        .ToArray());

    // Unknown node ids are kept (RestoreNodes ignores them on apply); unknown socket, mutation, spell or essence ids are dropped.
    public void Restore(HuntLoadoutSave? save)
    {
        Array.Clear(slots);
        if (save?.Slots is null) return;
        for (var index = 0; index < Math.Min(SlotCount, save.Slots.Length); index++)
        {
            if (save.Slots[index] is not { } slot) continue;
            var sockets = new Dictionary<ArcaneMutationSocketId, LaboratoryMutationId>();
            foreach (var entry in slot.Sockets ?? [])
            {
                var parts = entry?.Split(':');
                if (parts is not { Length: 2 }) continue;
                if (Enum.TryParse<ArcaneMutationSocketId>(parts[0], out var socket) && Enum.IsDefined(socket)
                    && Enum.TryParse<LaboratoryMutationId>(parts[1], out var mutation) && Enum.IsDefined(mutation))
                    sockets[socket] = mutation;
            }
            slots[index] = new(string.IsNullOrWhiteSpace(slot.Name) ? DefaultName(index) : slot.Name,
                (slot.Nodes ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).ToArray(), sockets,
                Parse<SpellId>(slot.Primary), Parse<DragonEssenceId>(slot.Offering));
        }
    }

    private static bool InRange(int index) => index is >= 0 and < SlotCount;

    private static T? Parse<T>(string? name) where T : struct, Enum =>
        Enum.TryParse<T>(name, out var value) && Enum.IsDefined(value) ? value : null;
}
