using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Domain.Spells.Contextual;

/// <summary>
/// Warding Pulse, the first contextual spell (amendment §11.4): a school-neutral shove that clears space around the hunter.
/// It deals no damage, so it can never become a second damage stream, and it spends the primary's next cast. It pushes
/// enemies but does not cancel attacks: a pushed Penitent swings at empty air and a pushed hound's locked lane moves back
/// with it, while lobbed embers still land on their mark, so dodging stays the main defence (Hades' cast and Diablo's
/// Frost Nova buy space; neither replaces footwork).
/// </summary>
public static class WardingPulse
{
    public const string Name = "Warding Pulse";
    public const string Icon = "◎";
    public const string Summary = "Shoves nearby enemies away when you are crowded or a melee strike is winding up. Spends your next primary cast; no damage.";
    public const double Radius = 118;
    public const double PushDistance = 78;
    public const double PushSeconds = 0.18;
    public const double ElitePushScale = 0.5;
    public const double RecoverySeconds = 7;
    public const double PulseSeconds = 0.32;

    /// <summary>Set pieces hold their ground: bells, rites and their wards are never moved.</summary>
    public static bool IsImmovable(EnemyKind kind) => kind is EnemyKind.BellWarden or EnemyKind.BellOfWinter or EnemyKind.Reliquary or EnemyKind.ReliquaryWard
        or EnemyKind.ReliquaryOfGlass or EnemyKind.CrystalWard;

    public static double PushFor(bool elite) => PushDistance * (elite ? ElitePushScale : 1);
}
