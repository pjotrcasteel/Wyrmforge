namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmRouteProfile(
    WyrmrealmEncounterProfile Encounter,
    WyrmrealmRewardProfile Reward,
    IReadOnlyList<WyrmrealmEncounterModifier>? EncounterModifiers = null)
{
    public WyrmrealmEncounterModifierSet ModifierSet { get; } = WyrmrealmEncounterModifierSet.Aggregate(EncounterModifiers ?? []);
}
