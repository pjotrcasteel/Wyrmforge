using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class ArenaEnvironmentState
{
    private const double GateRadius = 32;
    private readonly List<Supply> supplies = [];
    private readonly int seed;
    private readonly string biome;
    private readonly int stage;
    private readonly string landmark;
    private EncounterPhase phase = EncounterPhase.Pressure;

    private sealed class Supply(string kind, double x, double y, EncounterPhase unlockPhase)
    {
        public string Kind { get; } = kind;
        public double X { get; } = x;
        public double Y { get; } = y;
        public EncounterPhase UnlockPhase { get; } = unlockPhase;
        public bool Collected { get; set; }
    }

    private ArenaEnvironmentState(int seed, string biome, int stage, string landmark)
    {
        this.seed = seed;
        this.biome = biome;
        this.stage = stage;
        this.landmark = landmark;
    }

    public static ArenaEnvironmentState Create(int mapSeed, WyrmrealmMapNode node)
    {
        ArgumentNullException.ThrowIfNull(node);
        var stage = node.Stage;
        // Independent seed: scenery and supplies must not consume any combat or reward RNG calls.
        var seed = unchecked(mapSeed * 486187739 + stage * 73856093 + node.Lane * 19349663);
        var random = new Random(seed);
        var biome = node.Territory?.Name ?? "River valley";
        var landmark = biome switch
        {
            "Ashen caldera" => stage >= 6 ? "The dragon's scorched approach" : "Abandoned ashfall outpost",
            "Broken ridge" => stage >= 6 ? "Collapsed guardian watch" : "Old pilgrim stones",
            _ => stage >= 6 ? "The ruined river crossing" : "Forgotten hunter's trail",
        };
        var environment = new ArenaEnvironmentState(seed, biome, stage, landmark);
        if (node.Type != WyrmrealmNodeType.Combat) return environment;

        // The left cache alcove opens after the first two combat phases; the right opens after the third wave.
        // Neither cache is part of the mandatory critical path. Both can be ignored without trapping a hunter.
        environment.supplies.Add(new Supply("experience", 0.17, 0.31 + random.NextDouble() * 0.12, EncounterPhase.BreathingRoom));
        environment.supplies.Add(new Supply("health", 0.83, 0.57 + random.NextDouble() * 0.12, EncounterPhase.Surge));
        return environment;
    }

    public void SetPhase(EncounterPhase current) => phase = current;

    public ArenaEnvironmentRenderSnapshot Snapshot() => new(seed, biome, stage, landmark,
        supplies.Where(supply => !supply.Collected)
            .Select(supply => new ArenaSupplyRenderSnapshot(supply.Kind, supply.X, supply.Y, IsOpen(supply)))
            .ToArray());

    public Vector2D RestrictMovement(Vector2D previous, Vector2D proposed, double width, double height)
    {
        // Solid sealed cache circles remain navigable obstacles; the main combat floor never closes.
        foreach (var supply in supplies.Where(supply => !supply.Collected && !IsOpen(supply)))
        {
            var center = new Vector2D(supply.X * width, supply.Y * height);
            if (Vector2D.Distance(proposed, center) < GateRadius && Vector2D.Distance(previous, center) >= GateRadius) return previous;
        }
        return proposed;
    }

    public ArenaSupplyRenderSnapshot? TryCollect(Vector2D position, double width, double height, double playerRadius, bool needsHealing)
    {
        foreach (var supply in supplies)
        {
            if (supply.Collected || !IsOpen(supply) || (supply.Kind == "health" && !needsHealing)) continue;
            var center = new Vector2D(supply.X * width, supply.Y * height);
            if (Vector2D.Distance(position, center) > playerRadius + 16) continue;
            supply.Collected = true;
            return new ArenaSupplyRenderSnapshot(supply.Kind, supply.X, supply.Y, true);
        }
        return null;
    }

    private bool IsOpen(Supply supply) => phase >= supply.UnlockPhase;
}
