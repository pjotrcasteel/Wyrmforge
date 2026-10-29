namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>
/// Combines authoritative sources without any dependency on a browser, GPU API, or asset type.
/// Full snapshots replace previous lights: sources omitted after despawn cannot linger.
/// </summary>
public static class LightingSceneComposer
{
    public static LightingSnapshot Compose(
        string sceneId,
        long simulationTick,
        LightingEnvironment environment,
        params IEnumerable<LightingEmitter>[] sources)
    {
        var emitters = sources.SelectMany(source => source)
            .OrderBy(emitter => emitter.Id, StringComparer.Ordinal)
            .ToArray();
        var snapshot = new LightingSnapshot(
            LightingSnapshot.CurrentSchemaVersion, simulationTick, sceneId, environment, emitters);
        snapshot.Validate();
        return snapshot;
    }
}
