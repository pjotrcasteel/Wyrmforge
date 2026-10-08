using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Hunts;

[TestClass]
public sealed class TargetedAttackEscapeTests
{
    [DataTestMethod]
    [DataRow(DragonId.Voidweaver, 1)]
    [DataRow(DragonId.Voidweaver, 2)]
    [DataRow(DragonId.Rimeclaw, 2)]
    public void TargetBurst_BaseSpeedWithReactionBudget_CanEscape(DragonId dragon, int phase)
    {
        var attack = DragonCatalog.Get(dragon).Combat.Attack;
        Assert.AreEqual(DragonAttackPattern.TargetBurst, attack.Pattern);
        AssertEscapeBudget(attack.TelegraphSeconds.For(phase), attack.Geometry.Radius.For(phase));
    }

    [TestMethod]
    public void RimeclawPressure_PhaseTwoWithReactionBudget_CanEscape()
    {
        var pressure = DragonHuntCatalog.Rimeclaw.Pressure;
        Assert.AreEqual(DragonHuntPressureOrigin.Player, pressure.Origin);
        AssertEscapeBudget(pressure.Cadence.TelegraphSeconds.For(2), pressure.Radius.For(2));
    }

    private static void AssertEscapeBudget(double warning, double radius)
    {
        var speed = new PlayerState().Speed;
        const double reactionSeconds = 0.25;
        const double tickSeconds = 0.05;
        var conservativeTravel = Math.Floor((warning - reactionSeconds) / tickSeconds) * tickSeconds * speed;
        Assert.IsTrue(conservativeTravel > radius, $"Travel {conservativeTravel} must exceed attack radius {radius} after reaction and tick rounding.");
        var lateTravel = Math.Max(0, warning - 0.6) * speed;
        Assert.IsTrue(lateTravel <= radius, "A late response should still be punishable.");
    }
}
