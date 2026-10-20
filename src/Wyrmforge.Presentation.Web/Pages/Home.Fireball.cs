using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.JSInterop;
using Wyrmforge.Domain.Progression.Fireball;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string FireballCoreKey = "wyrmforge.fireballCore.v1";
    private static readonly JsonSerializerOptions FireballSaveJson = new()
    {
        Converters = { new JsonStringEnumConverter() },
    };
    private readonly FireballCoreState fireballCore = new();

    private async Task LoadFireballCoreAsync()
    {
        try
        {
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, FireballCoreKey);
            if (!string.IsNullOrWhiteSpace(stored)) fireballCore.Restore(JsonSerializer.Deserialize<FireballCoreSave>(stored, FireballSaveJson));
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task SaveFireballCoreAsync()
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, FireballCoreKey,
                JsonSerializer.Serialize(fireballCore.ToSave(), FireballSaveJson));
        }
        catch (JSException) { }
    }

    private async Task UpgradeFireballCoreAsync()
    {
        if (!fireballCore.Upgrade(essenceVault)) return;
        // Persist the durable grant first; a disrupted second write must never consume a resource without granting its upgrade.
        await SaveFireballCoreAsync();
        await TrySetEssenceVaultAsync();
    }

    private async Task StudyFireballMutatorAsync(FireballMutatorId id)
    {
        if (!fireballCore.Study(id, essenceVault)) return;
        await SaveFireballCoreAsync();
        await TrySetEssenceVaultAsync();
    }

    private async Task SlotFireballMutatorAsync(int socket, FireballMutatorId? id)
    {
        if (!fireballCore.Slot(socket, id)) return;
        await SaveFireballCoreAsync();
    }
}
