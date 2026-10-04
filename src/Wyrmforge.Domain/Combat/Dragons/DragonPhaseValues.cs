namespace Wyrmforge.Domain.Combat.Dragons;

public sealed record DragonPhaseValues(double PhaseOne, double PhaseTwo)
{
    public double For(int phase) => phase >= 2 ? PhaseTwo : PhaseOne;
}
