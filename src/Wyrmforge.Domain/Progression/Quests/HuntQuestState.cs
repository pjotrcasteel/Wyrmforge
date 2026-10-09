using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Quests;

public sealed record HuntQuestEvidence(int Trails, int RareTrails, int Depth, bool Abandoned,
    IReadOnlyList<DragonId> Wyrms, IReadOnlyList<DragonEssenceId> Essences, bool Synergy, bool Evolution);

public sealed record HuntQuestSave(int Trails, int RareTrails, int Depth, DragonId[] Wyrms, DragonEssenceId[] Essences,
    bool Synergy, bool Evolution, string[] Claimed, int Caches);

public sealed class HuntQuestState
{
    private readonly HashSet<string> claimed = [];
    private readonly HashSet<DragonId> wyrms = [];
    private readonly HashSet<DragonEssenceId> essences = [];
    private int trails;
    private int rareTrails;
    private int depth = 1;
    private bool synergy;
    private bool evolution;

    public int Caches { get; private set; }
    public int ReadyCount => HuntQuestCatalog.All.Count(CanClaim);
    public bool IsClaimed(string id) => claimed.Contains(id);
    public bool CanClaim(HuntQuest quest) => !IsClaimed(quest.Id) && Progress(quest) >= quest.Required;
    public int Progress(HuntQuest quest) => Math.Min(quest.Required, quest.Metric switch
    {
        HuntQuestMetric.Trails => trails,
        HuntQuestMetric.RareTrails => rareTrails,
        HuntQuestMetric.Wyrms => wyrms.Count,
        HuntQuestMetric.SecuredEssences => essences.Count,
        HuntQuestMetric.Depth => depth,
        HuntQuestMetric.Synergies => synergy ? 1 : 0,
        HuntQuestMetric.Evolutions => evolution ? 1 : 0,
        _ => 0,
    });

    public void Record(HuntQuestEvidence run)
    {
        if (run.Abandoned) return;
        trails = Math.Min(48, trails + Math.Max(0, run.Trails));
        rareTrails = Math.Min(12, rareTrails + Math.Clamp(run.RareTrails, 0, Math.Max(0, run.Trails)));
        depth = Math.Max(depth, Math.Clamp(run.Depth, 1, 3));
        wyrms.UnionWith(run.Wyrms.Where(id => Enum.IsDefined(id)));
        essences.UnionWith(run.Essences.Where(id => Enum.IsDefined(id)));
        synergy |= run.Synergy;
        evolution |= run.Evolution;
    }

    public HuntQuest? Claim(string id)
    {
        var quest = HuntQuestCatalog.All.SingleOrDefault(quest => quest.Id == id);
        if (quest is null || !CanClaim(quest) || !claimed.Add(id)) return null;
        Caches += quest.Caches;
        return quest;
    }

    public void GrantCaches(int count) => Caches += Math.Max(0, count);

    public bool ConsumeCache()
    {
        if (Caches <= 0) return false;
        Caches--;
        return true;
    }

    public HuntQuestSave Snapshot() => new(trails, rareTrails, depth, wyrms.Order().ToArray(), essences.Order().ToArray(),
        synergy, evolution, claimed.Order().ToArray(), Caches);

    public void Restore(HuntQuestSave? save, int levelCaches = 0)
    {
        if (save is null) return;
        trails = Math.Clamp(save.Trails, 0, 48);
        rareTrails = Math.Clamp(save.RareTrails, 0, Math.Min(12, trails));
        depth = Math.Clamp(save.Depth, 1, 3);
        wyrms.Clear();
        wyrms.UnionWith((save.Wyrms ?? []).Where(id => Enum.IsDefined(id)));
        essences.Clear();
        essences.UnionWith((save.Essences ?? []).Where(id => Enum.IsDefined(id)));
        synergy = save.Synergy;
        evolution = save.Evolution;
        claimed.Clear();
        claimed.UnionWith((save.Claimed ?? []).Where(id => HuntQuestCatalog.All.Any(quest => quest.Id == id)));
        Caches = Math.Clamp(save.Caches, 0, claimed.Sum(id => HuntQuestCatalog.Get(id).Caches) + Math.Max(0, levelCaches));
    }
}
