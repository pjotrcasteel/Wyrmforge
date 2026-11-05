using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Hunt 1.0 field ambush. The road opens into flat fields; the first time the hunter walks into the middle of one, the ground goes still,
/// marks appear on all sides at once and, about a second later, a ring of enemies (a Last Stand pack) bursts out of every mark together.
/// One per field, never in the first seconds of a Hunt, and never once the trail is cleared; it may land in the middle of a fight. The ring
/// uses the same recipe, budget and stats as any pack, so it adds no rules of its own: it is only where, when and how many.
/// </summary>
public sealed partial class RunSimulation
{
    /// <summary>The marks show for this long before the ring springs: enough to read "everything around me", not enough to run.</summary>
    public const double FieldAmbushTellSeconds = 1.15;
    /// <summary>The hunter must reach this fraction of a field's radius from its centre to spring it.</summary>
    public const double FieldAmbushTriggerFraction = .75;
    public const int FieldAmbushMinimumEnemies = 8;
    public const int FieldAmbushMaximumEnemies = 18;
    private const double FieldAmbushQuietSeconds = 5;
    private const double FieldAmbushRingNear = 170, FieldAmbushRingFar = 260;
    private const double FieldAmbushAftermathSeconds = 4;

    private sealed class FieldAmbushRuntime(IReadOnlyList<ArenaField> fields)
    {
        public IReadOnlyList<ArenaField> Fields { get; } = fields;
        public bool[] Sprung { get; } = new bool[fields.Count];
        public double TellRemaining { get; set; }
        public List<(Vector2D Position, EnemyKind Kind)> Marks { get; } = [];
        public bool Telling => Marks.Count > 0;
    }

    private FieldAmbushRuntime? fieldAmbush;

    /// <summary>How many field ambushes have sprung this Hunt (presentation and tests).</summary>
    public int FieldAmbushesSprung => fieldAmbush?.Sprung.Count(sprung => sprung) ?? 0;

    /// <summary>The marks of a running tell, with progress 0 to 1, or null.</summary>
    private FieldAmbushRenderSnapshot? CreateFieldAmbushSnapshot() => fieldAmbush is { Telling: true } ambush
        ? new FieldAmbushRenderSnapshot(1 - ambush.TellRemaining / FieldAmbushTellSeconds,
            ambush.Marks.Select(mark => new FieldAmbushMarkRenderSnapshot(mark.Position.X, mark.Position.Y, EnemyCatalog.Get(mark.Kind).Radius)).ToArray())
        : null;

    /// <summary>Returns true while a tell is running (every other spawn waits).</summary>
    private bool UpdateFieldAmbush(double delta, double width, double height)
    {
        if (!mapState.EncounterActive || arenaEnvironment?.AmbushFields is not { Count: > 0 } fields) return false;
        var ambush = fieldAmbush ??= new FieldAmbushRuntime(fields);
        if (ambush.Telling)
        {
            ambush.TellRemaining -= delta;
            if (ambush.TellRemaining > 0) return true;
            SpringFieldAmbush(ambush, width, height);
            return false;
        }

        if (encounterSeconds < FieldAmbushQuietSeconds || ReliquaryStage is ReliquaryStage.Hush or ReliquaryStage.Emerging or ReliquaryStage.Duel
            || mapState.CurrentNodeKills >= mapState.CurrentNodeKillsRequired || encounterHabitat is not { } habitat) return false;
        for (var index = 0; index < ambush.Fields.Count; index++)
        {
            if (ambush.Sprung[index]) continue;
            var field = ambush.Fields[index];
            var centre = ArenaTerrainGrid.CenterOf(field.Column, field.Row);
            if (Vector2D.Distance(player.Position, centre) > field.Radius * ArenaTerrainGrid.CellUnits * FieldAmbushTriggerFraction) continue;
            ambush.Sprung[index] = true;
            BeginFieldAmbush(ambush, habitat, width, height);
            return ambush.Telling;
        }
        return false;
    }

    private void BeginFieldAmbush(FieldAmbushRuntime ambush, WyrmrealmHabitat habitat, double width, double height)
    {
        // A Last Stand pack: every recognisable role at once, at a budget a little under the finale's.
        var plan = EnemyEncounterComposition.CreateRecipePlan(EnemyPackRecipeCatalog.LastStandFor(habitat), habitat, EnemyEncounterPattern.Mixed, randomSource,
            depthState.ThreatBudgetMultiplier * encounterModifiers.ThreatBudgetMultiplier * InfluenceBudget(habitat) * .9);
        var kinds = plan.Enemies.Take(FieldAmbushMaximumEnemies).ToArray();
        if (kinds.Length < FieldAmbushMinimumEnemies) return;
        // Evenly spaced bearings, each nudged, at two or three distances: a ring with no gap to slip through and no tidy circle to read.
        var step = Math.PI * 2 / kinds.Length;
        var start = randomSource.NextDouble() * Math.PI * 2;
        for (var index = 0; index < kinds.Length; index++)
        {
            var bearing = start + step * index + (randomSource.NextDouble() - .5) * step * .6;
            var reach = FieldAmbushRingNear + (FieldAmbushRingFar - FieldAmbushRingNear) * randomSource.NextDouble();
            var radius = EnemyCatalog.Get(kinds[index]).Radius;
            Vector2D? mark = null;
            // A blocked bearing steps in, then out, before it gives the mark up.
            foreach (var scale in new[] { 1, .85, 1.15, .7 })
            {
                var requested = player.Position + new Vector2D(Math.Cos(bearing), Math.Sin(bearing)) * reach * scale;
                mark = arenaEnvironment!.AdjustSpawnPosition(requested, player.Position, width, height, radius);
                if (mark is not null) break;
            }
            if (mark is { } found) ambush.Marks.Add((found, kinds[index]));
        }
        if (ambush.Marks.Count < FieldAmbushMinimumEnemies) { ambush.Marks.Clear(); return; }
        ambush.TellRemaining = FieldAmbushTellSeconds;
    }

    private void SpringFieldAmbush(FieldAmbushRuntime ambush, double width, double height)
    {
        foreach (var (position, kind) in ambush.Marks)
        {
            // The hunter may have moved onto a mark: re-validate against where they stand now, and skip a mark with no legal ground left.
            if (arenaEnvironment!.AdjustSpawnPosition(position, player.Position, width, height, EnemyCatalog.Get(kind).Radius) is not { } safe) continue;
            AddEnemyAt(kind, safe);
        }
        ambush.Marks.Clear();
        // The ordinary director waits for the ring to be fought before it adds more.
        spawnTimer = Math.Max(spawnTimer, FieldAmbushAftermathSeconds);
    }
}
