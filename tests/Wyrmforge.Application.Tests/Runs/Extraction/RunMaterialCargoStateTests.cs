using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Application.Tests.Runs.Extraction;

[TestClass]
public sealed class RunMaterialCargoStateTests
{
    [TestMethod]
    public void Collect_UnsecuredLootLostOnDeathOrAbandon()
    {
        var cargo = new RunMaterialCargoState();
        cargo.Collect(HuntMaterialId.EmberResidue);
        cargo.LosePending();
        Assert.IsEmpty(cargo.Pending);
        Assert.IsEmpty(cargo.Secured);
    }

    [TestMethod]
    public void BeginTrail_ResetsDisplayedGatheringWithoutDiscardingUnsecuredCargo()
    {
        var cargo = new RunMaterialCargoState();
        cargo.BeginTrail();
        cargo.Collect(HuntMaterialId.EmberResidue);
        cargo.Collect(HuntMaterialId.CharredScrap);
        CollectionAssert.AreEqual(new[] { HuntMaterialId.EmberResidue, HuntMaterialId.CharredScrap },
            cargo.TrailCollected.ToArray());

        cargo.BeginTrail();
        Assert.IsEmpty(cargo.TrailCollected);
        Assert.HasCount(2, cargo.Pending);
        cargo.Collect(HuntMaterialId.EmberResidue);
        CollectionAssert.AreEqual(new[] { HuntMaterialId.EmberResidue }, cargo.TrailCollected.ToArray());
        cargo.SecurePending();
        Assert.IsEmpty(cargo.Pending);
        Assert.HasCount(3, cargo.Secured);
        CollectionAssert.AreEqual(new[] { HuntMaterialId.EmberResidue }, cargo.TrailCollected.ToArray());
    }

    [TestMethod]
    public void SecurePending_PreservesOnlyExtractedMaterialsAcrossLaterLoss()
    {
        var cargo = new RunMaterialCargoState();
        cargo.Collect(HuntMaterialId.EmberResidue);
        cargo.Collect(HuntMaterialId.CharredScrap);
        cargo.SecurePending();
        cargo.Collect(HuntMaterialId.EmberResidue);
        cargo.LosePending();
        CollectionAssert.AreEquivalent(new[] { HuntMaterialId.EmberResidue, HuntMaterialId.CharredScrap },
            cargo.Secured.ToArray());
        Assert.IsEmpty(cargo.Pending);
    }
}
