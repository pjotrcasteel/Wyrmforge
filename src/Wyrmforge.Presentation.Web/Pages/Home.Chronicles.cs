using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Application.Chronicles;
using Wyrmforge.Application.Persistence;
using Wyrmforge.Domain.Chronicles;
using Wyrmforge.Domain.Progression.Legacy;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private readonly ChronicleRegistry chronicles = new();
    private readonly OneTimeGrantLedger legacyGrants = new();

    private AdvancementFacts AdvancementFacts => new(
        AdvancedAccess.BookOneCompleted(legacyGrants),
        hunter.Level,
        greatHunt.Snapshot().Where(entry => entry.Slain).Select(entry => entry.Wyrm).ToHashSet(),
        greatHunt.Snapshot().Where(entry => entry.AscendantDefeated).Select(entry => entry.Wyrm).ToHashSet());

    private AdvancementProgress Advancement => AdvancedAccess.Evaluate(AdvancementFacts);

    private async Task TryLoadChroniclesAsync()
    {
        try
        {
            var grants = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, SaveLayout.LegacyGrants);
            if (!string.IsNullOrWhiteSpace(grants)) legacyGrants.Restore(JsonSerializer.Deserialize<string[]>(grants));
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, SaveLayout.Chronicles);
            if (!string.IsNullOrWhiteSpace(stored)) chronicles.Restore(JsonSerializer.Deserialize<ChronicleRegistrySave>(stored));
        }
        catch (JSException) { }
        catch (JsonException) { }
        catch (NotSupportedException) { }
        // Hunters who already earned the exploration road before it existed keep it from the first load.
        await TryUnlockAdvancedAccessAsync();
    }

    private async Task TryUnlockAdvancedAccessAsync()
    {
        if (!AdvancedAccess.TryUnlock(legacyGrants, AdvancementFacts)) return;
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, SaveLayout.LegacyGrants,
                JsonSerializer.Serialize(legacyGrants.Save()));
        }
        catch (JSException) { }
    }
}
