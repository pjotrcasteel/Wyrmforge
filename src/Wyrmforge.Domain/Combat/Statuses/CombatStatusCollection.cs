namespace Wyrmforge.Domain.Combat.Statuses;

public sealed class CombatStatusCollection
{
    private readonly Dictionary<CombatStatusId, CombatStatusInstance> active = [];

    public bool Has(CombatStatusId id) => active.TryGetValue(id, out var status) && status.IsActive;

    public int Stacks(CombatStatusId id) => active.TryGetValue(id, out var status) && status.IsActive ? status.Stacks : 0;

    public double RemainingSeconds(CombatStatusId id) => active.TryGetValue(id, out var status) && status.IsActive ? status.RemainingSeconds : 0;

    public void Apply(CombatStatusDefinition definition, double durationSeconds, int stacks = 1)
    {
        if (durationSeconds <= 0 || stacks <= 0) return;
        if (active.TryGetValue(definition.Id, out var existing))
        {
            existing.Apply(durationSeconds, stacks);
            return;
        }
        active[definition.Id] = new CombatStatusInstance(definition, durationSeconds, Math.Min(definition.MaxStacks, stacks));
    }

    public void Tick(double delta)
    {
        foreach (var status in active.Values) status.Tick(delta);
        foreach (var id in active.Where(pair => !pair.Value.IsActive).Select(pair => pair.Key).ToArray()) active.Remove(id);
    }
}
