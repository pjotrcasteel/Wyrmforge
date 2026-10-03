namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class StormPassiveNodes
{
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        new("storm-1", "Static", "+4% cast speed.", NodeTier.Minor, PassiveSchool.Storm, 1, [], []),
        new("storm-2", "Surge", "+4% cast speed.", NodeTier.Minor, PassiveSchool.Storm, 1, ["storm-1"], []),
        new("storm-major", "Stormheart", "Cast interval ×0.75.", NodeTier.Major, PassiveSchool.Storm, 2, ["storm-2"], []),
        new("chainstorm", "Chainstorm", "Projectiles chain once after a kill.", NodeTier.Epic, PassiveSchool.Storm, 3, ["storm-major"], ["tempest-step"]),
        new("tempest-step", "Tempest Step", "Moving builds speed up to +25%.", NodeTier.Epic, PassiveSchool.Storm, 3, ["storm-major"], ["chainstorm"]),
        new("living-storm", "Living Storm", "Chains may continue through up to 4 enemies.", NodeTier.Legendary, PassiveSchool.Storm, 5, ["chainstorm"], []),
        new("lightning-form", "Lightning Form", "At full movement momentum, casts ×1.5 faster.", NodeTier.Legendary, PassiveSchool.Storm, 5, ["tempest-step"], []),
    ];
}
