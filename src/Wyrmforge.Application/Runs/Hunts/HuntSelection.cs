using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.World;
using System.Text.Json.Serialization;

namespace Wyrmforge.Application.Runs.Hunts;

public sealed record HuntSelection([property: JsonIgnore] RegionId Region, WyrmTier Tier, int Version = 1)
{
    public const int CurrentVersion = 1;
    public static HuntSelection FireTierOne { get; } = new(RegionCatalog.CinderFrontierId, WyrmTier.Wyrm);
    public static HuntSelection FireTierTwo { get; } = new(RegionCatalog.CinderFrontierId, WyrmTier.Ascendant);
    public static HuntSelection FireTierThree { get; } = new(RegionCatalog.CinderFrontierId, WyrmTier.Elder);
    public string RegionKey => Region.Value;
    [JsonIgnore]
    public DragonId Target => RegionCatalog.Get(Region).HomeLineage;
    [JsonIgnore]
    public int TierNumber => HuntLadder.Number(Tier);
    /// <summary>From Tier II an optional, harder refuge can be reclaimed; a fall after that returns the hunter there.</summary>
    [JsonIgnore]
    public bool HasRefuge => Tier >= WyrmTier.Ascendant;
    /// <summary>From Tier III an optional watchtower detour confirms what waits on the next fork: earned scouting, never a free reveal.</summary>
    [JsonIgnore]
    public bool HasWatchtower => Tier >= WyrmTier.Elder;

    [JsonConstructor]
    public HuntSelection(string regionKey, WyrmTier tier, int version = CurrentVersion)
        : this(new RegionId(regionKey), tier, version) { }

    public void Validate()
    {
        if (Version != CurrentVersion || !HuntLadder.IsAuthored(Region, Tier))
            throw new ArgumentException("Only the Fire Tier I–III Hunts are authored for tiered progression.");
    }
}
