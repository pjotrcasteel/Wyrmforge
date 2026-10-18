namespace Wyrmforge.Domain.Combat.Player;

/// <summary>
/// Frost's answer to Fire's pressure: Fire hurts you, Frost boxes you in. Chill is a stacking slow on the hunter that
/// never becomes a full freeze (no stun-lock, unlike Diablo's frozen state); it holds briefly, then thaws one stack at a
/// time, so stepping out of the cold is always the counterplay. A short gate stops a crowd from stacking it in one frame.
/// </summary>
public sealed class HunterChillState
{
    public const int MaxStacks = 5;
    public const double SlowPerStack = 0.08;
    public const double HoldSeconds = 1.6;
    public const double ThawSecondsPerStack = 0.5;
    public const double ApplyGateSeconds = 0.2;

    public int Stacks { get; private set; }

    public double HoldRemaining { get; private set; }

    private double thawRemaining;
    private double gateRemaining;

    public bool IsChilled => Stacks > 0;

    /// <summary>Movement multiplier: 1 when warm, down to 0.6 at full chill.</summary>
    public double SpeedMultiplier => 1 - Stacks * SlowPerStack;

    public double Intensity => (double)Stacks / MaxStacks;

    /// <summary>Adds stacks and refreshes the hold. Returns false when the gate swallowed the application.</summary>
    public bool Apply(int stacks = 1)
    {
        if (stacks <= 0 || gateRemaining > 0) return false;
        Stacks = Math.Min(MaxStacks, Stacks + stacks);
        HoldRemaining = HoldSeconds;
        thawRemaining = ThawSecondsPerStack;
        gateRemaining = ApplyGateSeconds;
        return true;
    }

    public void Tick(double delta)
    {
        if (delta <= 0) return;
        gateRemaining = Math.Max(0, gateRemaining - delta);
        if (Stacks == 0) return;
        if (HoldRemaining > 0)
        {
            var spent = Math.Min(HoldRemaining, delta);
            HoldRemaining -= spent;
            delta -= spent;
        }
        thawRemaining -= delta;
        while (Stacks > 0 && thawRemaining <= 0)
        {
            Stacks--;
            thawRemaining += ThawSecondsPerStack;
        }
        if (Stacks == 0) thawRemaining = 0;
    }

    public void Clear()
    {
        Stacks = 0;
        HoldRemaining = 0;
        thawRemaining = 0;
        gateRemaining = 0;
    }
}
