namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class FrostPassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        new("frost-1", "Rime", "+4 max health.", NodeTier.Minor, PassiveSchool.Frost, 1, [], []),
        new("frost-2", "Permafrost", "+4 max health.", NodeTier.Minor, PassiveSchool.Frost, 1, ["frost-1"], []),
        new("frost-major", "Glacial Core", "Damage taken ×0.85.", NodeTier.Major, PassiveSchool.Frost, 2, ["frost-2"], []),
        new("deep-freeze", "Deep Freeze", "Every 4th hit freezes its target briefly.", NodeTier.Epic, PassiveSchool.Frost, 3, ["frost-major"], ["ice-armor"]),
        new("ice-armor", "Ice Armor", "Taking damage grants a short barrier.", NodeTier.Epic, PassiveSchool.Frost, 3, ["frost-major"], ["deep-freeze"]),
        new("absolute-zero", "Absolute Zero", "Frozen enemies take double damage.", NodeTier.Legendary, PassiveSchool.Frost, 5, ["deep-freeze"], []),
        new("winter-shell", "Winter Shell", "Barrier absorbs one full hit and recharges.", NodeTier.Legendary, PassiveSchool.Frost, 5, ["ice-armor"], []),
    ];
}
