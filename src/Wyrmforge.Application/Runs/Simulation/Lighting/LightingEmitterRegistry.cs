namespace Wyrmforge.Application.Runs.Simulation.Lighting;

public sealed class LightingEmitterRegistry
{
    private readonly Dictionary<string, LightingEmitter> emitters = new(StringComparer.Ordinal);

    public void Upsert(LightingEmitter emitter) => emitters[emitter.Id] = emitter;

    public bool Remove(string id) => emitters.Remove(id);

    public LightingSnapshot Capture(string sceneId, long tick, LightingEnvironment environment)
    {
        var active = emitters.Values.Where(e => !e.ExpiresAtTick.HasValue || e.ExpiresAtTick.Value > tick);
        return LightingSceneComposer.Compose(sceneId, tick, environment, active);
    }

    public void Clear() => emitters.Clear();
}
