using Microsoft.JSInterop;
using Wyrmforge.Application.Persistence;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private Task<IJSObjectReference>? hunterSaveModule;
    private readonly AsyncLocal<Dictionary<string, string>?> hunterSaveBatch = new();
    private readonly SemaphoreSlim hunterSaveLock = new(1);
    private readonly Dictionary<string, string> pendingHunterSave = new(StringComparer.Ordinal);
    private bool hunterSaveFailed;
    private bool hunterSaveLoadFailed;

    private Task<IJSObjectReference> GetHunterSaveModuleAsync() =>
        hunterSaveModule ??= JavaScript.InvokeAsync<IJSObjectReference>("import", "./js/hunter-save.js").AsTask();

    private async ValueTask<string?> ReadHunterSaveAsync(string key)
    {
        try
        {
            var module = await GetHunterSaveModuleAsync();
            return await module.InvokeAsync<string?>("read", SaveLayout.HunterSave, SaveLayout.HunterKeys, key);
        }
        catch (JSException)
        {
            hunterSaveLoadFailed = true;
            throw;
        }
    }

    private Task WriteHunterSaveAsync(string key, string value) =>
        WriteHunterSaveAsync(new Dictionary<string, string> { [key] = value });

    private Task WriteHunterSaveAsync(Dictionary<string, string> changes)
    {
        if (hunterSaveBatch.Value is not { } batch) return CommitHunterSaveAsync(changes);
        foreach (var (key, value) in changes) batch[key] = value;
        return Task.CompletedTask;
    }

    private async Task CommitHunterSaveAsync(Dictionary<string, string> changes)
    {
        await hunterSaveLock.WaitAsync();
        try
        {
            foreach (var (key, value) in changes) pendingHunterSave[key] = value;
            if (pendingHunterSave.Count == 0) return;
            var module = await GetHunterSaveModuleAsync();
            await module.InvokeVoidAsync("write", SaveLayout.HunterSave, SaveLayout.HunterKeys, pendingHunterSave);
            pendingHunterSave.Clear();
            hunterSaveFailed = false;
        }
        catch (JSException)
        {
            hunterSaveFailed = true;
        }
        finally
        {
            hunterSaveLock.Release();
        }
    }

    private Task RetryHunterSaveAsync() => CommitHunterSaveAsync([]);

    private async Task BatchHunterSaveAsync(Func<Task> update)
    {
        var batch = new Dictionary<string, string>(StringComparer.Ordinal);
        hunterSaveBatch.Value = batch;
        try
        {
            await update();
            if (batch.Count > 0) await CommitHunterSaveAsync(batch);
        }
        finally
        {
            hunterSaveBatch.Value = null;
        }
    }
}
