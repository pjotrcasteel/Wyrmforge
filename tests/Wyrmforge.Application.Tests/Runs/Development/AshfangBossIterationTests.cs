using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Spells;
namespace Wyrmforge.Application.Tests.Runs.Development;
[TestClass]
public sealed class AshfangBossIterationTests
{
    private static RunSimulation Create(bool strong=false,bool invulnerable=true,bool environment=false) =>
        new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(new HashSet<string>(),
            new DevelopmentHuntSetup(DragonId.Ashfang,false,1,SpellId.FireBolt,42,402,874,invulnerable){BossReadySpell=strong,Environment=environment});
    private static T Field<T>(RunSimulation run,string name) => (T)typeof(RunSimulation).GetField(name,BindingFlags.Instance|BindingFlags.NonPublic)!.GetValue(run)!;
    private static void Invoke(RunSimulation run,string name,params object[] args) => typeof(RunSimulation).GetMethod(name,BindingFlags.Instance|BindingFlags.NonPublic)!.Invoke(run,args);

    [TestMethod]
    public void TierOneLoadoutHasNoForcedEvolutionAndBossSurvivesOpeningVolleys()
    {
        var run=Create();var hud=run.CreateSnapshot().Hud.Spells.Single(s=>s.IsActive);
        Assert.AreEqual(1,hud.Rank);Assert.IsNull(hud.EvolutionName);
        for(var i=0;i<160;i++)run.Tick(.05,default,402,874);
        Assert.IsNotNull(run.CreateSnapshot().Dragon);Assert.IsGreaterThan(.5,run.CreateSnapshot().Dragon!.Health/run.CreateSnapshot().Dragon!.MaxHealth);
        var stress=Create(true).CreateSnapshot().Hud.Spells.Single(s=>s.IsActive);
        Assert.AreEqual(3,stress.Rank);Assert.IsNotNull(stress.EvolutionName);
    }
    [TestMethod]
    public void TierOneFightCompletesBothPhasesAndAerialCyclesInsteadOfEndingInFourShots()
    {
        var run=Create();var flights=0;var last="ground";var seconds=0d;var phases=new HashSet<int>();var actions=new HashSet<string>();
        while(run.CreateSnapshot().Dragon is not null&&seconds<110){
            var s=run.Tick(.05,default,402,874);seconds+=.05;
            if(s.Dragon is { } d){phases.Add(d.Phase);if(d.Action is { } a&&a!="idle")actions.Add(a);if(d.FlightStage=="overhead"&&last!="overhead")flights++;last=d.FlightStage??"ground";}
        }
        Assert.IsNull(run.CreateSnapshot().Dragon);Assert.IsGreaterThan(25,seconds);Assert.IsGreaterThan(0,flights);
        CollectionAssert.AreEquivalent(new[]{1,2},phases.ToArray());Assert.IsTrue(actions.Contains("breath"));Assert.IsTrue(actions.Contains("claw_right"));
    }
    [TestMethod]
    public void BreathCanCatchLateEntryButNeverDamagesTwiceDuringOneRelease()
    {
        var run=Create(invulnerable:false);var dragon=Field<DragonState>(run,"dragon");var player=Field<PlayerState>(run,"player");var brain=Field<AshfangBehaviorState>(run,"ashfangBehavior");
        dragon.Position=Vector2D.Zero;player.Position=new(0,250);brain.Begin("breath",Vector2D.Zero,new(300,0),.8);brain.Strike();
        var health=player.Health;Invoke(run,"UpdateAshfangCombat",dragon,.1);Invoke(run,"ResolvePlayerDamage");Assert.AreEqual(health,player.Health);
        player.Position=new(220,0);Invoke(run,"UpdateAshfangCombat",dragon,.1);Invoke(run,"ResolvePlayerDamage");Assert.IsLessThan(health,player.Health);
        var after=player.Health;typeof(RunSimulation).GetField("playerDamageGuardRemaining",BindingFlags.Instance|BindingFlags.NonPublic)!.SetValue(run,0d);
        Invoke(run,"UpdateAshfangCombat",dragon,.1);Invoke(run,"ResolvePlayerDamage");Assert.AreEqual(after,player.Health);Assert.AreEqual("strike",brain.Phase);
    }
    [TestMethod]
    public void RainAndLandingEffectsComeFromResolvedHazardsAndSnapshotReadsDoNotAdvanceThem()
    {
        var run=Create();var dragon=Field<DragonState>(run,"dragon");
        typeof(RunSimulation).GetField("arenaWidth",BindingFlags.Instance|BindingFlags.NonPublic)!.SetValue(run,402d);
        typeof(RunSimulation).GetField("arenaHeight",BindingFlags.Instance|BindingFlags.NonPublic)!.SetValue(run,874d);
        Invoke(run,"UpdateAshfangFlight",dragon,8.01);Invoke(run,"UpdateAshfangFlight",dragon,1.4);
        Assert.IsTrue(run.CreateSnapshot().HuntHazards!.Any(h=>h.FromAbove));Assert.AreEqual(0,run.CreateSnapshot().AshfangEffects.Count);
        Invoke(run,"UpdateDragonHuntPressure",1.2,dragon,402d,874d);
        Assert.IsTrue(run.CreateSnapshot().AshfangEffects.Any(e=>e.Kind=="meteor"));
        var before=run.CreateSnapshot().AshfangEffects;CollectionAssert.AreEqual(before.ToArray(),run.CreateSnapshot().AshfangEffects.ToArray());
        Invoke(run,"UpdateAshfangFlight",dragon,4.8);
        Assert.IsTrue(run.CreateSnapshot().HuntHazards!.Any(h=>h.EffectKind=="landing"));Assert.IsFalse(run.CreateSnapshot().AshfangEffects.Any(e=>e.Kind=="landing"));
        Invoke(run,"UpdateDragonHuntPressure",.96,dragon,402d,874d);
        Assert.IsTrue(run.CreateSnapshot().AshfangEffects.Any(e=>e.Kind=="landing"));
    }
    [TestMethod]
    public void DevelopmentAshfangUsesFireEcologyInsteadOfDefaultArcaneRunes()
    {
        var run=Create(environment:true);Assert.AreEqual("fire",run.CreateSnapshot().Environment!.Element);
    }
}
