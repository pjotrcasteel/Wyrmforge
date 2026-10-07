using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class EncounterDirector
{
    public const double BreathingRoomSeconds = 1.4;

    private readonly Queue<EnemyKind> pendingInserts = new();
    private EnemyEncounterPattern pattern;
    private int depth;
    private double progress;
    private double breathingRemaining;

    public bool Active { get; private set; }
    public EncounterPhase Phase { get; private set; } = EncounterPhase.Pressure;
    public EncounterDirective Directive => ResolveDirective();

    public void Start(EnemyEncounterPattern encounterPattern, int encounterDepth)
    {
        Active = true;
        pattern = encounterPattern;
        depth = Math.Max(1, encounterDepth);
        progress = 0;
        breathingRemaining = 0;
        pendingInserts.Clear();
        Phase = EncounterPhase.Pressure;
    }

    public void RegisterProgress(int kills, int requiredKills)
    {
        if (!Active || requiredKills <= 0) return;
        progress = Math.Clamp(kills / (double)requiredKills, 0, 1);

        if (Phase == EncounterPhase.Pressure && progress >= 0.25) Enter(EncounterPhase.Escalation);
        if (Phase == EncounterPhase.Escalation && progress >= 0.5) BeginBreathingRoom();
        if (Phase == EncounterPhase.Surge && progress >= 0.8) Enter(EncounterPhase.Climax);
    }

    public void Tick(double delta)
    {
        if (!Active || Phase != EncounterPhase.BreathingRoom) return;
        breathingRemaining = Math.Max(0, breathingRemaining - Math.Max(0, delta));
        if (breathingRemaining > 0) return;

        Enter(EncounterPhase.Surge);
        if (progress >= 0.8) Enter(EncounterPhase.Climax);
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
        breathingRemaining = 0;
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

    private void BeginBreathingRoom()
    {
        Phase = EncounterPhase.BreathingRoom;
        breathingRemaining = BreathingRoomSeconds;
    }

    private void Enter(EncounterPhase phase)
    {
        if (Phase == phase) return;
        Phase = phase;

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
        pendingInserts.Enqueue(depth >= 2 && pattern != EnemyEncounterPattern.StalkerPressure ? EnemyKind.Brute : EnemyKind.RiftStalker);
    }
}
