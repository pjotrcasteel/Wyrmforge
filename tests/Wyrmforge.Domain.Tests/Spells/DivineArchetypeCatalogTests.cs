using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class DivineArchetypeCatalogTests
{
    [TestMethod]
    public void Catalog_HasExactlySixDistinctDivineArchetypes()
    {
        var definitions = DivineArchetypeCatalog.All.ToArray();
        Assert.AreEqual(6, definitions.Length);
        CollectionAssert.AreEquivalent(Enum.GetValues<DivineArchetype>(), definitions.Select(definition => definition.Id).ToArray());
        Assert.AreEqual(6, definitions.Select(definition => definition.Domain).Distinct(StringComparer.Ordinal).Count());
        Assert.IsTrue(definitions.All(definition => !string.IsNullOrWhiteSpace(definition.Name) && !string.IsNullOrWhiteSpace(definition.CombatIdentity)));
    }

    [TestMethod]
    public void ExistingSchools_KeepTheirSignatureAndLesserWyrmMappings()
    {
        var anchors = new (DivineArchetype Archetype, SpellSchool School, SpellId Signature, DragonId Wyrm)[]
        {
            (DivineArchetype.Pyromancer, SpellSchool.Fire, SpellId.FireBolt, DragonId.Ashfang),
            (DivineArchetype.Cryomancer, SpellSchool.Frost, SpellId.FrostShard, DragonId.Rimeclaw),
            (DivineArchetype.Stormcaller, SpellSchool.Storm, SpellId.ChainLightning, DragonId.Stormcoil),
            (DivineArchetype.Arcanist, SpellSchool.Arcane, SpellId.ArcaneOrb, DragonId.Voidweaver),
        };
        foreach (var (archetype, school, signature, wyrm) in anchors)
        {
            var definition = DivineArchetypeCatalog.Get(archetype);
            Assert.AreEqual(school, definition.ExistingSchool);
            Assert.AreEqual(signature, definition.ExistingSignature);
            Assert.AreEqual(wyrm, definition.ExistingLesserWyrm);
            Assert.AreEqual(archetype, DivineArchetypeCatalog.FromExistingSchool(school).Id);
            Assert.AreEqual(school, SpellCatalog.Get(signature).School);
        }
    }

    [TestMethod]
    public void ReservedSchools_DoNotClaimUnimplementedSpellsOrWyrms()
    {
        foreach (var id in new[] { DivineArchetype.Necromancer, DivineArchetype.Summoner })
        {
            var definition = DivineArchetypeCatalog.Get(id);
            Assert.IsNull(definition.ExistingSchool);
            Assert.IsNull(definition.ExistingSignature);
            Assert.IsNull(definition.ExistingLesserWyrm);
        }
    }

    [TestMethod]
    public void MutationMasteryTier_HasFiveOrderedValuesIndependentFromWyrmTier()
    {
        CollectionAssert.AreEqual(new[] { 1, 2, 3, 4, 5 },
            Enum.GetValues<MutationMasteryTier>().Select(tier => (int)tier).ToArray());
        CollectionAssert.AreEquivalent(new[]
        {
            WyrmTier.Wyrm, WyrmTier.Ascendant, WyrmTier.Elder, WyrmTier.Primordial, WyrmTier.Divine,
        }, Enum.GetValues<WyrmTier>());
    }
}
