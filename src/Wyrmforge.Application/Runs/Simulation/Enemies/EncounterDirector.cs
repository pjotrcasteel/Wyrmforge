using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class EncounterDirector
{
    public const double BreathingRoomSeconds = 3;

    private readonly Queue<EnemyKind> pendingInserts = new();
    private EnemyEncounterPattern pattern;
    private int depth;
    private int stage;
    private double progress;
    private double phaseElapsed;

    public double PhaseElapsed => phaseElapsed;
    public double PhaseDuration => Phase == EncounterPhase.BreathingRoom ? BreathingRoomSeconds : 7 + Math.Clamp(stage - 1, 0, 3) * 1.5;
    public double PhaseProgress => Math.Clamp(phaseElapsed / PhaseDuration, 0, 1);
    public bool CanComplete => Active && Phase == EncounterPhase.Climax && PhaseProgress >= 1;

    public bool Active { get; private set; }
    public EncounterPhase Phase { get; private set; } = EncounterPhase.Pressure;
    public EncounterDirective Directive => ResolveDirective();

    public void Start(EnemyEncounterPattern encounterPattern, int encounterDepth, int encounterStage = 1)
    {
        Active = true;
        pattern = encounterPattern;
        depth = Math.Max(1, encounterDepth);
        stage = encounterStage;
        progress = 0;
        phaseElapsed = 0;
        pendingInserts.Clear();
        if (stage == 4) pendingInserts.Enqueue(EnemyKind.Brute);
        Phase = EncounterPhase.Pressure;
    }

    public void RegisterProgress(int kills, int requiredKills)
    {
        if (!Active || requiredKills <= 0) return;
        progress = Math.Clamp(kills / (double)requiredKills, 0, 1);

        AdvancePhase();
    }

    public void Tick(double delta)
    {
        if (!Active) return;
        phaseElapsed += Math.Max(0, delta);
        AdvancePhase();
    }

    private void AdvancePhase()
    {
        if (PhaseProgress < 1) return;
        var next = Phase switch
        {
            EncounterPhase.Pressure when progress >= 0.25 => EncounterPhase.Escalation,
            EncounterPhase.Escalation when progress >= 0.5 => EncounterPhase.BreathingRoom,
            EncounterPhase.BreathingRoom => EncounterPhase.Surge,
            EncounterPhase.Surge when progress >= 0.8 => EncounterPhase.Climax,
            _ => Phase,
        };
        Enter(next);
    }

    public bool TryTakeInsert(out EnemyKind kind)
    {
        if (pendingInserts.TryDequeue(out kind)) return true;
        kind = default;
        return false;
    }

    public void Reset()
    {
        Active = false;
        Phase = EncounterPhase.Pressure;
        progress = 0;
        phaseElapsed = 0;
        pendingInserts.Clear();
    }

    private EncounterDirective ResolveDirective()
    {
        if (!Active) return EncounterDirective.Default;
        var batchBonus = Phase switch
        {
            EncounterPhase.Surge when pattern == EnemyEncounterPattern.Swarm => 1,
            EncounterPhase.Climax when pattern == EnemyEncounterPattern.Swarm => 2,
            EncounterPhase.Climax => 1,
            _ => 0,
        };

        return Phase switch
        {
            EncounterPhase.Pressure => new EncounterDirective(1.12, batchBonus, false),
            EncounterPhase.Escalation => new EncounterDirective(0.96, batchBonus, false),
            EncounterPhase.BreathingRoom => new EncounterDirective(1, 0, true),
            EncounterPhase.Surge => new EncounterDirective(0.82, batchBonus, false),
            EncounterPhase.Climax => new EncounterDirective(0.68, batchBonus, false),
            _ => EncounterDirective.Default,
        };
    }

    private void Enter(EncounterPhase phase)
    {
        if (Phase == phase) return;
        Phase = phase;
        phaseElapsed = 0;

        if (stage == 4 && phase is EncounterPhase.Escalation or EncounterPhase.Surge or EncounterPhase.Climax)
        {
            pendingInserts.Enqueue(EnemyKind.Brute);
            if (phase == EncounterPhase.Climax) pendingInserts.Enqueue(EnemyKind.RiftStalker);
            return;
        }

        if (phase == EncounterPhase.Escalation && pattern == EnemyEncounterPattern.StalkerPressure)
        {
            pendingInserts.Enqueue(EnemyKind.RiftStalker);
            return;
        }

        if (phase == EncounterPhase.Surge && pattern is EnemyEncounterPattern.StalkerPressure or EnemyEncounterPattern.Mixed)
        {
            pendingInserts.Enqueue(EnemyKind.RiftStalker);
            return;
        }

        if (phase != EncounterPhase.Climax) return;
        switch (pattern)
        {
            case EnemyEncounterPattern.Swarm when depth >= 2:
                pendingInserts.Enqueue(EnemyKind.Brute);
                break;
            case EnemyEncounterPattern.StalkerPressure:
                pendingInserts.Enqueue(EnemyKind.RiftStalker);
                break;
            case EnemyEncounterPattern.Mixed:
                pendingInserts.Enqueue(depth >= 2 || stage == 4 ? EnemyKind.Brute : EnemyKind.RiftStalker);
                break;
        }
    }
}
