using Wyrmforge.Domain;

namespace Wyrmforge.Domain.Progression.Legacy;

/// <summary>
/// Account-wide record of one-time grants (amendment §6). Story and first-discovery rewards are claimed here, so replaying a
/// Chronicle or reaching a milestone again never pays out twice, and an unlock never relocks.
/// </summary>
public sealed class OneTimeGrantLedger
{
    private readonly List<string> claimed = [];

    public IReadOnlyList<string> Claimed => claimed;

    public bool Has(string grant) => claimed.Contains(grant, StringComparer.Ordinal);

    /// <returns>True only the first time a grant is claimed.</returns>
    public bool TryClaim(string grant)
    {
        if (!KebabCase.IsValid(grant)) throw new ArgumentException("A grant id is lower-case kebab-case.", nameof(grant));
        if (Has(grant)) return false;
        claimed.Add(grant);
        return true;
    }

    public void Restore(IEnumerable<string>? saved)
    {
        claimed.Clear();
        foreach (var grant in saved ?? [])
            if (KebabCase.IsValid(grant) && !Has(grant)) claimed.Add(grant);
    }

    public string[] Save() => [.. claimed];
}

public static class LegacyGrants
{
    /// <summary>The account's first completion of a story book (handover §4: only the first one unlocks anything).</summary>
    public static string FirstCompletion(Chronicles.StoryId book) => $"first-completion-{book.Value}";

    /// <summary>Advanced Nexus research and the Conclave, earned by either path (amendment §6).</summary>
    public const string AdvancedAccess = "advanced-access";
}
