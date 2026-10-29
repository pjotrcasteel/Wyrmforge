using System.Text.Json;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
var results=new List<object>();
foreach(var seed in new[]{42,721,1337})
foreach(var profile in new[]{"tier1","evolved","stress"})
{
 var strong=profile=="stress";
 var selected=strong?SelfPlayBuildCatalog.All.First().SelectedNodes:new HashSet<string>();
 var setup=new DevelopmentHuntSetup(DragonId.Ashfang,false,1,SpellId.FireBolt,seed,402,874,true) { BossReadySpell = profile!="tier1" };
 var run=new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(selected,setup);
 var s=run.CreateSnapshot();var hp=s.Dragon!.Health;var max=hp;var previous=hp;var hits=new List<object>();var actions=new HashSet<string>();var flights=0;var lastFlight="ground";var seconds=0d;var phaseBreaks=0;var lastStage=0;
 while(seconds<150&&s.Dragon is not null&&!run.IsEnded){
  s=run.Tick(.05,default,402,874);seconds+=.05;
  var current=s.Dragon?.Health??0;
  if(current<previous-.001)hits.Add(new{at=Math.Round(seconds,2),damage=Math.Round(previous-current,2),remaining=Math.Round(current,2)});
  previous=current;
  if(s.Dragon?.Action is { } action&&action!="idle")actions.Add(action);
  if(s.Dragon?.FlightStage=="overhead"&&lastFlight!="overhead")flights++;
  lastFlight=s.Dragon?.FlightStage??"ground";
  if((int)(s.Hunt?.Stage??0)==3&&lastStage!=3)phaseBreaks++;
  lastStage=(int)(s.Hunt?.Stage??0);
 }
 results.Add(new{seed,loadout=profile,maxHealth=max,victory=s.Dragon is null,duration=Math.Round(seconds,2),damageEvents=hits.Count,firstHits=hits.Take(8),actions,flights,phaseBreaks});
}
Console.WriteLine(JsonSerializer.Serialize(results,new JsonSerializerOptions{WriteIndented=true}));

// Moving agents and an undefended stationary player face legal damage.
var challenge=new List<object>();
foreach(var seed in new[]{42,721,1337})
foreach(var mode in new[]{"stationary","Casual","Kiter","ReadableDodge"}){
 var setup=new DevelopmentHuntSetup(DragonId.Ashfang,false,1,SpellId.FireBolt,seed,402,874,false){BossReadySpell=false};
 var run=new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(new HashSet<string>(),setup);
 var agent=mode is "stationary" or "ReadableDodge"?null:new HeuristicRunAgent(Enum.Parse<RunAgentPersonality>(mode),seed);
 var s=run.CreateSnapshot();var seconds=0d;var initial=s.Hud.Health;var previousHealth=initial;var hurts=new List<object>();
 while(seconds<150&&s.Dragon is not null&&!run.IsEnded){
  var input=mode=="ReadableDodge"?ReadableDodge(s):agent?.ChooseMovement(new RunAgentObservation(s,[],[],[],[],[],run.Depth,0,false))??default;
  var before=s;
  s=run.Tick(.05,input,402,874);seconds+=.05;
  if(s.Hud.Health<previousHealth)hurts.Add(new{at=Math.Round(seconds,2),amount=previousHealth-s.Hud.Health,action=s.Dragon?.Action,phase=s.Dragon?.ActionPhase,flight=s.Dragon?.FlightStage,effects=s.AshfangEffects.Where(e=>e.Progress<.1).Select(e=>e.Kind).ToArray(),hazards=before.HuntHazards?.Where(h=>h.Progress>.8&&Wyrmforge.Domain.Combat.Geometry.Vector2D.Distance(new(s.Player.X,s.Player.Y),new(h.X,h.Y))<h.Radius+20).Select(h=>new{h.FromAbove,h.EffectKind,h.Radius,h.Progress}).ToArray()});
  previousHealth=s.Hud.Health;
 }
 challenge.Add(new{seed,mode,victory=s.Dragon is null,playerDefeated=s.Hud.Health<=0,duration=Math.Round(seconds,2),remainingHealth=Math.Round(s.Hud.Health,2),bossRemaining=Math.Round(s.Dragon?.Health??0,2),hurts});
}
var outputPath=Environment.GetEnvironmentVariable("ASHFANG_CHALLENGE_OUTPUT");
if(outputPath is not null)File.WriteAllText(outputPath,JsonSerializer.Serialize(challenge,new JsonSerializerOptions{WriteIndented=true}));

// Test controller uses only currently visible snapshot warnings, ordinary move
// speed and room edges. It cannot change health, targets, damage or future RNG.
static MovementInput ReadableDodge(Wyrmforge.Application.Runs.Simulation.Snapshots.RunRenderSnapshot s)
{
 var p=new Wyrmforge.Domain.Combat.Geometry.Vector2D(s.Player.X,s.Player.Y);
 var d=s.Dragon!;var boss=new Wyrmforge.Domain.Combat.Geometry.Vector2D(d.X,d.Y);
 var toward=Wyrmforge.Domain.Combat.Geometry.Vector2D.DirectionTo(boss,p);
 var desired=new Wyrmforge.Domain.Combat.Geometry.Vector2D(-toward.Y,toward.X);
 if(!d.Targetable){
  var radial=Wyrmforge.Domain.Combat.Geometry.Vector2D.DirectionTo(new(201,437),p);if(radial.Length<.01)radial=new(1,0);
  desired=new Wyrmforge.Domain.Combat.Geometry.Vector2D(-radial.Y,radial.X);
 }
 var best=double.PositiveInfinity;var result=default(MovementInput);
 for(var i=0;i<24;i++){
  var angle=i*Math.PI*2/24;var direction=new Wyrmforge.Domain.Combat.Geometry.Vector2D(Math.Cos(angle),Math.Sin(angle));
  var cost=-(direction.X*desired.X+direction.Y*desired.Y)*2;
  foreach(var t in new[]{.15,.4,.65}){
   var q=p+direction*(190*t);if(q.X<18||q.X>384||q.Y<18||q.Y>856)cost+=80;
   foreach(var h in s.HuntHazards??[]){
    if(!h.Armed)continue;var dist=Wyrmforge.Domain.Combat.Geometry.Vector2D.Distance(q,new(h.X,h.Y));
    if(dist<h.Radius+15)cost+=45*(1-dist/(h.Radius+15))*(.35+h.Progress);
   }
   if(d.Targetable&&Wyrmforge.Domain.Combat.Geometry.Vector2D.Distance(q,boss)<d.Radius+25)cost+=30;
   if(d.Action=="pounce"&&d.ActionPhase is "windup" or "strike"){
    var dist=Wyrmforge.Domain.Combat.Geometry.Vector2D.Distance(q,new(d.AttackTargetX,d.AttackTargetY));if(dist<90)cost+=30*(1-dist/90);
   }else if(s.DragonBreath is { } breath||d.Action=="breath"&&d.ActionPhase=="strike"){
    var offset=q-boss;var dist=offset.Length;var range=s.DragonBreath?.Range??340;var half=s.DragonBreath?.HalfAngle??.4;
    if(dist<range&&dist>.01&&(offset.X*d.DirectionX+offset.Y*d.DirectionY)/dist>Math.Cos(half+.08))cost+=45;
   }
  }
  if(cost<best){best=cost;result=new(direction.X,direction.Y);}
 }
 return result;
}
