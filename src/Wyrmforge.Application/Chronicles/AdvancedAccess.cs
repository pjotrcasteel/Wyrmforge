using Wyrmforge.Domain.Chronicles;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.Legacy;

namespace Wyrmforge.Application.Chronicles;

public enum AdvancementRoute { None, Campaign, Exploration }

/// <summary>Account facts only; a story choice never counts.</summary>
public sealed record AdvancementFacts(bool BookOneCompleted, int HunterLevel, IReadOnlySet<DragonId> WyrmsSlain, IReadOnlySet<DragonId> AscendantsDefeated);

public sealed record AdvancementProgress(AdvancementRoute Route, int HunterLevel, int LineagesSlain, int AscendantsDefeated)
{
    public bool Unlocked => Route != AdvancementRoute.None;
}

/// <summary>
/// The two equal roads to advanced Nexus research and the Conclave (amendment §6, superseding "Book I completion only"):
/// finish Book I, or prove the same mastery in the world. The exploration thresholds are a proposal (§14): slay the Wyrm of
/// every lineage, defeat one Ascendant and reach half the Hunter track, roughly the climb Book I's monumental Wyrm asks of a
/// campaign player. Skipping the campaign never skips that climb.
/// </summary>
public static class AdvancedAccess
{
    public const int ExplorationHunterLevel = 12;
    public const int ExplorationAscendants = 1;
    public static int Lineages => WyrmLineageCatalog.All.Count;

    public static AdvancementProgress Evaluate(AdvancementFacts facts)
    {
        ArgumentNullException.ThrowIfNull(facts);
        var lineages = WyrmLineageCatalog.All.Count(lineage => facts.WyrmsSlain.Contains(lineage.Wyrm));
        var route = facts.BookOneCompleted ? AdvancementRoute.Campaign
            : lineages >= Lineages && facts.AscendantsDefeated.Count >= ExplorationAscendants && facts.HunterLevel >= ExplorationHunterLevel ? AdvancementRoute.Exploration
            : AdvancementRoute.None;
        return new(route, facts.HunterLevel, lineages, facts.AscendantsDefeated.Count);
    }

    /// <summary>Claims the permanent unlock the first time either road is completed. Once claimed it never relocks.</summary>
    /// <returns>True only on the call that first unlocks access.</returns>
    public static bool TryUnlock(OneTimeGrantLedger ledger, AdvancementFacts facts)
    {
        ArgumentNullException.ThrowIfNull(ledger);
        return Evaluate(facts).Unlocked && ledger.TryClaim(LegacyGrants.AdvancedAccess);
    }

    public static bool IsUnlocked(OneTimeGrantLedger ledger) => (ledger ?? throw new ArgumentNullException(nameof(ledger))).Has(LegacyGrants.AdvancedAccess);

    public static bool BookOneCompleted(OneTimeGrantLedger ledger) => ledger.Has(LegacyGrants.FirstCompletion(StoryBookCatalog.BrokenCovenant.Id));
}
