using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Hunts;

[TestClass]
public sealed class DragonHuntSignaturePlannerTests
{
    private const double Width = 800;
    private const double Height = 600;
    private static readonly Vector2D Dragon = new(400, 120);
    private static readonly Vector2D Player = new(410, 320);

    [TestMethod]
    public void Create_CinderSweep_FormsSequentialLineThroughCapturedPlayerPosition()
    {
        var profile = DragonHuntCatalog.Ashfang.Signature;

        var strikes = DragonHuntSignaturePlanner.Create(profile, 1, Dragon, Player, Width, Height, new FirstRandomSource());

        Assert.AreEqual(profile.StrikesFor(1), strikes.Count);
        Assert.AreEqual(0, strikes[0].DelaySeconds, 0.001);
        Assert.IsTrue(strikes.Zip(strikes.Skip(1)).All(pair => pair.Second.DelaySeconds > pair.First.DelaySeconds));
        Assert.IsTrue(strikes.Zip(strikes.Skip(1)).All(pair => Vector2D.Distance(pair.First.Position, pair.Second.Position) >= profile.Radius.For(1) * 1.9));
        Assert.IsTrue(strikes.All(strike => IsInsideArena(strike.Position, profile.Radius.For(1))));
    }

    [TestMethod]
    public void Create_TempestCage_SurroundsCapturedPlayerPosition()
    {
        var profile = DragonHuntCatalog.Stormcoil.Signature;

        var strikes = DragonHuntSignaturePlanner.Create(profile, 1, Dragon, Player, Width, Height, new FirstRandomSource());

        Assert.AreEqual(profile.StrikesFor(1), strikes.Count);
        Assert.IsTrue(strikes.All(strike => Vector2D.Distance(strike.Position, Player) > profile.Radius.For(1) * 2));
        Assert.IsTrue(strikes.Zip(strikes.Skip(1).Append(strikes[0]))
            .All(pair => Vector2D.Distance(pair.First.Position, pair.Second.Position) >= profile.Radius.For(1) * 1.9));
    }

    [TestMethod]
    public void Create_GlacialWall_LeavesExactlyOneGapAcrossWallSlots()
    {
        var profile = DragonHuntCatalog.Rimeclaw.Signature;

        var phaseOne = DragonHuntSignaturePlanner.Create(profile, 1, Dragon, Player, Width, Height, new FirstRandomSource());
        var phaseTwo = DragonHuntSignaturePlanner.Create(profile, 2, Dragon, Player, Width, Height, new FirstRandomSource());

        Assert.AreEqual(profile.StrikesFor(1), phaseOne.Count);
        Assert.AreEqual(profile.StrikesFor(2), phaseTwo.Count);
        Assert.IsTrue(phaseOne.All(strike => Math.Abs(strike.Position.X - Player.X) < 0.001));
        Assert.IsTrue(phaseOne.All(strike => strike.Radius is > 0 and <= 54));
    }

    [TestMethod]
    public void Create_GlacialWall_OnPortraitArena_CutsAcrossWidthAndPreservesScaledSegments()
    {
        var profile = DragonHuntCatalog.Rimeclaw.Signature;
        const double portraitWidth = 390;
        const double portraitHeight = 844;
        var player = new Vector2D(195, 420);

        var strikes = DragonHuntSignaturePlanner.Create(profile, 2, Dragon, player, portraitWidth, portraitHeight, new FirstRandomSource());

        Assert.AreEqual(profile.StrikesFor(2), strikes.Count);
        Assert.IsTrue(strikes.All(strike => Math.Abs(strike.Position.Y - player.Y) < 0.001));
        Assert.IsTrue(strikes.All(strike => strike.Radius is > 0 and < 62));
    }

    [TestMethod]
    public void Create_RiftEcho_MirrorsCapturedPlayerAndAddsCenterInPhaseTwo()
    {
        var profile = DragonHuntCatalog.Voidweaver.Signature;

        var phaseOne = DragonHuntSignaturePlanner.Create(profile, 1, Dragon, Player, Width, Height, new FirstRandomSource());
        var phaseTwo = DragonHuntSignaturePlanner.Create(profile, 2, Dragon, Player, Width, Height, new FirstRandomSource());

        Assert.AreEqual(Player, phaseOne[0].Position);
        Assert.AreEqual(new Vector2D(Width - Player.X, Height - Player.Y), phaseOne[1].Position);
        Assert.AreEqual(new Vector2D(Width / 2, Height / 2), phaseTwo[2].Position);
        Assert.IsTrue(phaseTwo[2].DelaySeconds > phaseTwo[1].DelaySeconds);
    }

    private static bool IsInsideArena(Vector2D position, double radius) =>
        position.X >= radius && position.X <= Width - radius && position.Y >= radius && position.Y <= Height - radius;
}
