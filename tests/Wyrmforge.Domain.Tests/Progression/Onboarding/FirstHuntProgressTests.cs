using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.Onboarding;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests.Progression.Onboarding;

[TestClass]
public sealed class FirstHuntProgressTests
{
    [TestMethod]
    public void CompleteRun_FirstHuntDeath_UnlocksAtlasAndCodexButNotScores()
    {
        var progress = new FirstHuntProgress();
        Assert.IsTrue(progress.TutorialRun);
        Assert.IsFalse(progress.AtlasUnlocked);
        Assert.IsTrue(progress.CompleteRun(abandoned: false));
        Assert.IsTrue(progress.AtlasUnlocked);
        Assert.IsTrue(progress.CodexUnlocked);
        Assert.IsFalse(progress.LeaderboardUnlocked);
    }

    [TestMethod]
    public void CompleteRun_SecondRound_UnlocksLeaderboard()
    {
        var progress = new FirstHuntProgress();
        progress.CompleteRun(false);
        progress.CompleteRun(false);
        Assert.IsTrue(progress.LeaderboardUnlocked);
        Assert.IsFalse(progress.TutorialRun);
        progress.CompleteRun(false);
        Assert.AreEqual(2, progress.CompletedRuns);
    }

    [TestMethod]
    public void CompleteRun_AbandonTutorial_DoesNotUnlockChapters()
    {
        var progress = new FirstHuntProgress();
        Assert.IsFalse(progress.CompleteRun(abandoned: true));
        Assert.IsTrue(progress.TutorialRun);
    }


    [TestMethod]
    public void AwardsArcanePoint_TutorialFinished_KeepsInitialPointWithoutDuplicateGrant()
    {
        var progress = new FirstHuntProgress();
        Assert.IsFalse(progress.AwardsArcanePoint(tutorialRunAtStart: true, abandoned: false));
        progress.CompleteRun(abandoned: false);
        Assert.IsFalse(progress.AwardsArcanePoint(tutorialRunAtStart: true, abandoned: false));
        Assert.IsTrue(progress.AtlasUnlocked);
    }

    [TestMethod]
    public void AwardsArcanePoint_SecondAndLaterFinishedHunts_GrantsUntilPointCap()
    {
        var progress = new FirstHuntProgress();
        progress.CompleteRun(false);
        var selection = new PassiveTreeSelection(1);

        for (var hunt = 2; hunt <= 50; hunt++)
        {
            Assert.IsTrue(progress.AwardsArcanePoint(tutorialRunAtStart: false, abandoned: false));
            selection.GrantPoints(1);
            progress.CompleteRun(false);
        }

        Assert.AreEqual(PassiveTreeCatalog.TotalPoints, selection.PointBudget);
        Assert.IsTrue(progress.LeaderboardUnlocked);
    }

    [TestMethod]
    public void AwardsArcanePoint_AbandonedHunt_DoesNotGrantOrAdvanceChapter()
    {
        var progress = new FirstHuntProgress();
        progress.CompleteRun(false);
        var selection = new PassiveTreeSelection(1);
        Assert.IsFalse(progress.AwardsArcanePoint(tutorialRunAtStart: false, abandoned: true));
        Assert.IsFalse(progress.CompleteRun(abandoned: true));
        Assert.AreEqual(1, progress.CompletedRuns);
        Assert.AreEqual(1, selection.PointBudget);
    }

    [TestMethod]
    public void Restore_ExperiencedPlayerAndArcaneBudget_AreNotReset()
    {
        var progress = new FirstHuntProgress();
        progress.MigrateExperiencedPlayer();
        Assert.IsTrue(progress.LeaderboardUnlocked);
        var selection = new PassiveTreeSelection(1);
        selection.RestoreBudget(24);
        Assert.AreEqual(24, selection.PointBudget);
    }

    [TestMethod]
    public void GrantPoints_ClampsToCatalogCap()
    {
        var selection = new PassiveTreeSelection(1);
        selection.GrantPoints(1);
        Assert.AreEqual(2, selection.PointBudget);
        selection.GrantPoints(100);
        Assert.AreEqual(PassiveTreeCatalog.TotalPoints, selection.PointBudget);
    }
}
