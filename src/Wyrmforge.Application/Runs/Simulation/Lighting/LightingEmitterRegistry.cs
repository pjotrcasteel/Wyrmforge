namespace Wyrmforge.Application.Runs.Simulation.Lighting;

public sealed class LightingEmitterRegistry
{
    private readonly Dictionary<string, LightingEmitter> emitters = new(StringComparer.Ordinal);

    public void Upsert(LightingEmitter emitter)
    {
        ArgumentNullException.ThrowIfNull(emitter);
        if (string.IsNullOrWhiteSpace(emitter.Id)) throw new ArgumentException("Emitter ID is required.", nameof(emitter));
        emitters[emitter.Id] = emitter;
    }

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

    public void ReplaceOwner(string ownerId, IEnumerable<LightingEmitter> replacement)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(ownerId);
        ArgumentNullException.ThrowIfNull(replacement);
        var next = replacement.ToArray();
        if (next.Any(light => light.OwnerId != ownerId))
            throw new ArgumentException("Every replacement emitter must belong to the requested owner.", nameof(replacement));
        if (next.Any(light => string.IsNullOrWhiteSpace(light.Id)) ||
            next.Select(light => light.Id).Distinct(StringComparer.Ordinal).Count() != next.Length)
            throw new ArgumentException("Replacement emitter IDs must be unique and nonempty.", nameof(replacement));
        if (next.Any(light => emitters.TryGetValue(light.Id, out var existing) && existing.OwnerId != ownerId))
            throw new ArgumentException("Replacement emitter ID conflicts with another owner.", nameof(replacement));
        RemoveOwner(ownerId);
        foreach (var light in next) Upsert(light);
    }

    public void Clear() => emitters.Clear();
}
