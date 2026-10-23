using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;
namespace Wyrmforge.Application.Runs.Simulation;
public sealed partial class RunSimulation
{
    private readonly AshfangFlightState ashfangFlight = new();
    private double ashfangRainRemaining;
    private bool CanTargetActiveDragon => dragonHuntState.CanTargetDragon && (dragon?.Definition.Id != DragonId.Ashfang || ashfangFlight.Targetable);

    private bool UpdateAshfangFlight(DragonState active,double delta)
    {
        if(delta<=0)return ashfangFlight.Active;
        var completed=ashfangFlight.Tick(delta);
        if(!ashfangFlight.Active)
        {
            if(!completed||ashfangBehavior.Committed)return false;
            var margin=active.Radius+24;
            var landing=new Vector2D(Math.Clamp(player.Position.X,margin,Math.Max(margin,arenaWidth-margin)),Math.Clamp(player.Position.Y-150,margin,Math.Max(margin,arenaHeight-margin)));
            if(arenaEnvironment is not null)landing=arenaEnvironment.RestrictMovement(active.Position,landing,arenaWidth,arenaHeight,active.Radius);
            ashfangFlight.Begin(active.Position,landing);ashfangBehavior.Interrupt();active.TelegraphRemaining=0;dragonHuntHazards.Clear();ashfangRainRemaining=.25;
            return true;
        }
        if(completed)
        {
            if(ashfangFlight.Stage=="overhead")
            {
                var margin=active.Radius+24;
                var landing=new Vector2D(Math.Clamp(player.Position.X,margin,Math.Max(margin,arenaWidth-margin)),Math.Clamp(player.Position.Y,margin,Math.Max(margin,arenaHeight-margin)));
                if(arenaEnvironment is not null)landing=arenaEnvironment.RestrictMovement(ashfangFlight.Origin,landing,arenaWidth,arenaHeight,active.Radius);
                ashfangFlight.LockLanding(landing);
            }
            ashfangFlight.Advance(active.Phase);
            if(ashfangFlight.Stage=="land")
            {
                active.Position=ashfangFlight.Landing;
                var damage=dragonHuntState.Profile!.Pressure.Damage.For(active.Phase)*depthState.DragonDamageMultiplier;
                dragonHuntHazards.Add(new DragonHuntHazardState(active.Position,active.Radius*1.65,damage,.95,0,SpellId.FireBolt,active.Definition.School,null,false,"landing"));
            }
            if(!ashfangFlight.Active){active.AttackCooldown=.8;return true;}
        }
        if(ashfangFlight.Stage=="overhead")
        {
            var progress=ashfangFlight.Progress;
            active.Position=ashfangFlight.Origin+(ashfangFlight.Landing-ashfangFlight.Origin)*progress
                +new Vector2D(Math.Sin(progress*Math.PI*2)*arenaWidth*.55,Math.Sin(progress*Math.PI)*90);
            ashfangRainRemaining-=delta;
            if(ashfangRainRemaining<=0)
            {
                ashfangRainRemaining=active.Phase==2?.65:.85;
                // Capture the hunter's current spot, never track after warning.
                // The paired scatter strike leaves most of the arena open.
                var pressure=dragonHuntState.Profile!.Pressure;
                var radius=Math.Min(52,pressure.Radius.For(active.Phase)*.55);
                dragonHuntHazards.Add(new DragonHuntHazardState(player.Position,radius,pressure.Damage.For(active.Phase)*depthState.DragonDamageMultiplier,1.05,0,SpellId.FireBolt,active.Definition.School,null,true));
                var scatter=RandomArenaPosition(arenaWidth,arenaHeight,radius);
                dragonHuntHazards.Add(new DragonHuntHazardState(scatter,radius,pressure.Damage.For(active.Phase)*depthState.DragonDamageMultiplier,1.15,0,SpellId.FireBolt,active.Definition.School,null,true));
            }
        }
        return true;
    }
}
