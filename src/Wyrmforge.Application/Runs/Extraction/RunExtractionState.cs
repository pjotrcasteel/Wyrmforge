namespace Wyrmforge.Application.Runs.Extraction;

public sealed class RunExtractionState
{
    public const double DurationSeconds = 4;

    public bool IsActive { get; private set; }

    public double RemainingSeconds { get; private set; }

    public bool Start()
    {
        if (IsActive) return false;
        IsActive = true;
        RemainingSeconds = DurationSeconds;
        return true;
    }

    public bool Tick(double delta)
    {
        if (!IsActive) return false;
        RemainingSeconds = Math.Max(0, RemainingSeconds - Math.Max(0, delta));
        if (RemainingSeconds > 0) return false;
        IsActive = false;
        return true;
    }

    public void Cancel()
    {
        IsActive = false;
        RemainingSeconds = 0;
    }
}
