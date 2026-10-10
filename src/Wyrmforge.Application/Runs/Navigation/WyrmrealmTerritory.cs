namespace Wyrmforge.Application.Runs.Navigation;

public sealed record HuntPoint(double X, double Y);
public sealed record HuntFeature(string Kind, HuntPoint Center, double RadiusX, double RadiusY);
public sealed record HuntRoad(string Id, string Name, string Length, int Encounters, IReadOnlyList<HuntPoint> Points, bool BonusRelic);
public sealed record HuntSite(HuntPoint Point, string? RoadId, int RoadIndex, bool BonusRelic, IReadOnlyList<HuntPoint> IncomingTrail);
public sealed record WyrmrealmTerritory(int Seed, string Name, HuntPoint Camp, IReadOnlyList<HuntPoint> River,
    IReadOnlyList<HuntRoad> Roads, IReadOnlyList<HuntFeature> Features);
