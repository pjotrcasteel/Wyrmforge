namespace Wyrmforge.Application.Runs.Hunts;

public sealed class DragonHuntState
{
    private double stageDuration;
    private double stageRemaining;
    private double pressureRemaining;
    private double signatureRemaining;
    private bool phaseBreakTriggered;

    public DragonHuntProfile? Profile { get; private set; }
    public DragonHuntStage Stage { get; private set; }
    public bool CanTargetDragon => Stage == DragonHuntStage.Battle;
    public bool CanDragonAct => Stage == DragonHuntStage.Battle;
    public double StageProgress => stageDuration <= 0 ? 1 : 1 - Math.Clamp(stageRemaining / stageDuration, 0, 1);
    public DragonHuntEntranceBeat EntranceBeat => ResolveEntranceBeat();
    public double EntranceBeatProgress => ResolveEntranceBeatProgress();

    public void Start(DragonHuntProfile profile)
    {
        Profile = profile;
        Stage = DragonHuntStage.Entrance;
        stageDuration = profile.Entrance.DurationSeconds;
        stageRemaining = stageDuration;
        pressureRemaining = 0;
        signatureRemaining = 0;
        phaseBreakTriggered = false;
    }

    public bool TickStage(double delta)
    {
        if (Stage is not (DragonHuntStage.Entrance or DragonHuntStage.PhaseBreak)) return false;
        stageRemaining = Math.Max(0, stageRemaining - Math.Max(0, delta));
        if (stageRemaining > 0) return false;
        Stage = DragonHuntStage.Battle;
        var phase = phaseBreakTriggered ? 2 : 1;
        pressureRemaining = Profile?.Pressure.Cadence.IntervalSeconds.For(phase) ?? 0;
        signatureRemaining = Profile is null ? 0 : phaseBreakTriggered ? 0.65 : Math.Min(2.4, Profile.Signature.IntervalSeconds.For(phase) * 0.35);
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

    public bool TickSignature(double delta, int phase)
    {
        if (Stage != DragonHuntStage.Battle || Profile is null) return false;
        signatureRemaining -= Math.Max(0, delta);
        if (signatureRemaining > 0) return false;
        signatureRemaining = Profile.Signature.IntervalSeconds.For(phase);
        return true;
    }

    public void Reset()
    {
        Profile = null;
        Stage = DragonHuntStage.None;
        stageDuration = 0;
        stageRemaining = 0;
        pressureRemaining = 0;
        signatureRemaining = 0;
        phaseBreakTriggered = false;
    }

    private DragonHuntEntranceBeat ResolveEntranceBeat()
    {
        if (Stage != DragonHuntStage.Entrance || Profile is null) return DragonHuntEntranceBeat.None;
        var entrance = Profile.Entrance;
        var elapsed = Math.Max(0, stageDuration - stageRemaining);
        if (elapsed < entrance.OmenSeconds) return DragonHuntEntranceBeat.Omen;
        if (elapsed < entrance.OmenSeconds + entrance.TravelSeconds) return DragonHuntEntranceBeat.Arrival;
        return DragonHuntEntranceBeat.Reveal;
    }

    private double ResolveEntranceBeatProgress()
    {
        if (Profile is null || Stage != DragonHuntStage.Entrance) return 1;
        var entrance = Profile.Entrance;
        var elapsed = Math.Max(0, stageDuration - stageRemaining);
        return ResolveEntranceBeat() switch
        {
            DragonHuntEntranceBeat.Omen => Progress(elapsed, entrance.OmenSeconds),
            DragonHuntEntranceBeat.Arrival => Progress(elapsed - entrance.OmenSeconds, entrance.TravelSeconds),
            DragonHuntEntranceBeat.Reveal => Progress(elapsed - entrance.OmenSeconds - entrance.TravelSeconds, entrance.RevealSeconds),
            _ => 1,
        };
    }

    private static double Progress(double elapsed, double duration) => duration <= 0 ? 1 : Math.Clamp(elapsed / duration, 0, 1);

    private void BeginPhaseBreak()
    {
        phaseBreakTriggered = true;
        Stage = DragonHuntStage.PhaseBreak;
        stageDuration = Profile!.PhaseBreakSeconds;
        stageRemaining = stageDuration;
        pressureRemaining = 0;
        signatureRemaining = 0;
    }
}
