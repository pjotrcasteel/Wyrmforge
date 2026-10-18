using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

// Encountered Enemies book input: which kinds the hunter met this hunt and how many of each fell.
public sealed partial class RunSimulation
{
    private readonly Dictionary<EnemyKind, int> enemyRecords = [];

    private void RecordEnemyEncounter(EnemyKind kind) => enemyRecords.TryAdd(kind, 0);

    private void RecordEnemyKill(EnemyKind kind) => enemyRecords[kind] = enemyRecords.GetValueOrDefault(kind) + 1;

    private RunEnemyRecord[] CreateEnemyRecords() => enemyRecords
        .OrderBy(entry => entry.Key)
        .Select(entry => new RunEnemyRecord(entry.Key, entry.Value))
        .ToArray();
}
