namespace Wyrmforge.Domain.Progression.Quests;

public enum HuntQuestMetric { Trails, RareTrails, Wyrms, SecuredEssences, Depth, Synergies, Evolutions }

public sealed record HuntQuest(string Id, string Name, string Objective, HuntQuestMetric Metric, int Required, int Experience, int Caches = 0)
{
    public string Reward => $"{Experience} Hunter XP" + (Caches > 0 ? " + relic cache" : string.Empty);
}

public static class HuntQuestCatalog
{
    public static IReadOnlyList<HuntQuest> All { get; } =
    [
        new("trail-1", "First path", "Clear 1 trail", HuntQuestMetric.Trails, 1, 30),
        new("trail-4", "A path to the Wyrm", "Clear 4 trails", HuntQuestMetric.Trails, 4, 30, 1),
        new("trail-12", "Realm walker", "Clear 12 trails", HuntQuestMetric.Trails, 12, 60),
        new("trail-24", "Trailbreaker", "Clear 24 trails", HuntQuestMetric.Trails, 24, 60),
        new("trail-48", "The long hunt", "Clear 48 trails", HuntQuestMetric.Trails, 48, 60),
        new("rare-1", "Take the risk", "Clear 1 rare trail", HuntQuestMetric.RareTrails, 1, 30),
        new("rare-5", "Reliquary hunter", "Clear 5 rare trails", HuntQuestMetric.RareTrails, 5, 30, 1),
        new("rare-12", "Against the odds", "Clear 12 rare trails", HuntQuestMetric.RareTrails, 12, 60),
        new("wyrm-1", "Wyrmslayer", "Defeat your first Wyrm", HuntQuestMetric.Wyrms, 1, 30, 1),
        new("wyrm-4", "Know your prey", "Defeat all 4 Wyrms", HuntQuestMetric.Wyrms, 4, 60),
        new("essence-1", "Bring it home", "Secure 1 type of Essence", HuntQuestMetric.SecuredEssences, 1, 30),
        new("essence-4", "Essence hunter", "Secure 4 types of Essence", HuntQuestMetric.SecuredEssences, 4, 60),
        new("depth-2", "Beyond Refuge", "Reach Depth II", HuntQuestMetric.Depth, 2, 30),
        new("depth-3", "Into the deep", "Reach Depth III", HuntQuestMetric.Depth, 3, 30),
        new("synergy-1", "Two become one", "Bind a synergy", HuntQuestMetric.Synergies, 1, 30),
        new("evolution-1", "A new form", "Evolve a spell", HuntQuestMetric.Evolutions, 1, 30),
    ];

    public static HuntQuest Get(string id) => All.Single(quest => quest.Id == id);
}
