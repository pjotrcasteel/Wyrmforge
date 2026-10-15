namespace Wyrmforge.Domain.Progression.Onboarding;

/// <summary>Local, deterministic chapter gates; older players can be migrated without losing progress.</summary>
public sealed class FirstHuntProgress
{
    public int CompletedRuns { get; private set; }
    public bool AtlasUnlocked => CompletedRuns >= 1;
    public bool CodexUnlocked => CompletedRuns >= 1;
    public bool LeaderboardUnlocked => CompletedRuns >= 2;
    public bool TutorialRun => CompletedRuns == 0;

    public bool CompleteRun(bool abandoned)
    {
        if (abandoned) return false;
        if (CompletedRuns < 2) CompletedRuns++;
        return true;
    }

    // The first finished hunt unlocks the Atlas and its initial point. Every later
    // non-abandoned hunt earns another point; the selection itself enforces the cap.
    public bool AwardsArcanePoint(bool tutorialRunAtStart, bool abandoned) => AtlasUnlocked && !tutorialRunAtStart && !abandoned;

    public void Restore(int completedRuns) => CompletedRuns = Math.Clamp(completedRuns, 0, 2);
    public void MigrateExperiencedPlayer() => CompletedRuns = 2;
}
