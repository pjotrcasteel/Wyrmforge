using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Progression;

[TestClass]
public sealed class RunVarietyCatalogTests
{
    [TestMethod]
    public void SpellCatalog_VarietyPass_ProvidesTwoSpellsPerSchool()
    {
        Assert.HasCount(8, SpellCatalog.All);
        foreach (var school in Enum.GetValues<SpellSchool>()) Assert.AreEqual(2, SpellCatalog.All.Count(spell => spell.School == school));
    }

    [TestMethod]
    public void SpellCatalog_NewSpells_ExposeDistinctStatusEffects()
    {
        Assert.AreEqual(CombatStatusId.Burning, SpellCatalog.Get(SpellId.CinderNeedle).Ability.Status?.Status);
        Assert.AreEqual(CombatStatusId.Chilled, SpellCatalog.Get(SpellId.IceLance).Ability.Status?.Status);
        Assert.AreEqual(CombatStatusId.Shocked, SpellCatalog.Get(SpellId.BallLightning).Ability.Status?.Status);
        Assert.AreEqual(CombatStatusId.ArcaneMark, SpellCatalog.Get(SpellId.AetherDart).Ability.Status?.Status);
    }

    [TestMethod]
    public void RunUpgradeCatalog_VarietyPass_ExpandsChoicePool()
    {
        Assert.HasCount(12, RunUpgradeCatalog.All);
        Assert.IsNotNull(RunUpgradeCatalog.Get(RunUpgradeId.Bulwark));
        Assert.IsNotNull(RunUpgradeCatalog.Get(RunUpgradeId.Velocity));
        Assert.IsNotNull(RunUpgradeCatalog.Get(RunUpgradeId.Emberbrand));
        Assert.IsNotNull(RunUpgradeCatalog.Get(RunUpgradeId.StaticCharge));
    }

    [TestMethod]
    public void RelicCatalog_VarietyPass_ExpandsChoicePool()
    {
        Assert.HasCount(8, RelicCatalog.All);
        Assert.AreEqual(RelicCatalog.All.Count, RelicCatalog.All.Select(relic => relic.Id).Distinct().Count());
    }

    [TestMethod]
    public void EnemyCatalog_VarietyPass_ProvidesDistinctPressureProfiles()
    {
        var skitter = EnemyCatalog.Get(EnemyKind.Skitter);
        var brute = EnemyCatalog.Get(EnemyKind.Brute);

        Assert.IsTrue(skitter.SpeedMultiplier > 1);
        Assert.IsTrue(skitter.HealthMultiplier < 1);
        Assert.IsTrue(brute.SpeedMultiplier < 1);
        Assert.IsTrue(brute.HealthMultiplier > 1);
        Assert.AreEqual(2, brute.MinimumDepth);
    }
}
