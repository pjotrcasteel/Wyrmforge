using System.Text.Json;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Domain.Progression.Bestiary;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string BestiaryKey = "wyrmforge.bestiary.v1";
    private readonly BestiaryState bestiary = new();
    private BestiaryRunResult? bestiaryDiscoveries;

    // Every ending counts, abandoned hunts included: what the hunter saw stays seen.
    private async Task RecordBestiaryAsync(RunSummary value)
    {
        bestiaryDiscoveries = bestiary.Record(value.EnemyRecords.Select(record => (record.Kind, record.Kills)), value.ElitesSlain);
        if (value.EnemyRecords.Count > 0 || value.ElitesSlain.Count > 0) await TrySetBestiaryAsync();
    }

    private async Task TryLoadBestiaryAsync()
    {
        try
        {
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, BestiaryKey);
            if (string.IsNullOrWhiteSpace(stored)) return;
            bestiary.Restore(JsonSerializer.Deserialize<BestiarySave>(stored));
        }
        catch (JSException) { }
        catch (JsonException) { }
        catch (NotSupportedException) { }
    }

    private async Task TrySetBestiaryAsync()
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, BestiaryKey,
                JsonSerializer.Serialize(bestiary.Snapshot()));
        }
        catch (JSException) { }
    }
}
