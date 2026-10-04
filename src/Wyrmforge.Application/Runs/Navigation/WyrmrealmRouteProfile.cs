namespace Wyrmforge.Application.Runs.Navigation;

public sealed record WyrmrealmRouteProfile(WyrmrealmEncounterProfile Encounter, WyrmrealmRewardProfile Reward, WyrmrealmHazardProfile? Hazard = null);
