using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.Hunts;
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
    public void SharedLightingFollowsBreathCommitmentAndExtinguishesOnRecovery()
    {
        var run=Create();var brain=Field<AshfangBehaviorState>(run,"ashfangBehavior");
        brain.Begin("breath",Vector2D.Zero,new(300,0),.95);brain.Strike();
        var a=run.CreateSnapshot().Lighting!.Lights.Single(l=>l.OwnerId.StartsWith("ashfang:"));
        var b=run.CreateSnapshot().Lighting!.Lights.Single(l=>l.OwnerId.StartsWith("ashfang:"));
        Assert.AreEqual(a.Id,b.Id);CollectionAssert.AreEqual(a.Position,b.Position);
        Assert.IsGreaterThan(0,a.Intensity);Assert.IsGreaterThan(0,a.Range);
        brain.Recover();
        Assert.IsFalse(run.CreateSnapshot().Lighting!.Lights.Any(l=>l.OwnerId.StartsWith("ashfang:")));
    }

    [TestMethod]
    public void SharedLightingOnlyIgnitesResolvedMeteorAndCoolsBeforeScorchEnds()
    {
        var run=Create();
        Invoke(run,"RegisterAshfangEffect","meteor",new Vector2D(120,170),45d,Vector2D.Zero);
        var light=run.CreateSnapshot().Lighting!.Lights.Single(l=>l.OwnerId.StartsWith("ashfang-effect:"));
        CollectionAssert.AreEqual(new[]{120d,170d,8d},light.Position);
        Invoke(run,"UpdateCombatFeedback",.6);
        Assert.IsFalse(run.CreateSnapshot().Lighting!.Lights.Any(l=>l.OwnerId.StartsWith("ashfang-effect:")));
        Assert.IsTrue(run.CreateSnapshot().AshfangEffects.Any(e=>e.Kind=="meteor"));
    }

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
        Field<DragonHuntState>(run,"dragonHuntState").TickStage(10);
        Assert.IsTrue(run.CreateSnapshot().DragonBreath!.Active);
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
    [TestMethod]
    public void PlayerTargetedPressureAndBreathAllowAnUnboostedHunterToEscapeAfterReaction()
    {
        var player=new PlayerState();
        foreach(var phase in new[]{1,2}){
            var pressure=DragonHuntCatalog.Ashfang.Pressure;
            var budget=(pressure.Cadence.TelegraphSeconds.For(phase)-.15)*player.Speed;
            Assert.IsGreaterThan(pressure.Radius.For(phase)+player.Radius,budget);
            var brain=new AshfangBehaviorState();brain.Begin("breath",Vector2D.Zero,new(330,0),DragonCatalog.Ashfang.Combat.Attack.TelegraphSeconds.For(phase));
            Assert.IsGreaterThan(brain.Range*Math.Sin(brain.HalfAngle)+player.Radius,(brain.Duration-.15)*player.Speed);
        }
    }
}
