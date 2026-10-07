namespace Wyrmforge.Domain.Progression.PassiveTree;

public sealed record PassiveTreeRoutePlan(string AnchorId, IReadOnlyList<string> NodeIds, int AdditionalCost);
