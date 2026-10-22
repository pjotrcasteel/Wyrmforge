using System.Globalization;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.JSInterop;
using Wyrmforge.Application.Nexus;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Presentation.Web.Features.Forge;

public partial class BuildView : IAsyncDisposable
{
    [Parameter, EditorRequired] public PassiveTreeSelection Selection { get; set; } = null!;
    [Parameter] public DivineArchetype CharacterSchool { get; set; } = DivineArchetype.Pyromancer;
    [Parameter] public FireballCoreState? FireballCore { get; set; }

    private PassiveSchool ActiveSchool => ArcaneSchoolCatalog.For(CharacterSchool);

    protected override void OnParametersSet()
    {
        Selection.SetActiveSchool(ActiveSchool);
        Selection.SetKnownFireballMutations(FireballCore?.Discovered ?? new HashSet<FireballMutationId>());
    }
    [Parameter] public EventCallback OnSelectionChanged { get; set; }
    [Parameter] public EventCallback OnQuests { get; set; }
    [Parameter] public HuntLoadoutBook? Loadouts { get; set; }
    [Parameter] public Func<int, Task> SaveLoadout { get; set; } = _ => Task.CompletedTask;
    [Parameter] public Func<int, Task<HuntLoadoutApplyResult?>> ApplyLoadout { get; set; } = _ => Task.FromResult<HuntLoadoutApplyResult?>(null);
    [Parameter] public Func<int, Task> ClearLoadout { get; set; } = _ => Task.CompletedTask;

    // Arcane Nexus: research is embedded in the Web's node inspector (amendment §3). Null until research unlocks.
    [Parameter] public LaboratoryState? Laboratory { get; set; }
    [Parameter] public DragonEssenceVault? Vault { get; set; }
    [Parameter] public string? FocusNodeId { get; set; }
    [Parameter] public Func<LaboratoryMutationId, ArcaneMutationSocketId?, Task>? Equip { get; set; }
    [Parameter] public EventCallback<LaboratoryMutationId?> OnOpenSpellcraft { get; set; }

    private bool NexusReady => Laboratory is not null && Vault is not null;
    private NexusNode? FocusedNexus => NexusReady && FocusedNode.Kind != PassiveNodeKind.Origin ? ArcaneNexus.Node(focusedId, Laboratory!, Vault!, Selection.Selected, Loadouts) : null;
    private NexusSuggestion? Suggestion => NexusReady ? ArcaneNexus.Suggest(Laboratory!, Vault!, Selection.Selected) : null;
    private NexusResearchStage? MarkFor(string nodeId) => NexusReady && ArcaneNexus.IsResearchNode(nodeId) ? ArcaneNexus.Mark(nodeId, Laboratory!, Vault!, Selection.Selected) : null;

    private string NodeAriaLabel(PassiveNodeDefinition node) => MarkFor(node.Id) is { } mark
        ? $"{node.Name}. {node.Description} Research: {StageLabel(mark)}."
        : $"{node.Name}. {node.Description}";

    private static string StageClass(NexusResearchStage stage) => stage.ToString().ToLowerInvariant();

    // Shape and text carry the state as well as colour.
    private static string StageGlyph(NexusResearchStage stage) => stage switch
    {
        NexusResearchStage.NeedsMaterial => "?",
        NexusResearchStage.Experimenting => "!",
        NexusResearchStage.ReadyToStabilize => "★",
        NexusResearchStage.Discovered => "✓",
        _ => "◆",
    };

    private static string StageLabel(NexusResearchStage stage) => stage switch
    {
        NexusResearchStage.NeedsMaterial => "Needs material",
        NexusResearchStage.Experimenting => "Experiment ready",
        NexusResearchStage.ReadyToStabilize => "Ready to stabilize",
        NexusResearchStage.Discovered => "Discovered",
        _ => "Equipped",
    };

    private static string MaterialHelp(NexusMaterialNeed material) => material.Met
        ? "Secured in your vault. Research only studies it."
        : material.Tracked
            ? $"Found on {material.SourceName} · tracked, {material.TrackedHuntsLeft} hunt{(material.TrackedHuntsLeft == 1 ? string.Empty : "s")} left"
            : $"Found on {material.SourceName} · secure it after a hunt";

    private static string EquipBlocked(MutationEquipResult result) => result switch
    {
        MutationEquipResult.SocketLocked => "ALLOCATE THIS NODE FIRST",
        MutationEquipResult.FoundationTaken => "SAME SPELL ALREADY MUTATED",
        MutationEquipResult.SocketLimitReached => $"{LaboratoryCatalog.MaxEquippedMutations} SOCKETS IN USE",
        _ => "CANNOT EQUIP HERE",
    };

    private string SocketHelp(NexusSocket socket)
    {
        var accepts = string.Join(" + ", socket.Definition.Accepts);
        var holds = socket.Holder is { } holder ? $"Holds {LaboratoryCatalog.Get(holder).Name}." : "Empty.";
        return socket.Unlocked ? $"{holds} Accepts {accepts} blueprints." : $"Opens when you allocate {socket.Definition.NodeName}. Accepts {accepts} blueprints.";
    }

    private async Task EquipAsync(LaboratoryMutationId id, ArcaneMutationSocketId? socket)
    {
        if (Equip is not null) await Equip(id, socket);
    }

    private async Task FocusNodeAsync(string nodeId)
    {
        var node = PassiveTreeCatalog.Get(nodeId);
        InspectNode(node);
        await JavaScript.InvokeVoidAsync("wyrmforgeArcaneWeb.focus", viewport, ArcaneWheelLayout.Position(node, ActiveSchool).X, ArcaneWheelLayout.Position(node, ActiveSchool).Y);
    }

    private enum LoadoutAction { None, Overwrite, Clear }
    private int? openLoadout;
    private LoadoutAction pendingAction;
    private string? loadoutMessage;

    private static string RomanFor(int index) => HuntLoadoutBook.DefaultName(index)["Loadout ".Length..];

    private static string LoadoutSummary(HuntLoadout loadout)
    {
        var mutations = loadout.Slots.Count == 0 ? "no mutations"
            : string.Join(" + ", loadout.Slots.OrderBy(pair => pair.Key).Select(pair => LaboratoryCatalog.Get(pair.Value).Name));
        var parts = new List<string> { $"{loadout.Nodes.Count} nodes", mutations };
        if (loadout.Primary is { } primary) parts.Add(Wyrmforge.Domain.Spells.SpellCatalog.Get(primary).Name);
        if (loadout.Offering is { } offering) parts.Add($"offers {Wyrmforge.Domain.Progression.DragonEssences.DragonEssenceCatalog.Get(offering).Name}");
        return string.Join(" · ", parts);
    }

    private void ToggleLoadout(int index)
    {
        openLoadout = openLoadout == index ? null : index;
        pendingAction = LoadoutAction.None;
        loadoutMessage = null;
    }

    private async Task ConfirmOrRun(LoadoutAction action, Func<Task> run)
    {
        if (pendingAction != action) { pendingAction = action; return; }
        pendingAction = LoadoutAction.None;
        await run();
        loadoutMessage = action == LoadoutAction.Clear ? "Loadout cleared." : "Loadout overwritten with the current setup.";
    }

    private async Task SaveLoadoutAsync(int index)
    {
        await SaveLoadout(index);
        loadoutMessage = $"Saved {Loadouts?[index]?.Name}.";
    }

    private async Task ClearLoadoutAsync(int index) => await ClearLoadout(index);

    private async Task ApplyLoadoutAsync(int index)
    {
        pendingAction = LoadoutAction.None;
        if (await ApplyLoadout(index) is not { } result) return;
        focusedId = PassiveTreeCatalog.OriginId;
        inspectorOpen = false;
        var parts = new List<string> { $"Applied {Loadouts?[index]?.Name}: {result.NodesRestored} nodes" };
        if (result.Equipped.Count > 0) parts.Add(string.Join(" + ", result.Equipped.Select(id => LaboratoryCatalog.Get(id).Name)) + " equipped");
        if (result.NodesSkipped > 0) parts.Add($"{result.NodesSkipped} nodes could not be reached");
        if (result.Skipped.Count > 0) parts.Add($"{string.Join(" + ", result.Skipped.Select(id => LaboratoryCatalog.Get(id).Name))} not equipped");
        loadoutMessage = string.Join(" · ", parts) + ".";
    }

    private ElementReference viewport;
    private ElementReference inspectorRef;
    private bool revealInspector;
    private string focusedId = PassiveTreeCatalog.OriginId;
    private bool inspectorOpen;
    private int PointsLeft => Selection.AvailablePoints;
    private PassiveNodeDefinition FocusedNode => PassiveTreeCatalog.Get(focusedId);
    private PassiveTreeRoutePlan? FocusedPlan => PassiveTreePlanner.Plan(Selection, focusedId);

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            await JavaScript.InvokeVoidAsync("wyrmforgeArcaneWeb.initialize", viewport);
            if (FocusNodeId is { } focus && PassiveTreeCatalog.All.Any(node => node.Id == focus))
            {
                await FocusNodeAsync(focus);
                StateHasChanged();
            }
        }

        if (showRefundDialog)
        {
            showRefundDialog = false;
            await JavaScript.InvokeVoidAsync("wyrmforgeArcaneWeb.openRefundDialog", refundDialog);
        }

        if (revealInspector && inspectorOpen)
        {
            revealInspector = false;
            await JavaScript.InvokeVoidAsync("wyrmforgeArcaneWeb.revealInspector", inspectorRef);
        }
    }

    private bool IsSelected(PassiveNodeDefinition node) => node.Kind == PassiveNodeKind.Origin || Selection.Selected.Contains(node.Id);

    private void InspectNode(PassiveNodeDefinition node)
    {
        focusedId = node.Id;
        inspectorOpen = true;
        revealInspector = true;
    }

    private async Task AllocateFocusedRoute()
    {
        var plan = FocusedPlan;
        if (plan is null || plan.AdditionalCost > PointsLeft) return;
        if (Selection.SelectPath(plan.NodeIds)) await OnSelectionChanged.InvokeAsync();
    }

    private async Task RefundFocused()
    {
        if (!Selection.CanRemove(focusedId)) return;
        if (!refundWarningAccepted && ArcaneSchoolCatalog.Owner(FocusedNode) != ActiveSchool)
        {
            pendingRefundId = focusedId;
            showRefundDialog = true;
            return;
        }
        if (Selection.Remove(focusedId)) await OnSelectionChanged.InvokeAsync();
    }
    private void CloseInspector() => inspectorOpen = false;

    private string NodeClass(PassiveNodeDefinition node)
    {
        var classes = new List<string> { "web-node", $"kind-{node.Kind.ToString().ToLowerInvariant()}" };
        if (node.School is { } school) classes.Add($"school-{school.ToString().ToLowerInvariant()}");
        else classes.Add("school-hybrid");

        if (ArcaneSchoolCatalog.Owner(node) != ActiveSchool && node.Kind != PassiveNodeKind.Origin) classes.Add("study-locked");
        if (node.Requirement is not null) classes.Add("mutation-enhancer");
        if (IsSelected(node)) classes.Add("selected");
        else if (IsPreviewNode(node.Id)) classes.Add("preview");
        else if (Selection.CanSelect(node.Id)) classes.Add("available");
        else classes.Add("locked");

        if (focusedId == node.Id && inspectorOpen) classes.Add("focused");
        return string.Join(' ', classes);
    }

    private string ConnectionClass(PassiveTreeConnection connection)
    {
        var fromAllocated = IsAllocated(connection.From);
        var toAllocated = IsAllocated(connection.To);
        if (fromAllocated && toAllocated) return "web-edge active";
        if (IsPreviewConnection(connection)) return "web-edge preview";
        if ((fromAllocated && CanAllocate(connection.To)) || (toAllocated && CanAllocate(connection.From))) return "web-edge available";
        return "web-edge";
    }

    private bool IsPreviewNode(string id) => FocusedPlan?.NodeIds.Contains(id) == true;

    private bool IsPreviewConnection(PassiveTreeConnection connection)
    {
        var plan = FocusedPlan;
        if (!inspectorOpen || plan is null || plan.NodeIds.Count == 0) return false;
        var route = new HashSet<string>(plan.NodeIds, StringComparer.Ordinal) { plan.AnchorId };
        return route.Contains(connection.From) && route.Contains(connection.To);
    }

    private IReadOnlyList<ArcaneStatBadge> RouteMinorBonuses(PassiveTreeRoutePlan plan) =>
        ArcaneNodePresentation.AggregateMinorBonuses(plan.NodeIds.Select(PassiveTreeCatalog.Get));

    private static IReadOnlyList<PassiveNodeDefinition> RouteLandmarks(PassiveTreeRoutePlan plan) =>
        plan.NodeIds.Select(PassiveTreeCatalog.Get).Where(node => node.Kind != PassiveNodeKind.Travel).ToArray();

    private bool IsAllocated(string id) => id == PassiveTreeCatalog.OriginId || Selection.Selected.Contains(id);
    private bool CanAllocate(string id) => id != PassiveTreeCatalog.OriginId && Selection.CanSelect(id);
    private string NodeStyle(PassiveNodeDefinition node) => PointStyle(ArcaneWheelLayout.Position(node, ActiveSchool));
    private static string PointStyle(ArcaneWheelLayout.Point point) => FormattableString.Invariant($"left:{point.X:0.##}px;top:{point.Y:0.##}px;");
    private string RefundHelp => Selection.CanRemove(focusedId) ? "Refunding it keeps every other travelled route connected." : "Another travelled route depends on this node, so refund that branch first.";

    private string RouteSummaryCopy(PassiveTreeRoutePlan plan)
    {
        if (plan.NodeIds.Count == 1) return "This node touches your current route and can be claimed directly.";
        var destination = PassiveTreeCatalog.Get(plan.NodeIds[^1]);
        return $"{plan.NodeIds.Count} new nodes connect your current build to {destination.Name}. Minor gains are combined below.";
    }

    private static string CompactValue(string value) => value.StartsWith('+') ? value[1..] : value;
    private static string Coordinate(double value) => value.ToString("0.##", CultureInfo.InvariantCulture);

    private static string NodeGlyph(PassiveNodeDefinition node) => node.Kind switch
    {
        PassiveNodeKind.Origin => "W",
        PassiveNodeKind.Travel => ArcaneNodePresentation.MinorBonuses(node).FirstOrDefault()?.Icon ?? "•",
        _ => ArcaneNodePresentation.SchoolIcon(node),
    };

    private static string KindLabel(PassiveNodeDefinition node) => node.Kind switch
    {
        PassiveNodeKind.Origin => "ORIGIN",
        PassiveNodeKind.Travel => "MINOR BONUS",
        PassiveNodeKind.Notable => "NOTABLE LANDMARK",
        PassiveNodeKind.Mastery => "MASTERY LANDMARK",
        _ => "KEYSTONE LANDMARK",
    };

    private string NodeState(PassiveNodeDefinition node)
    {
        if (node.Kind == PassiveNodeKind.Origin) return "ROOTED";
        if (Selection.Selected.Contains(node.Id)) return "TRAVERSED";
        if (!Selection.CanLearn(node)) return ArcaneSchoolCatalog.Owner(node) == ActiveSchool ? "NEEDS MUTATION" : "OTHER SCHOOL";
        if (IsPreviewNode(node.Id)) return "PLANNED";
        if (Selection.CanSelect(node.Id)) return "REACHABLE";
        if (node.MasteryGroup is { } group && Selection.Selected.Any(id => PassiveTreeCatalog.Get(id).MasteryGroup == group)) return "CHOICE LOCKED";
        return "UNCHARTED";
    }

    private string NodeStateClass(PassiveNodeDefinition node) => NodeState(node).ToLowerInvariant().Replace(' ', '-');
    private static string SchoolLabel(PassiveNodeDefinition node) => ArcaneSchoolCatalog.Owner(node) is { } school ? ArcaneSchoolCatalog.Get(school).Name : "The mage’s learned knowledge";

    private async Task Reset()
    {
        if (!refundWarningAccepted && Selection.Selected.Any(id => ArcaneSchoolCatalog.Owner(PassiveTreeCatalog.Get(id)) != ActiveSchool))
        {
            pendingReset = true;
            showRefundDialog = true;
            return;
        }
        Selection.Reset();
        await OnSelectionChanged.InvokeAsync();
        focusedId = PassiveTreeCatalog.OriginId;
        inspectorOpen = false;
    }

    private async Task ZoomAsync(double delta) => await JavaScript.InvokeVoidAsync("wyrmforgeArcaneWeb.zoom", viewport, delta);
    private async Task ResetViewAsync() => await JavaScript.InvokeVoidAsync("wyrmforgeArcaneWeb.overview", viewport);

    private async Task FocusSchoolAsync(PassiveSchool school)
    {
        var point = ArcaneWheelLayout.Anchor(school, ActiveSchool, 350);
        inspectorOpen = false;
        await JavaScript.InvokeVoidAsync("wyrmforgeArcaneWeb.focusSchool", viewport, point.X, point.Y);
    }

    private bool refundWarningAccepted;
    private string? pendingRefundId;
    private bool pendingReset;
    private bool showRefundDialog;
    private ElementReference refundDialog;

    private void CancelRefund() { pendingRefundId = null; pendingReset = false; }
    private void RefundDialogKey(KeyboardEventArgs args) { if (args.Key == "Escape") CancelRefund(); }

    private async Task ConfirmRefundAsync()
    {
        var id = pendingRefundId;
        var reset = pendingReset;
        CancelRefund();
        refundWarningAccepted = true;
        if (reset) await Reset();
        else if (id is not null && Selection.Remove(id)) await OnSelectionChanged.InvokeAsync();
    }

    public async ValueTask DisposeAsync()
    {
        try { await JavaScript.InvokeVoidAsync("wyrmforgeArcaneWeb.dispose", viewport); }
        catch (JSException) { }
        catch (TaskCanceledException) { }
    }
}
