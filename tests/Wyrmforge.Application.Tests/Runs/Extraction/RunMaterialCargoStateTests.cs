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
