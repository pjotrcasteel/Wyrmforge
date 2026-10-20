using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.World;

namespace Wyrmforge.Application.Tests.World;

[TestClass]
public sealed class TownCrowdTests
{
    [TestMethod]
    public void Step_SameSeedAndTicks_ReplaysIdenticalPedestrians()
    {
        var first = new TownCrowd(451);
        var replay = new TownCrowd(451);
        var witnessedMovement = false;

        for (var tick = 0; tick < 800; tick++)
        {
            first.Step(TimeSpan.FromMilliseconds(100));
            replay.Step(TimeSpan.FromMilliseconds(100));
            for (var i = 0; i < first.Citizens.Count; i++)
            {
                var actual = first.Citizens[i];
                var expected = replay.Citizens[i];
                Assert.AreEqual(expected.XPercent, actual.XPercent);
                Assert.AreEqual(expected.YPercent, actual.YPercent);
                Assert.AreEqual(expected.DestinationNode, actual.DestinationNode);
                witnessedMovement |= actual.IsWalking;
            }
        }

        Assert.IsTrue(witnessedMovement, "Citizens must actually walk, not remain frozen at spawn.");
    }

    [TestMethod]
    public void Step_LongBackgroundDelay_IsLimitedToOneTick()
    {
        var resumed = new TownCrowd(17);
        var regular = new TownCrowd(17);

        resumed.Step(TimeSpan.FromMinutes(3));
        regular.Step(TimeSpan.FromMilliseconds(100));

        for (var i = 0; i < resumed.Citizens.Count; i++)
        {
            Assert.AreEqual(regular.Citizens[i].XPercent, resumed.Citizens[i].XPercent);
            Assert.AreEqual(regular.Citizens[i].YPercent, resumed.Citizens[i].YPercent);
        }
    }

    [TestMethod]
    public void Step_PedestriansRemainOnSceneAndDoNotTeleport()
    {
        var town = new TownCrowd(261);
        for (var tick = 0; tick < 1200; tick++)
        {
            var before = town.Citizens.Select(c => (c.XPercent, c.YPercent)).ToArray();
            town.Step(TimeSpan.FromMilliseconds(100));
            for (var i = 0; i < town.Citizens.Count; i++)
            {
                var person = town.Citizens[i];
                var travelled = MathF.Sqrt(MathF.Pow((person.XPercent - before[i].XPercent) * 1672f / 941f, 2)
                    + MathF.Pow(person.YPercent - before[i].YPercent, 2));
                Assert.IsTrue(travelled <= 1.11f, $"Citizen {person.Id} jumped {travelled} town units.");
                Assert.IsTrue(person.XPercent is >= 0 and <= 100);
                Assert.IsTrue(person.YPercent is >= 0 and <= 100);
            }

            var destinations = town.Citizens.Where(c => c.IsWalking).Select(c => c.DestinationNode).ToList();
            Assert.AreEqual(destinations.Count, destinations.Distinct().Count(), "Two citizens reserved the same stop.");
        }
    }

    [TestMethod]
    public void TownCrowd_InvalidCount_IsRejectedWithoutChangingGameProgress()
    {
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new TownCrowd(citizenCount: -1));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new TownCrowd(citizenCount: 15));
        Assert.AreEqual(0, new TownCrowd(citizenCount: 0).Citizens.Count);
        Assert.AreEqual(7, new TownCrowd().Citizens.Count);
    }
}
