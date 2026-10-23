using Wyrmforge.Domain.Combat.Geometry;
namespace Wyrmforge.Domain.Combat.Dragons;

/// <summary>Bounded, deterministic aerial commitment. Ground attacks cannot run concurrently.</summary>
public sealed class AshfangFlightState
{
    public string Stage { get; private set; } = "ground";
    public double Remaining { get; private set; } = 8;
    public double Duration { get; private set; } = 1;
    public double Progress => 1-Math.Clamp(Remaining/Duration,0,1);
    public bool Active => Stage != "ground";
    public bool Targetable => Stage == "ground" || Stage == "recover" || Stage == "takeoff" && Progress < .65 || Stage == "land" && Progress > .65;
    public Vector2D Origin { get; private set; }
    public Vector2D Landing { get; private set; }
    public bool Tick(double delta)
    {
        if(delta<=0)return false;
        Remaining=Math.Max(0,Remaining-delta);return Remaining<=0;
    }
    public void Begin(Vector2D origin,Vector2D landing){Origin=origin;Landing=landing;Enter("takeoff",1.4);}
    public void Advance(int phase)
    {
        switch(Stage){case "takeoff":Enter("overhead",phase==2?6:4.8);break;case "overhead":Enter("land",1.4);break;case "land":Enter("recover",1.2);break;default:Stage="ground";Remaining=phase==2?10:14;break;}
    }
    public void Reset(){Stage="ground";Remaining=8;Duration=1;}
    private void Enter(string stage,double duration){Stage=stage;Duration=duration;Remaining=duration;}
}
