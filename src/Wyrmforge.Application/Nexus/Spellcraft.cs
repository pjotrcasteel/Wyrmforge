using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Composition;

namespace Wyrmforge.Application.Nexus;

// One of the six natural two-element families (handover §"Six natural two-element families").
public sealed record SpellcraftFamily(SpellSchool First, SpellSchool Second, string Name, string Essence)
{
    public bool Joins(SpellSchool a, SpellSchool b) => (First == a && Second == b) || (First == b && Second == a);
}

// What the ritual circle shows for the elements currently seated in it.
public enum SpellcraftState
{
    Empty,
    AwaitingInfusion,
    SameElement,
    Sealed,
    Research,
}

public sealed record SpellcraftCircle(
    SpellSchool? Foundation,
    SpellSchool? Infusion,
    SpellcraftState State,
    SpellcraftFamily? Family,
    NexusResearch? Research,
    string Title,
    string Text);

// A grimoire page: one family, how far the player has read it and which seat order its known recipe uses.
public sealed record SpellcraftPage(SpellcraftFamily Family, NexusResearch? Research, SpellSchool? RecipeFoundation, SpellSchool? RecipeInfusion)
{
    public bool Known => Research?.Stage is NexusResearchStage.Discovered or NexusResearchStage.Equipped;
    public bool Studied => Research is { ConditionsKnown: > 0 } || Known;
}

// A line in the research log. Failures are written down too: they are knowledge, not waste.
public sealed record SpellcraftLogEntry(LaboratoryMutationId Mutation, string Experiment, LaboratoryExperimentOutcome Outcome, string Label, string Finding);

// The Spellcraft facet of the Arcane Nexus: the ritual circle answers "what can these elements become?",
// the Web answers "where does it live?". Pure read model over the same research state as ArcaneNexus.
public static class Spellcraft
{
    // Handover caps ordinary spells at three elemental roles; the third seat is sealed until that system exists.
    public const int OpenSeats = 2;
    public const int MaxSeats = 3;

    public static IReadOnlyList<SpellSchool> Elements { get; } = [SpellSchool.Fire, SpellSchool.Frost, SpellSchool.Storm, SpellSchool.Arcane];

    public static IReadOnlyList<SpellcraftFamily> Families { get; } =
    [
        new(SpellSchool.Fire, SpellSchool.Frost, "Frostfire", "Thermal shock: burn, freeze, shatter."),
        new(SpellSchool.Fire, SpellSchool.Storm, "Flashpoint", "Charged ignition that spreads in bounded bursts."),
        new(SpellSchool.Fire, SpellSchool.Arcane, "Riftbrand", "Fire bent through space, ignited on command."),
        new(SpellSchool.Frost, SpellSchool.Storm, "Stormglass", "Conductive ice that chains and shatters."),
        new(SpellSchool.Frost, SpellSchool.Arcane, "Glacial Echo", "Delayed frost echoes and crystal displacement."),
        new(SpellSchool.Storm, SpellSchool.Arcane, "Arcane Conduit", "Stored energy released as echoing discharge."),
    ];

    public static SpellcraftFamily Family(SpellSchool a, SpellSchool b) =>
        Families.FirstOrDefault(family => family.Joins(a, b)) ?? throw new ArgumentException($"{a} and {b} form no family.");

    // Seat order matters: the foundation decides delivery, the infusion the reaction (handover "Element order matters").
    public static (SpellSchool Foundation, SpellSchool Infusion) SeatsOf(LaboratoryMutationDefinition mutation)
    {
        var foundation = SpellCatalog.Get(mutation.Foundation).School;
        var infusion = LaboratoryCatalog.Get(mutation.Socket).Accepts.Select(School).First(school => school != foundation);
        return (foundation, infusion);
    }

    public static LaboratoryMutationDefinition? RecipeFor(SpellSchool foundation, SpellSchool infusion) =>
        LaboratoryCatalog.Mutations.FirstOrDefault(mutation => SeatsOf(mutation) == (foundation, infusion));

    public static SpellcraftCircle Circle(SpellSchool? foundation, SpellSchool? infusion, LaboratoryState laboratory, DragonEssenceVault vault, IReadOnlySet<string> arcaneNodes, HuntLoadoutBook? loadouts = null)
    {
        ArgumentNullException.ThrowIfNull(laboratory);
        ArgumentNullException.ThrowIfNull(vault);
        ArgumentNullException.ThrowIfNull(arcaneNodes);

        if (foundation is null && infusion is null)
            return new(null, null, SpellcraftState.Empty, null, null, "The circle is quiet", "Place an element on the foundation seat. It decides how the spell travels.");
        if (foundation is not { } first)
            return new(null, infusion, SpellcraftState.AwaitingInfusion, null, null, "A foundation is missing", "The first element shapes the spell. Seat one on the left.");
        if (infusion is not { } second)
            return new(first, null, SpellcraftState.AwaitingInfusion, null, null, $"{first} waits", "Add a second element to infuse it.");
        if (first == second)
            return new(first, second, SpellcraftState.SameElement, null, null, $"{first} answers only {first}", "One element cannot react with itself. Choose a different infusion.");

        var family = Family(first, second);
        if (RecipeFor(first, second) is { } recipe)
        {
            var research = ArcaneNexus.Research(recipe, laboratory, vault, arcaneNodes, loadouts);
            var title = research.Stage is NexusResearchStage.Discovered or NexusResearchStage.Equipped ? recipe.Name : family.Name;
            return new(first, second, SpellcraftState.Research, family, research, title, recipe.Summary);
        }

        // An unwritten form of this family. If the reverse order has a recipe, say so: that is an earned, honest clue.
        var reverse = RecipeFor(second, first);
        var text = reverse is null
            ? $"{family.Essence} No one has written this resonance down yet. It will open in a later season."
            : $"{family.Essence} This order is still sealed; the known form begins with {second}.";
        return new(first, second, SpellcraftState.Sealed, family, null, family.Name, text);
    }

    public static IReadOnlyList<SpellcraftPage> Grimoire(LaboratoryState laboratory, DragonEssenceVault vault, IReadOnlySet<string> arcaneNodes, HuntLoadoutBook? loadouts = null) =>
        Families.Select(family =>
        {
            var recipe = LaboratoryCatalog.Mutations.FirstOrDefault(mutation =>
            {
                var (a, b) = SeatsOf(mutation);
                return family.Joins(a, b);
            });
            if (recipe is null) return new SpellcraftPage(family, null, null, null);
            var (foundation, infusion) = SeatsOf(recipe);
            return new SpellcraftPage(family, ArcaneNexus.Research(recipe, laboratory, vault, arcaneNodes, loadouts), foundation, infusion);
        }).ToArray();

    public static IReadOnlyList<SpellcraftLogEntry> Log(LaboratoryState laboratory)
    {
        ArgumentNullException.ThrowIfNull(laboratory);
        return LaboratoryCatalog.Experiments
            .Where(experiment => laboratory.HasObserved(experiment.Reveals))
            .Select(experiment => new SpellcraftLogEntry(experiment.Mutation, experiment.Name, experiment.Outcome, experiment.Label, experiment.Finding))
            .ToArray();
    }

    private static SpellSchool School(SpellTag tag) => tag switch
    {
        SpellTag.Fire => SpellSchool.Fire,
        SpellTag.Frost => SpellSchool.Frost,
        SpellTag.Storm => SpellSchool.Storm,
        SpellTag.Arcane => SpellSchool.Arcane,
        _ => throw new ArgumentOutOfRangeException(nameof(tag), tag, "Not an element tag."),
    };
}
