using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum CantorPhase
{
    /// <summary>Holds the backline behind its pack.</summary>
    Keep,
    Chant,
    Recover,
    /// <summary>The chant was broken: it stands mute and cannot begin another verse.</summary>
    Silenced,
}

public enum CantorVerse
{
    RimeHymn,
    Reknit,
    StillnessVerse,
}

public enum CantorEvent
{
    None,
    ChantStarted,
    HymnCompleted,
    ReknitCompleted,
    VerseCompleted,
    Interrupted,
}

/// <summary>
/// Hoarfrost Cantor (Frost roster 02). Not a recoloured Ash Priest: the priest mends one wounded ally at a time and walks to
/// a corpse to raise it. The Cantor never heals. It stands far back and <em>chants</em>, and every chant is a long, readable,
/// breakable channel: the Rime Hymn crusts every nearby ally in frost armour that must be broken before their health moves;
/// Reknit pulls a fallen Frostling's rime husk back together from across the field as a lesser thrall; and when the hunter
/// pushes into its space, the Stillness Verse numbs everything around it with heavy Chill. A real burst — or a shove —
/// during any chant breaks it and leaves the Cantor mute for a moment. Counterplay (concept sheet): pressure the backline,
/// interrupt the chant, deny it time. Diablo's Fallen Shaman (revive) and Darkest Dungeon's backline buffers are the reference.
/// </summary>
public sealed class HoarfrostCantorBehaviorState
{
    public const double InitialCooldownSeconds = 2;
    public const double CooldownSeconds = 2.6;
    public const double HymnSeconds = 1.6;
    public const double ReknitSeconds = 1.4;
    public const double VerseSeconds = 1.2;
    public const double RecoverSeconds = 0.6;
    public const double SilencedSeconds = 1.6;
    public const double InterruptHealthFraction = 0.15;
    public const double MinimumRange = 220;
    public const double MaximumRange = 340;
    public const double PackOffset = 70;

    public const double HymnRadius = 200;
    public const int HymnMinimumAllies = 2;
    public const double RimeArmorFraction = 0.35;
    public const double RimeArmorSeconds = 10;

    public const double ReknitRange = 260;
    public const int ReknitsPerCantor = 2;
    public const double ThrallHealthFraction = 0.5;
    public const double ThrallSpeedMultiplier = 0.8;
    public const double HuskSeconds = 9;

    public const double VerseRadius = 130;
    public const double VerseDamage = 4;
    public const int VerseChill = 3;

    public CantorPhase Phase { get; private set; } = CantorPhase.Keep;

    public CantorVerse Verse { get; private set; } = CantorVerse.RimeHymn;

    public double PhaseRemaining { get; private set; }

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public int ReknitsLeft { get; private set; } = ReknitsPerCantor;

    /// <summary>The husk a Reknit is pulling together, locked when the chant begins.</summary>
    public Vector2D ReknitSite { get; private set; } = Vector2D.Zero;

    private double chantHealth;

    /// <summary>Only the Stillness Verse is an attack on the hunter; the hymn and the reknit are rites, not strikes.</summary>
    public bool IsCommitted => Phase == CantorPhase.Chant && Verse == CantorVerse.StillnessVerse;

    public bool IsChanting => Phase == CantorPhase.Chant;

    public double ChantProgress => Phase == CantorPhase.Chant ? Math.Clamp(1 - PhaseRemaining / ChantDuration, 0, 1) : 0;

    private double ChantDuration => Verse switch
    {
        CantorVerse.Reknit => ReknitSeconds,
        CantorVerse.StillnessVerse => VerseSeconds,
        _ => HymnSeconds,
    };

    /// <param name="unarmoredAllies">Allies within <see cref="HymnRadius"/> without frost armour.</param>
    /// <param name="husk">Nearest rime husk within <see cref="ReknitRange"/>, if any.</param>
    /// <param name="mayCommit">Whether the pressure budget allows a new attack (the Stillness Verse).</param>
    public CantorEvent Tick(double delta, Vector2D position, Vector2D hunter, double health, double maxHealth, int unarmoredAllies,
        Vector2D? husk, bool mayCommit = true)
    {
        switch (Phase)
        {
            case CantorPhase.Chant:
                if (chantHealth - health >= maxHealth * InterruptHealthFraction) return Silence();
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return CantorEvent.None;
                Enter(CantorPhase.Recover, RecoverSeconds);
                switch (Verse)
                {
                    case CantorVerse.Reknit:
                        ReknitsLeft--;
                        return CantorEvent.ReknitCompleted;
                    case CantorVerse.StillnessVerse:
                        return CantorEvent.VerseCompleted;
                    default:
                        return CantorEvent.HymnCompleted;
                }
            case CantorPhase.Recover or CantorPhase.Silenced:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(CantorPhase.Keep, 0);
                return CantorEvent.None;
        }

        CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
        if (CooldownRemaining > 0) return CantorEvent.None;
        // Self-defence first: a hunter in its space hears the Stillness Verse. Then rebuild the pack, then armour it.
        if (mayCommit && Vector2D.Distance(position, hunter) <= VerseRadius) Begin(CantorVerse.StillnessVerse, health);
        else if (husk is { } site && ReknitsLeft > 0)
        {
            ReknitSite = site;
            Begin(CantorVerse.Reknit, health);
        }
        else if (unarmoredAllies >= HymnMinimumAllies) Begin(CantorVerse.RimeHymn, health);
        else return CantorEvent.None;
        return CantorEvent.ChantStarted;
    }

    /// <summary>A shove breaks the chant just as a burst does.</summary>
    public bool Interrupt()
    {
        if (Phase != CantorPhase.Chant) return false;
        Silence();
        return true;
    }

    /// <summary>Stay in the backline: out of the hunter's reach, behind the pack's centre when there is a pack.</summary>
    public (Vector2D Direction, double SpeedMultiplier) Movement(Vector2D position, Vector2D hunter, Vector2D? packCenter)
    {
        if (Phase != CantorPhase.Keep) return (Vector2D.Zero, 0);
        var distance = Vector2D.Distance(position, hunter);
        var toward = Vector2D.DirectionTo(position, hunter);
        if (distance < MinimumRange) return (toward * -1, 1);
        if (distance > MaximumRange) return (toward, 0.85);
        if (packCenter is { } pack)
        {
            var behind = pack + Vector2D.DirectionTo(hunter, pack) * PackOffset;
            if (Vector2D.Distance(position, behind) > 24) return (Vector2D.DirectionTo(position, behind), 0.7);
        }
        return (Vector2D.Zero, 0);
    }

    private void Begin(CantorVerse verse, double health)
    {
        Verse = verse;
        chantHealth = health;
        CooldownRemaining = CooldownSeconds;
        Enter(CantorPhase.Chant, ChantDuration);
    }

    private CantorEvent Silence()
    {
        CooldownRemaining = CooldownSeconds;
        Enter(CantorPhase.Silenced, SilencedSeconds);
        return CantorEvent.Interrupted;
    }

    private void Enter(CantorPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
