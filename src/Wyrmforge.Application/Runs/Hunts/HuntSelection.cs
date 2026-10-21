using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.World;
using System.Text.Json.Serialization;

namespace Wyrmforge.Application.Runs.Hunts;

public sealed record HuntSelection([property: JsonIgnore] RegionId Region, WyrmTier Tier, int Version = 1)
{
    public const int CurrentVersion = 1;
    public static HuntSelection FireTierOne { get; } = new(RegionCatalog.CinderFrontierId, WyrmTier.Wyrm);
    public string RegionKey => Region.Value;
    [JsonIgnore]
    public DragonId Target => RegionCatalog.Get(Region).HomeLineage;

    [JsonConstructor]
    public HuntSelection(string regionKey, WyrmTier tier, int version = CurrentVersion)
        : this(new RegionId(regionKey), tier, version) { }

    public void Validate()
    {
        if (Version != CurrentVersion || Region != RegionCatalog.CinderFrontierId || Tier != WyrmTier.Wyrm)
            throw new ArgumentException("Only the current Fire Tier-I Hunt is authored for tiered progression.");
    }
}
