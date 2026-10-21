using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.World;

namespace Wyrmforge.Application.Runs.Hunts;

public sealed record HuntSelection(RegionId Region, WyrmTier Tier, int Version = 1)
{
    public const int CurrentVersion = 1;
    public static HuntSelection FireTierOne { get; } = new(RegionCatalog.CinderFrontierId, WyrmTier.Wyrm);
    public DragonId Target => RegionCatalog.Get(Region).HomeLineage;

    public void Validate()
    {
        if (Version != CurrentVersion || Region != RegionCatalog.CinderFrontierId || Tier != WyrmTier.Wyrm)
            throw new ArgumentException("Only the current Fire Tier-I Hunt is authored for tiered progression.");
    }
}
