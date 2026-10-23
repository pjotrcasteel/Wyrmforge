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
