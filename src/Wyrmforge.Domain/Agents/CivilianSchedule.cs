namespace Wyrmforge.Domain.Agents;

/// <summary>Encounter-local ambient day, staggered by identity; no wall clock or scene geometry.</summary>
public static class CivilianSchedule
{
    public const double CycleSeconds = 180;
    public static CivilianActivity Preferred(double elapsedSeconds, int seed, int citizenId, bool hasWork)
    {
        if (!double.IsFinite(elapsedSeconds) || elapsedSeconds < 0)
            throw new ArgumentOutOfRangeException(nameof(elapsedSeconds));
        var phase = (elapsedSeconds + AgentSchedule.Offset(seed, citizenId, 180)) % CycleSeconds;
        return phase < 90 && hasWork ? CivilianActivity.Work
            : phase < 120 ? CivilianActivity.Socialize
            : phase < 150 ? CivilianActivity.Visit : CivilianActivity.Rest;
    }
}
