namespace Wyrmforge.Domain.Combat.Dragons;

public sealed record DragonAttackGeometry(DragonPhaseValues Radius, double Range = 0, double HalfAngle = 0)
{
    public static DragonAttackGeometry Cone(double range, double halfAngle) => new(new DragonPhaseValues(0, 0), range, halfAngle);

    public static DragonAttackGeometry Circle(double phaseOneRadius, double phaseTwoRadius) => new(new DragonPhaseValues(phaseOneRadius, phaseTwoRadius));
}
