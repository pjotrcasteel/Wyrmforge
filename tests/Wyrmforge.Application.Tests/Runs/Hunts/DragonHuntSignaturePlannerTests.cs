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

    [TestMethod]
    public void Create_Crownfall_LeavesChangingSafeGatesOnPortraitAndLandscape()
    {
        var signature = DragonHuntCatalog.AscendantAshfang.Signature;
        Assert.AreEqual(DragonHuntSignatureKind.Crownfall, signature.Kind);

        foreach (var (width, height, player) in new[]
        {
            (390d, 844d, new Vector2D(195, 410)),
            (844d, 390d, new Vector2D(420, 195)),
        })
        {
            var first = DragonHuntSignaturePlanner.Create(signature, 1, Dragon, player, width, height, new FirstRandomSource());
            var second = DragonHuntSignaturePlanner.Create(signature, 2, Dragon, player, width, height, new FirstRandomSource());

            Assert.AreEqual(6, first.Count);
            Assert.AreEqual(9, second.Count);
            Assert.IsTrue(second.All(strike => strike.Radius > 0));
            Assert.IsTrue(second.All(strike => strike.Position.X >= 0 && strike.Position.X <= width
                && strike.Position.Y >= 0 && strike.Position.Y <= height));
            var waves = second.GroupBy(strike => strike.DelaySeconds).OrderBy(group => group.Key).ToArray();
            Assert.AreEqual(3, waves.Length);
            Assert.IsTrue(waves.All(wave => wave.Count() == 3));
            Assert.IsTrue(waves.All(wave => wave.Select(strike => width <= height ? strike.Position.X : strike.Position.Y).Distinct().Count() == 3));
            Assert.IsFalse(waves[0].Select(strike => strike.Position).SequenceEqual(waves[1].Select(strike => strike.Position)));
            Assert.IsTrue(waves[1].Key >= 1d);
        }
    }

    [TestMethod]
    public void AscendantAshfangRule_FreshRite_OnlyForcesFirstDepthTwoAshfang()
    {
        Assert.IsFalse(AscendantAshfangRule.ShouldForceAshfang(false, false, 2));
        Assert.IsFalse(AscendantAshfangRule.ShouldForceAshfang(true, false, 1));
        Assert.IsTrue(AscendantAshfangRule.ShouldForceAshfang(true, false, 2));
        Assert.IsFalse(AscendantAshfangRule.ShouldForceAshfang(true, true, 3));
        Assert.IsFalse(AscendantAshfangRule.IsEncounter(true, false, 2, Wyrmforge.Domain.Combat.Dragons.DragonId.Stormcoil));
        Assert.IsTrue(AscendantAshfangRule.IsEncounter(true, false, 2, Wyrmforge.Domain.Combat.Dragons.DragonId.Ashfang));
    }

    [TestMethod]
    public void SkybreakCrossing_AlternatesPerpendicularCorridorsAndThirdPhaseTwoWave()
    {
        var signature = DragonHuntCatalog.AscendantStormcoil.Signature;
        Assert.AreEqual(DragonHuntSignatureKind.SkybreakCrossing, signature.Kind);

        foreach (var (width, height, player) in new[]
        {
            (390d, 844d, new Vector2D(195, 410)),
            (844d, 390d, new Vector2D(420, 195)),
        })
        {
            var early = DragonHuntSignaturePlanner.Create(signature, 1, Dragon, player, width, height, new FirstRandomSource());
            var late = DragonHuntSignaturePlanner.Create(signature, 2, Dragon, player, width, height, new FirstRandomSource());
            Assert.AreEqual(10, early.Count);
            Assert.AreEqual(15, late.Count);
            var waves = late.GroupBy(strike => strike.DelaySeconds).OrderBy(group => group.Key).ToArray();
            Assert.AreEqual(3, waves.Length);
            Assert.IsTrue(waves.All(wave => wave.Count() == 5));
            Assert.IsTrue(waves.All(wave => wave.All(strike => strike.Radius is > 0 && strike.Position.X >= 0 &&
                strike.Position.X <= width && strike.Position.Y >= 0 && strike.Position.Y <= height)));
            Assert.IsTrue(waves[0].All(strike => Math.Abs(strike.Position.Y - player.Y) < 0.001));
            Assert.IsTrue(waves[1].All(strike => Math.Abs(strike.Position.X - player.X) < 0.001));
            Assert.IsTrue(waves[2].Select(strike => strike.Position).Distinct().Count() >= 3);
            Assert.IsTrue(waves[1].Key >= 1.3 && waves[2].Key >= 2.6);
            Assert.IsFalse(waves[0].Select(strike => strike.Position).SequenceEqual(waves[1].Select(strike => strike.Position)));
        }
    }

    [TestMethod]
    public void AscendantHuntRule_SealedRiteTarget_OnlyReplacesDepthTwoMatchingWyrm()
    {
        Assert.IsFalse(AscendantHuntRule.ShouldForce(null, false, 2));
        Assert.IsFalse(AscendantHuntRule.ShouldForce(Wyrmforge.Domain.Combat.Dragons.DragonId.Rimeclaw, false, 2));
        Assert.IsFalse(AscendantHuntRule.ShouldForce(Wyrmforge.Domain.Combat.Dragons.DragonId.Stormcoil, false, 1));
        Assert.IsTrue(AscendantHuntRule.ShouldForce(Wyrmforge.Domain.Combat.Dragons.DragonId.Stormcoil, false, 2));
        Assert.IsFalse(AscendantHuntRule.ShouldForce(Wyrmforge.Domain.Combat.Dragons.DragonId.Stormcoil, true, 3));
        Assert.IsTrue(AscendantHuntRule.IsEncounter(Wyrmforge.Domain.Combat.Dragons.DragonId.Stormcoil, false, 2,
            Wyrmforge.Domain.Combat.Dragons.DragonId.Stormcoil));
        Assert.IsFalse(AscendantHuntRule.IsEncounter(Wyrmforge.Domain.Combat.Dragons.DragonId.Stormcoil, false, 2,
            Wyrmforge.Domain.Combat.Dragons.DragonId.Ashfang));
        Assert.AreEqual("Tempest Cage", DragonHuntCatalog.Stormcoil.Signature.Name);
        Assert.AreEqual("Crownfall", DragonHuntCatalog.AscendantAshfang.Signature.Name);
    }

    private static bool IsInsideArena(Vector2D position, double radius) =>
        position.X >= radius && position.X <= Width - radius && position.Y >= radius && position.Y <= Height - radius;
}
