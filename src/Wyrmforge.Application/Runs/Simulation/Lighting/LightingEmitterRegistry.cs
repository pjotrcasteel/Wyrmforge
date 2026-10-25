namespace Wyrmforge.Application.Runs.Simulation.Lighting;

public sealed class LightingEmitterRegistry
{
    private readonly Dictionary<string, LightingEmitter> emitters = new(StringComparer.Ordinal);

    public void Upsert(LightingEmitter emitter) => emitters[emitter.Id] = emitter;

    public bool Remove(string id) => emitters.Remove(id);

    public int RemoveOwner(string ownerId)
    {
        var ids = emitters.Values.Where(emitter => emitter.OwnerId == ownerId)
            .Select(emitter => emitter.Id).ToArray();
        foreach (var id in ids) emitters.Remove(id);
        return ids.Length;
    }

    public LightingSnapshot Capture(string sceneId, long tick, LightingEnvironment environment)
    {
        foreach (var id in emitters.Values.Where(e => e.ExpiresAtTick.HasValue && e.ExpiresAtTick.Value <= tick)
                     .Select(e => e.Id).ToArray()) emitters.Remove(id);
        var active = emitters.Values;
        return LightingSceneComposer.Compose(sceneId, tick, environment, active);
    }

    public void Clear() => emitters.Clear();
}
