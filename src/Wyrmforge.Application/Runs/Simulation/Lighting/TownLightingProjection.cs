namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>Authoritative Town state supplied by gameplay; never inferred from baked artwork.</summary>
public sealed record TownLightFixtureState(
    string Id,
    string OwnerId,
    double X,
    double Y,
    double Z,
    bool Active,
    LightSourceProfile Profile);

/// <summary>Declarative Town fixtures share the same lighting snapshot and GPU adapter as Hunts.</summary>
public static class TownLightingProjection
{
    public static LightingSnapshot Capture(
        string sceneId,
        long simulationTick,
        IEnumerable<TownLightFixtureState> fixtures,
        LightingEnvironment environment)
    {
        var lights = fixtures.Where(fixture => fixture.Active)
            .Select(fixture => new LightingEmitter(
                fixture.Id, fixture.OwnerId, fixture.Profile.Type,
                fixture.X, fixture.Y, fixture.Z,
                fixture.Profile.Color, fixture.Profile.Intensity,
                fixture.Profile.Radius, CastsShadows: fixture.Profile.CastsShadows))
            .OrderBy(light => light.Id, StringComparer.Ordinal)
            .ToArray();
        var snapshot = new LightingSnapshot(
            LightingSnapshot.CurrentSchemaVersion, simulationTick, sceneId, environment, lights);
        snapshot.Validate();
        return snapshot;
    }
}
