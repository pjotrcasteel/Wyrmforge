namespace Wyrmforge.Domain.Combat.Statuses;

public sealed class CombatStatusInstance(CombatStatusDefinition definition, double durationSeconds, int stacks)
{
    public CombatStatusDefinition Definition { get; } = definition;
    public double RemainingSeconds { get; private set; } = durationSeconds;
    public int Stacks { get; private set; } = stacks;
    public bool IsActive => RemainingSeconds > 0 && Stacks > 0;

    public void Apply(double durationSeconds, int stacks)
    {
        Stacks = Math.Min(Definition.MaxStacks, Stacks + stacks);
        RemainingSeconds = Definition.RefreshPolicy switch
        {
            CombatStatusRefreshPolicy.RefreshDuration => Math.Max(RemainingSeconds, durationSeconds),
            CombatStatusRefreshPolicy.AddDuration => RemainingSeconds + durationSeconds,
            CombatStatusRefreshPolicy.IgnoreIfActive => RemainingSeconds,
            _ => RemainingSeconds,
        };
    }

    public void Tick(double delta) => RemainingSeconds = Math.Max(0, RemainingSeconds - delta);
}
