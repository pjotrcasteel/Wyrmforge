namespace Wyrmforge.Application.Runs.Hunts;

public sealed class DragonHuntState
{
    private double stageDuration;
    private double stageRemaining;
    private double pressureRemaining;
    private bool phaseBreakTriggered;

    public DragonHuntProfile? Profile { get; private set; }
    public DragonHuntStage Stage { get; private set; }
    public bool CanTargetDragon => Stage == DragonHuntStage.Battle;
    public bool CanDragonAct => Stage == DragonHuntStage.Battle;
    public double StageProgress => stageDuration <= 0 ? 1 : 1 - Math.Clamp(stageRemaining / stageDuration, 0, 1);

    public void Start(DragonHuntProfile profile)
    {
        Profile = profile;
        Stage = DragonHuntStage.Entrance;
        stageDuration = profile.Entrance.DurationSeconds;
        stageRemaining = stageDuration;
        pressureRemaining = 0;
        phaseBreakTriggered = false;
    }

    public bool TickStage(double delta)
    {
        if (Stage is not (DragonHuntStage.Entrance or DragonHuntStage.PhaseBreak)) return false;
        stageRemaining = Math.Max(0, stageRemaining - Math.Max(0, delta));
        if (stageRemaining > 0) return false;
        Stage = DragonHuntStage.Battle;
        pressureRemaining = Profile?.Pressure.Cadence.IntervalSeconds.For(phaseBreakTriggered ? 2 : 1) ?? 0;
        return true;
    }

    public bool TryStartPhaseBreak(int phase)
    {
        if (phase < 2 || phaseBreakTriggered || Stage != DragonHuntStage.Battle || Profile is null) return false;
        BeginPhaseBreak();
        return true;
    }

    public bool TryStartPhaseBreakForDamage(double currentHealth, double incomingDamage, double maxHealth)
    {
        if (phaseBreakTriggered || Stage != DragonHuntStage.Battle || Profile is null || incomingDamage <= 0 || maxHealth <= 0) return false;
        var threshold = maxHealth * 0.5;
        if (currentHealth <= threshold || currentHealth - incomingDamage > threshold) return false;
        BeginPhaseBreak();
        return true;
    }

    public bool TickPressure(double delta, int phase)
    {
        if (Stage != DragonHuntStage.Battle || Profile is null) return false;
        pressureRemaining -= Math.Max(0, delta);
        if (pressureRemaining > 0) return false;
        pressureRemaining = Profile.Pressure.Cadence.IntervalSeconds.For(phase);
        return true;
    }

    public void Reset()
    {
        Profile = null;
        Stage = DragonHuntStage.None;
        stageDuration = 0;
        stageRemaining = 0;
        pressureRemaining = 0;
        phaseBreakTriggered = false;
    }

    private void BeginPhaseBreak()
    {
        phaseBreakTriggered = true;
        Stage = DragonHuntStage.PhaseBreak;
        stageDuration = Profile!.PhaseBreakSeconds;
        stageRemaining = stageDuration;
        pressureRemaining = 0;
    }
}
