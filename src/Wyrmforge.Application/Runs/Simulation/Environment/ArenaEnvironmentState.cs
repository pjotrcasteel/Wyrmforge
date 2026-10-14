using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class ArenaEnvironmentState
{
    private readonly int seed;
    private readonly string biome;
    private readonly int stage;
    private readonly string landmark;
    private ArenaSupplyRenderSnapshot? supply;

    private ArenaEnvironmentState(int seed, string biome, int stage, string landmark, ArenaSupplyRenderSnapshot? supply)
    {
        this.seed = seed;
        this.biome = biome;
        this.stage = stage;
        this.landmark = landmark;
        this.supply = supply;
    }

    public static ArenaEnvironmentState Create(int mapSeed, WyrmrealmMapNode node)
    {
        ArgumentNullException.ThrowIfNull(node);
        var stage = node.Stage;
        // Scene and supply randomness are isolated from combat, spell rolls and the map generator.
        var seed = unchecked(mapSeed * 486187739 + stage * 73856093 + node.Lane * 19349663);
        var random = new Random(seed);
        var biome = node.Territory?.Name ?? "River valley";
        var landmark = biome switch
        {
            "Ashen caldera" => stage >= 6 ? "The dragon's scorched approach" : "Abandoned ashfall outpost",
            "Broken ridge" => stage >= 6 ? "Collapsed guardian watch" : "Old pilgrim stones",
            _ => stage >= 6 ? "The ruined river crossing" : "Forgotten hunter's trail",
        };
        ArenaSupplyRenderSnapshot? supply = null;
        if (node.Type == WyrmrealmNodeType.Combat && stage is 1 or 3 or 5 or 7)
        {
            var kind = stage is 1 or 5 ? "experience" : "health";
            // Keep caches away from the initial spawn in the centre; reaching one takes a deliberate movement.
            var x = (random.Next(2) == 0 ? .22 : .78) + (random.NextDouble() - .5) * .08;
            var y = .24 + random.NextDouble() * .48;
            supply = new ArenaSupplyRenderSnapshot(kind, x, y);
        }
        return new ArenaEnvironmentState(seed, biome, stage, landmark, supply);
    }

    public ArenaEnvironmentRenderSnapshot Snapshot() => new(seed, biome, stage, landmark, supply);

    public ArenaSupplyRenderSnapshot? TryCollect(Vector2D playerPosition, double width, double height, double playerRadius, bool needsHealing)
    {
        if (supply is null || width <= 0 || height <= 0) return null;
        if (supply.Kind == "health" && !needsHealing) return null;
        var target = new Vector2D(supply.X * width, supply.Y * height);
        if (Vector2D.Distance(playerPosition, target) > playerRadius + 16) return null;
        var collected = supply;
        supply = null;
        return collected;
    }
}
