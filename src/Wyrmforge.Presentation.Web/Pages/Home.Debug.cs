using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    [Inject] public NavigationManager DebugNavigation { get; set; } = null!;

    private async Task ResetCharacterAsync()
    {
        await using var module = await JavaScript.InvokeAsync<IJSObjectReference>("import", "./js/character-reset.js");
        await module.InvokeVoidAsync("resetCharacter");
        // Discard every in-memory aggregate and remove debug/deep-link parameters.
        DebugNavigation.NavigateTo(DebugNavigation.BaseUri, forceLoad: true, replace: true);
    }
}
