using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.Codex;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Tests.Progression.Codex;

[TestClass]
public sealed class ArcaneCodexTests
{
    [TestMethod]
    public void Discover_SameSynergyTwice_StoresOneDiscovery()
    {
        var codex = new ArcaneCodex();

        var firstDiscovery = codex.Discover(SynergyId.Frostfire);
        var secondDiscovery = codex.Discover(SynergyId.Frostfire);

        Assert.IsTrue(firstDiscovery);
        Assert.IsFalse(secondDiscovery);
        Assert.AreEqual(1, codex.Count);
        Assert.IsTrue(codex.Contains(SynergyId.Frostfire));
    }

    [TestMethod]
    public void Restore_ReplacesPreviousDiscoveriesAndDeduplicates()
    {
        var codex = new ArcaneCodex();
        codex.Discover(SynergyId.ArcaneConduit);

        codex.Restore([SynergyId.Frostfire, SynergyId.Stormglass, SynergyId.Frostfire]);

        Assert.AreEqual(2, codex.Count);
        Assert.IsTrue(codex.Contains(SynergyId.Frostfire));
        Assert.IsTrue(codex.Contains(SynergyId.Stormglass));
        Assert.IsFalse(codex.Contains(SynergyId.ArcaneConduit));
    }
}