namespace Wyrmforge.Application.Persistence;

/// <summary>
/// Which kind of state a save belongs to (amendment §11.5). Keeping them apart means a Chronicle replay, a world reset or an
/// endgame season can be handled without touching the hunter's earned power.
/// </summary>
public enum SaveDomain
{
    /// <summary>First-hunt teaching progress.</summary>
    Onboarding,
    /// <summary>Account power and knowledge the hunter keeps on every path: build, codex, essences, Forge, Nexus, loadouts, bestiary.</summary>
    PlayerLegacy,
    /// <summary>Regions discovered and their world facts.</summary>
    World,
    /// <summary>Independent story histories: book, chapter and choices. Never power; one-time rewards live in the PlayerLegacy grant ledger.</summary>
    Chronicle,
    /// <summary>Great Hunt, scores and hall of fame.</summary>
    Endgame,
    Preferences,
    Telemetry,
}

/// <summary>The single map from every browser storage key to its state domain. A new key must be classified here.</summary>
public static class SaveLayout
{
    public const string World = "wyrmforge.world.v1";
    public const string Chronicles = "wyrmforge.chronicles.v1";
    public const string LegacyGrants = "wyrmforge.legacyGrants.v1";

    public static IReadOnlyDictionary<string, SaveDomain> Keys { get; } = new Dictionary<string, SaveDomain>(StringComparer.Ordinal)
    {
        ["wyrmforge.firstHunt.v1"] = SaveDomain.Onboarding,
        ["wyrmforge.arcaneBuild.v1"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.characterSchool.v1"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.arcaneCodex"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.essenceVault"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.essenceGrades.v1"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.huntMaterials.v1"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.forgeProgression"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.forgeMastery"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.spellMastery.v1"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.laboratory.v1"] = SaveDomain.PlayerLegacy,
            ["wyrmforge.fireballCore.v1"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.loadouts.v1"] = SaveDomain.PlayerLegacy,
        ["wyrmforge.bestiary.v1"] = SaveDomain.PlayerLegacy,
        [LegacyGrants] = SaveDomain.PlayerLegacy,
        [World] = SaveDomain.World,
        [Chronicles] = SaveDomain.Chronicle,
        ["wyrmforge.greatHunt.v1"] = SaveDomain.Endgame,
        ["wyrmforge.bestScore"] = SaveDomain.Endgame,
        ["wyrmforge.hall-of-fame.local.v1"] = SaveDomain.Endgame,
        ["wyrmforge.hall-of-fame.pending.v1"] = SaveDomain.Endgame,
        ["wyrmforge.preferredPrimary.v1"] = SaveDomain.Preferences,
        ["wyrmforge.townLighting.v1"] = SaveDomain.Preferences,
        ["wyrmforge.reviewPrompt.v1"] = SaveDomain.Preferences,
        ["wyrmforge.audio.enabled.v1"] = SaveDomain.Preferences,
        ["wyrmforge.audio.combat.v1"] = SaveDomain.Preferences,
        ["wyrmforge.audio.moment.v1"] = SaveDomain.Preferences,
        ["wyrmforge.audio.music.v1"] = SaveDomain.Preferences,
        ["wyrmforge.audio.ui.v1"] = SaveDomain.Preferences,
        ["wyrmforge.player-name.v1"] = SaveDomain.Preferences,
        ["wyrmforge_player_name"] = SaveDomain.Preferences,
        ["wyrmforge.playtest.v1"] = SaveDomain.Telemetry,
        ["wyrmforge.playtest.report.v1"] = SaveDomain.Telemetry,
        ["wyrmforge.playtest.lastReceipt.v1"] = SaveDomain.Telemetry,
        ["wyrmforge.playtest.pendingReceipt.v1"] = SaveDomain.Telemetry,
    };

    public static SaveDomain? DomainOf(string key) => Keys.TryGetValue(key, out var domain) ? domain : null;
}
