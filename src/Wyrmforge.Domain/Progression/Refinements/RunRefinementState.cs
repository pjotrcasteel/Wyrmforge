namespace Wyrmforge.Domain.Progression.Refinements;

public sealed class RunRefinementState
{
    private readonly Dictionary<RunRefinementId, int> ranks = Enum.GetValues<RunRefinementId>().ToDictionary(id => id, _ => 0);
    public int this[RunRefinementId id] => ranks[id];

    public bool Apply(RunRefinementId id)
    {
        if (ranks[id] >= RunRefinementDefinition.MaxRank) return false;
        ranks[id]++;
        return true;
    }
}
