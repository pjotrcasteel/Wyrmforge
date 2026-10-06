using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Combat.Projectiles;

[TestClass]
public sealed class ProjectileStateTests
{
    [TestMethod]
    public void ContinueAfterHit_WithOnePierce_ContinuesOnceThenConsumes()
    {
        var effects = new ProjectileEffects(false, 0, 0, null, 1, 0);
        var projectile = new ProjectileState(new Vector2D(0, 0), new Vector2D(1, 0), 5, 10, SpellId.ArcaneOrb, effects);

        var continuesAfterFirstHit = projectile.ContinueAfterHit(11);
        var continuesAfterSecondHit = projectile.ContinueAfterHit(12);

        Assert.IsTrue(continuesAfterFirstHit);
        Assert.AreEqual(0, projectile.PiercesRemaining);
        Assert.AreEqual(11, projectile.IgnoredTargetId);
        Assert.IsFalse(continuesAfterSecondHit);
    }

    [TestMethod]
    public void ContinueAfterHit_WithoutPierce_ConsumesImmediately()
    {
        var effects = new ProjectileEffects(false, 0, 0, null, 0, 0);
        var projectile = new ProjectileState(new Vector2D(0, 0), new Vector2D(1, 0), 5, 10, SpellId.FireBolt, effects);

        var continues = projectile.ContinueAfterHit(11);

        Assert.IsFalse(continues);
        Assert.AreEqual(0, projectile.IgnoredTargetId);
    }

    [TestMethod]
    public void FrostNovaRadius_FromEffects_IsExposed()
    {
        var effects = new ProjectileEffects(false, 0, 0, null, 0, FrostShardMastery.NovaRadius);
        var projectile = new ProjectileState(new Vector2D(0, 0), new Vector2D(1, 0), 5, 10, SpellId.FrostShard, effects);

        Assert.AreEqual(FrostShardMastery.NovaRadius, projectile.FrostNovaRadius);
    }
}
