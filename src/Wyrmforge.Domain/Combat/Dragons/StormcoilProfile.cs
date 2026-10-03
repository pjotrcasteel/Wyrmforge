namespace Wyrmforge.Domain.Combat.Dragons;

public static class StormcoilProfile
{
    public const double PhaseOnePulseRadius = 235;
    public const double PhaseTwoPulseRadius = 300;
    public const double PhaseOnePulseDamage = 34;
    public const double PhaseTwoPulseDamage = 48;
    public const double PhaseOneTelegraphSeconds = 0.9;
    public const double PhaseTwoTelegraphSeconds = 0.65;
    public const double PhaseOneCooldownSeconds = 2.8;
    public const double PhaseTwoCooldownSeconds = 2.2;

    public static double PulseRadius(int phase) => phase >= 2 ? PhaseTwoPulseRadius : PhaseOnePulseRadius;

    public static double PulseDamage(int phase) => phase >= 2 ? PhaseTwoPulseDamage : PhaseOnePulseDamage;

    public static double TelegraphSeconds(int phase) => phase >= 2 ? PhaseTwoTelegraphSeconds : PhaseOneTelegraphSeconds;

    public static double CooldownSeconds(int phase) => phase >= 2 ? PhaseTwoCooldownSeconds : PhaseOneCooldownSeconds;
}
