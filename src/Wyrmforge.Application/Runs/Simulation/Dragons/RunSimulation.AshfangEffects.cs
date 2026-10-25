using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;
namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly List<AshfangEffectState> ashfangEffects = [];
    private int ashfangEffectSequence;
    private void RegisterAshfangEffect(string kind, Vector2D position, double radius, Vector2D direction = default)
    {
        var duration=kind switch { "meteor" or "cinder" => 3.2, "landing" or "pounce" => 1.1, "roar" => 1.05, _ => .36 };
        ashfangEffects.Add(new(++ashfangEffectSequence,kind,position,direction,radius,duration));
        if(ashfangEffects.Count>48)ashfangEffects.RemoveAt(0);
    }
    private IReadOnlyList<AshfangEffectRenderSnapshot> CreateAshfangEffects() => ashfangEffects.Select(e=>new AshfangEffectRenderSnapshot(
        e.Id,e.Kind,e.Position.X,e.Position.Y,e.Direction.X,e.Direction.Y,e.Radius,1-Math.Clamp(e.Life/e.Duration,0,1))).ToArray();
    private sealed class AshfangEffectState(int id,string kind,Vector2D position,Vector2D direction,double radius,double duration)
    {
        public int Id { get; }=id;
        public string Kind { get; }=kind;
        public Vector2D Position { get; }=position;
        public Vector2D Direction { get; }=direction;
        public double Radius { get; }=radius;
        public double Duration { get; }=duration;
        public double Life { get; set; }=duration;
    }
}
