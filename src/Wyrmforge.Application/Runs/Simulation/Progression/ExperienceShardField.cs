using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class ExperienceShardField
{
    public const int MaxLooseShards = 180;
    public const double AttractionRadius = 145;
    public const double PickupRadius = 20;
    private const double AttractionSpeed = 280;
    private readonly List<ExperienceShardState> shards = [];

    public IReadOnlyList<ExperienceShardState> Shards => shards;
    public int TotalValue => shards.Sum(shard => shard.Value);

    public void Drop(Vector2D position, int value)
    {
        if (value <= 0) return;
        if (shards.Count < MaxLooseShards)
        {
            shards.Add(new ExperienceShardState(position, value));
            return;
        }

        var nearest = shards.MinBy(shard => Vector2D.Distance(shard.Position, position))
            ?? throw new InvalidOperationException("A full shard field must contain a merge target.");
        nearest.Absorb(position, value);
    }

    public int Update(double delta, Vector2D playerPosition)
    {
        if (delta <= 0 || shards.Count == 0) return CollectTouching(playerPosition);

        var collected = 0;
        for (var index = shards.Count - 1; index >= 0; index--)
        {
            var shard = shards[index];
            var distance = Vector2D.Distance(shard.Position, playerPosition);
            if (distance <= PickupRadius)
            {
                collected += shard.Value;
                shards.RemoveAt(index);
                continue;
            }
            if (distance > AttractionRadius) continue;

            var acceleration = 1 + (AttractionRadius - distance) / AttractionRadius * 1.8;
            var maximumTravel = AttractionSpeed * acceleration * delta;
            var pickupGap = distance - PickupRadius;
            if (maximumTravel >= pickupGap)
            {
                collected += shard.Value;
                shards.RemoveAt(index);
                continue;
            }

            var direction = Vector2D.DirectionTo(shard.Position, playerPosition);
            shard.Position += direction * maximumTravel;
        }
        return collected + CollectTouching(playerPosition);
    }

    public int CollectAll()
    {
        var value = TotalValue;
        shards.Clear();
        return value;
    }

    public void Clear() => shards.Clear();

    private int CollectTouching(Vector2D playerPosition)
    {
        var collected = 0;
        for (var index = shards.Count - 1; index >= 0; index--)
        {
            if (Vector2D.Distance(shards[index].Position, playerPosition) > PickupRadius) continue;
            collected += shards[index].Value;
            shards.RemoveAt(index);
        }
        return collected;
    }
}
