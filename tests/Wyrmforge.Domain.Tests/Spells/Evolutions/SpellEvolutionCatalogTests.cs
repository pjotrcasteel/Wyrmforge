using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Domain.Tests.Spells.Evolutions;

[TestClass]
public sealed class SpellEvolutionCatalogTests
{
    [TestMethod]
    public void All_EachSpellHasTwoDistinctEvolutionBranches()
    {
        foreach (var spell in SpellCatalog.All)
        {
            var branches = SpellEvolutionCatalog.For(spell.Id);

            Assert.AreEqual(2, branches.Count, $"{spell.Name} should have exactly two base evolution branches.");
            Assert.AreEqual(2, branches.Select(branch => branch.Id).Distinct().Count());
            Assert.IsTrue(branches.All(branch => branch.Spell == spell.Id));
            Assert.IsTrue(branches.All(branch => branch.Profile != SpellEvolutionProfile.Identity));
        }
    }

    [TestMethod]
    public void All_EvolutionProfilesChangeMultipleSpellDimensions()
    {
        foreach (var evolution in SpellEvolutionCatalog.All)
        {
            var profile = evolution.Profile;
            var changes = new[]
            {
                profile.DamageMultiplier != 1,
                profile.CastIntervalMultiplier != 1,
                profile.ProjectileSpeedMultiplier != 1,
                profile.ProjectileRadiusMultiplier != 1,
                profile.ExtraProjectiles != 0,
                profile.BonusPierces != 0,
                profile.BonusChains != 0,
                profile.SplashRadius != 0,
                profile.FrostNovaRadius != 0,
                profile.StatusDurationMultiplier != 1,
                profile.BonusStatusStacks != 0,
                profile.ChainFalloffMultiplier != 1,
            }.Count(changed => changed);

            Assert.IsGreaterThanOrEqualTo(2, changes, $"{evolution.Name} should feel like a transformation, not a single-stat upgrade.");
        }
    }
}
