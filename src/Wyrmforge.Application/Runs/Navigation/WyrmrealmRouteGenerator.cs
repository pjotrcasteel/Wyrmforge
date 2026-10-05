using Wyrmforge.Application.Runs.Depth;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Navigation;

internal static class WyrmrealmRouteGenerator
{
    private static readonly WyrmrealmRelicRewardProfile RelicCache = new();
    private static readonly IReadOnlyDictionary<SpellSchool, string[]> CommonNames = new Dictionary<SpellSchool, string[]>
    {
        [SpellSchool.Fire] = ["Scorched Hollow", "Ember Confluence", "Ashen Fall", "Cinder Reach", "Furnace Walk"],
        [SpellSchool.Frost] = ["Frozen Vein", "Winter Wyrmroad", "Frostbound Vault", "Rime Descent", "Glacial Steps"],
        [SpellSchool.Storm] = ["Static Crossing", "Thunder Maw", "Stormglass Rift", "Tempest Spine", "Charged Causeway"],
        [SpellSchool.Arcane] = ["Arcane Causeway", "Arcane Scar", "Aether Break", "Void Conduit", "Astral Fold"],
    };
    private static readonly IReadOnlyDictionary<SpellSchool, string> RareNames = new Dictionary<SpellSchool, string>
    {
        [SpellSchool.Fire] = "Dragonbone Pyre",
        [SpellSchool.Frost] = "Hoarfrost Reliquary",
        [SpellSchool.Storm] = "Tempest Reliquary",
        [SpellSchool.Arcane] = "Aether Vault",
    };

    public static IReadOnlyList<WyrmrealmMapNode> CreateNodes(int depth, IReadOnlyList<WyrmrealmNodeLayout> layouts, Random random)
    {
        var difficulty = RunDifficultyCatalog.Get(depth);
        var nodes = new List<WyrmrealmMapNode>(layouts.Count);
        foreach (var stage in layouts.GroupBy(layout => layout.Stage).OrderBy(group => group.Key))
        {
            if (stage.Key > WyrmrealmMapState.CombatStages)
            {
                var dragon = stage.Single();
                nodes.Add(new WyrmrealmMapNode(dragon.Id, "Unknown Wyrm", new WyrmrealmNodePosition(dragon.Stage, dragon.Lane), WyrmrealmNodeType.Dragon, null,
                    new WyrmrealmNodeGraph(dragon.PreviousNodeIds)));
                continue;
            }

            var schools = ShuffleSchools(random);
            foreach (var pair in stage.OrderBy(layout => layout.Lane).Select((layout, index) => (layout, school: schools[index])))
            {
                nodes.Add(CreateCombatNode(difficulty, pair.layout, pair.school, random));
            }
        }
        return nodes;
    }

    private static WyrmrealmMapNode CreateCombatNode(RunDifficultyProfile difficulty, WyrmrealmNodeLayout layout, SpellSchool school, Random random)
    {
        var rare = layout.Rarity == WyrmrealmNodeRarity.Rare;
        var encounter = (WyrmrealmEncounterKind)random.Next(0, 3);
        var stagePressure = Math.Max(0, layout.Stage - 1) * 0.035;
        var spawnInterval = Math.Clamp(1.02 - random.NextDouble() * 0.18 - (rare ? 0.1 : 0), 0.64, 1.02);
        var enemyHealth = 1 + difficulty.RouteEnemyHealthBonus + stagePressure + random.NextDouble() * 0.11 + (rare ? 0.18 : 0);
        var enemySpeed = 1 + difficulty.RouteEnemySpeedBonus + random.NextDouble() * 0.1 + (rare ? 0.12 : 0);
        var score = 60 + difficulty.Depth * 70 + layout.Stage * 55 + random.Next(20, 111);
        if (rare) score *= 2;
        var recovery = rare ? 0.12 : random.NextDouble() < 0.28 ? 0.05 + random.Next(0, 5) / 100d : 0;
        var relic = rare || random.NextDouble() < 0.16 ? RelicCache : null;
        var modifiers = CreateModifiers(difficulty, layout.Stage, rare, random);
        var route = new WyrmrealmRouteProfile(
            new WyrmrealmEncounterProfile(encounter, spawnInterval, enemyHealth, enemySpeed),
            new WyrmrealmRewardProfile(school, score, recovery, relic),
            modifiers);
        var name = rare ? RareNames[school] : CommonNames[school][random.Next(CommonNames[school].Length)];
        return new WyrmrealmMapNode(layout.Id, name, new WyrmrealmNodePosition(layout.Stage, layout.Lane), WyrmrealmNodeType.Combat, route,
            new WyrmrealmNodeGraph(layout.PreviousNodeIds, layout.Rarity));
    }

    private static IReadOnlyList<WyrmrealmEncounterModifier> CreateModifiers(RunDifficultyProfile difficulty, int stage, bool rare, Random random)
    {
        var chance = rare ? 1 : Math.Clamp(difficulty.BaseHazardChance + stage * 0.04, 0, 0.72);
        if (random.NextDouble() >= chance) return [];
        var interval = rare ? 0.62 + random.NextDouble() * 0.16 : 0.75 + random.NextDouble() * 0.42;
        return [new WyrmrealmEncounterModifier(WyrmrealmEncounterModifierIds.UnstableRifts, HazardKind: WyrmrealmHazardKind.UnstableRifts,
            HazardIntervalMultiplier: interval)];
    }

    private static SpellSchool[] ShuffleSchools(Random random)
    {
        var schools = Enum.GetValues<SpellSchool>();
        for (var index = schools.Length - 1; index > 0; index--)
        {
            var target = random.Next(index + 1);
            (schools[index], schools[target]) = (schools[target], schools[index]);
        }
        return schools;
    }
}
