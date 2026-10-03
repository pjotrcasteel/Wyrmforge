using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed record DragonHuntRoute(DragonId First, DragonId Deep)
{
    public static DragonHuntRoute For(DragonId first) => first switch
    {
        DragonId.Ashfang => new(first, DragonId.Stormcoil),
        DragonId.Stormcoil => new(first, DragonId.Ashfang),
        _ => throw new ArgumentOutOfRangeException(nameof(first)),
    };
}
