using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Tests.Progression.DragonEssences;

[TestClass]
public sealed class DragonEssenceVaultTests
{
    [TestMethod]
    public void Store_SameEssenceTwice_CountsBothExtractions()
    {
        var vault = new DragonEssenceVault();

        vault.Store(DragonEssenceId.CinderHeart);
        vault.Store(DragonEssenceId.CinderHeart);

        Assert.AreEqual(2, vault.TotalCount);
        Assert.AreEqual(2, vault.Count(DragonEssenceId.CinderHeart));
    }

    [TestMethod]
    public void Restore_ReplacesExistingVaultContents()
    {
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.CinderHeart);

        vault.Restore([DragonEssenceId.MoltenFang, DragonEssenceId.AshenWing]);

        Assert.AreEqual(2, vault.TotalCount);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.CinderHeart));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.MoltenFang));
        Assert.AreEqual(1, vault.Count(DragonEssenceId.AshenWing));
    }
}
