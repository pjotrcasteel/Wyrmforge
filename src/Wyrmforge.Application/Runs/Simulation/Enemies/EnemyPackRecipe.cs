using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Structured monster groups from the encounter brief (§6). Each pack has a purpose; fillers only add texture around it.</summary>
public enum EnemyPackRecipe
{
    /// <summary>5–11 Hollows, a slow staggered shamble.</summary>
    WanderingDead,
    /// <summary>3–6 Mire Hounds arriving in pairs from different sides.</summary>
    HuntingPack,
    /// <summary>7–12 Ashlings: a rush to burn down with area spells.</summary>
    AshlingMob,
    /// <summary>One Ash Priest behind 5–8 Ashlings, with up to two Slingers.</summary>
    PriestWarband,
    /// <summary>1–3 Penitents screening one Slinger or Priest, plus a light melee pack.</summary>
    Bastion,
    /// <summary>1–2 Drowned Wraiths among 4–8 Hollows; the wraiths surface one at a time.</summary>
    DrownedWatch,
    /// <summary>12–22 mixed units with every recognizable role. Director climax only.</summary>
    LastStand,
}

public static class EnemyPackRecipeCatalog
{
    /// <summary>The climax Last Stand is deliberately bigger than an ordinary pack (brief §6 "rare pressure spikes").</summary>
    public const double LastStandBudgetMultiplier = 1.8;

    private static readonly IReadOnlyDictionary<WyrmrealmHabitat, IReadOnlyDictionary<EnemyPackRecipe, double>> Affinity =
        new Dictionary<WyrmrealmHabitat, IReadOnlyDictionary<EnemyPackRecipe, double>>
        {
            [WyrmrealmHabitat.Outskirts] = new Dictionary<EnemyPackRecipe, double> { [EnemyPackRecipe.WanderingDead] = 1 },
            [WyrmrealmHabitat.WetForest] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.HuntingPack] = 5, [EnemyPackRecipe.WanderingDead] = 2, [EnemyPackRecipe.AshlingMob] = 1,
            },
            [WyrmrealmHabitat.OpenField] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.AshlingMob] = 4, [EnemyPackRecipe.PriestWarband] = 3, [EnemyPackRecipe.HuntingPack] = 1,
            },
            [WyrmrealmHabitat.DesertedVillage] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.WanderingDead] = 4, [EnemyPackRecipe.PriestWarband] = 3, [EnemyPackRecipe.Bastion] = 1,
            },
            [WyrmrealmHabitat.MonasteryGrounds] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.Bastion] = 5, [EnemyPackRecipe.WanderingDead] = 2, [EnemyPackRecipe.PriestWarband] = 1, [EnemyPackRecipe.DrownedWatch] = 1,
            },
            [WyrmrealmHabitat.FloodedCloister] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.DrownedWatch] = 5, [EnemyPackRecipe.Bastion] = 2, [EnemyPackRecipe.WanderingDead] = 1,
            },
            [WyrmrealmHabitat.ScorchedApproach] = Approach(),
            [WyrmrealmHabitat.Lair] = Approach(),
        };

    public static double Weight(WyrmrealmHabitat habitat, EnemyPackRecipe recipe) =>
        Affinity.TryGetValue(habitat, out var row) && row.TryGetValue(recipe, out var weight) ? weight : 0;

    /// <summary>The pack a habitat's director sends when its surge begins (brief §6: phases trigger new events, not faster timers).</summary>
    public static EnemyPackRecipe SurgeEvent(WyrmrealmHabitat habitat) => habitat switch
    {
        WyrmrealmHabitat.WetForest => EnemyPackRecipe.HuntingPack,
        WyrmrealmHabitat.OpenField => EnemyPackRecipe.AshlingMob,
        WyrmrealmHabitat.MonasteryGrounds => EnemyPackRecipe.Bastion,
        WyrmrealmHabitat.FloodedCloister => EnemyPackRecipe.DrownedWatch,
        WyrmrealmHabitat.ScorchedApproach or WyrmrealmHabitat.Lair => EnemyPackRecipe.PriestWarband,
        _ => EnemyPackRecipe.WanderingDead,
    };

    /// <summary>Picks a pack the habitat hosts and the budget affords, or null when only loose fillers fit.</summary>
    public static (EnemyPackRecipe Recipe, IReadOnlyList<EnemyKind> Members)? Choose(WyrmrealmHabitat habitat, int budget, IRandomSource randomSource)
    {
        var candidates = Enum.GetValues<EnemyPackRecipe>().Where(recipe => Weight(habitat, recipe) > 0).ToList();
        while (candidates.Count > 0)
        {
            var total = candidates.Sum(recipe => Weight(habitat, recipe));
            var roll = randomSource.NextDouble() * total;
            var chosen = candidates[^1];
            foreach (var recipe in candidates)
            {
                roll -= Weight(habitat, recipe);
                if (roll < 0) { chosen = recipe; break; }
            }
            if (Build(chosen, habitat, budget, randomSource) is { } members) return (chosen, members);
            candidates.Remove(chosen);
        }
        return null;
    }

    /// <summary>
    /// Rolls the pack's sizes, then trims the largest optional group until it fits the budget. Returns null when even the
    /// minimum pack is unaffordable or the habitat does not host one of its members (introduction policy).
    /// </summary>
    public static IReadOnlyList<EnemyKind>? Build(EnemyPackRecipe recipe, WyrmrealmHabitat habitat, int budget, IRandomSource randomSource)
    {
        var groups = Groups(recipe, randomSource);
        if (groups.Any(group => !EnemyHabitatProfile.Allows(habitat, group.Kind))) return null;
        var counts = groups.Select(group => group.Min + randomSource.Next(group.Max - group.Min + 1)).ToArray();
        while (Cost(groups, counts) > budget)
        {
            var trim = -1;
            for (var index = 0; index < groups.Count; index++)
            {
                if (counts[index] <= groups[index].Min) continue;
                if (trim < 0 || counts[index] - groups[index].Min >= counts[trim] - groups[trim].Min) trim = index;
            }
            if (trim < 0) return null;
            counts[trim]--;
        }

        var members = new List<EnemyKind>();
        for (var index = 0; index < groups.Count; index++)
        {
            for (var count = 0; count < counts[index]; count++) members.Add(groups[index].Kind);
        }
        return recipe == EnemyPackRecipe.DrownedWatch ? StaggerWraiths(members) : members;
    }

    private static int Cost(IReadOnlyList<Group> groups, IReadOnlyList<int> counts) =>
        groups.Select((group, index) => EnemyCatalog.Get(group.Kind).ThreatCost * counts[index]).Sum();

    // Spawn order is part of the recipe: screens first, the protected caster after the pack it tends.
    private static IReadOnlyList<Group> Groups(EnemyPackRecipe recipe, IRandomSource randomSource) => recipe switch
    {
        EnemyPackRecipe.WanderingDead => [new(EnemyKind.Hollow, 5, 11)],
        EnemyPackRecipe.HuntingPack => [new(EnemyKind.MireHound, 3, 6)],
        EnemyPackRecipe.AshlingMob => [new(EnemyKind.Ashling, 7, 12)],
        EnemyPackRecipe.PriestWarband => [new(EnemyKind.Ashling, 5, 8), new(EnemyKind.AshPriest, 1, 1), new(EnemyKind.AshSlinger, 0, 2)],
        EnemyPackRecipe.Bastion => randomSource.Next(2) == 0
            ? [new(EnemyKind.Penitent, 1, 3), new(EnemyKind.Hollow, 2, 4), new(EnemyKind.AshSlinger, 1, 1)]
            : [new(EnemyKind.Penitent, 1, 2), new(EnemyKind.Ashling, 4, 5), new(EnemyKind.AshPriest, 1, 1)],
        EnemyPackRecipe.DrownedWatch => [new(EnemyKind.Hollow, 4, 8), new(EnemyKind.DrownedWraith, 1, 2)],
        _ =>
        [
            new(EnemyKind.Hollow, 4, 7), new(EnemyKind.MireHound, 1, 2), new(EnemyKind.Ashling, 4, 7), new(EnemyKind.Penitent, 1, 1),
            new(EnemyKind.AshSlinger, 1, 2), new(EnemyKind.AshPriest, 0, 1),
        ],
    };

    // Wraiths surface between the Hollows rather than together, so their ripples arrive one at a time.
    private static List<EnemyKind> StaggerWraiths(List<EnemyKind> members)
    {
        var wraiths = members.Count(kind => kind == EnemyKind.DrownedWraith);
        var others = members.Where(kind => kind != EnemyKind.DrownedWraith).ToList();
        var stride = Math.Max(1, others.Count / (wraiths + 1));
        for (var index = 0; index < wraiths; index++) others.Insert(Math.Min(others.Count, (index + 1) * stride + index), EnemyKind.DrownedWraith);
        return others;
    }

    private static Dictionary<EnemyPackRecipe, double> Approach() => new()
    {
        [EnemyPackRecipe.PriestWarband] = 3, [EnemyPackRecipe.AshlingMob] = 3, [EnemyPackRecipe.Bastion] = 2, [EnemyPackRecipe.HuntingPack] = 1,
    };

    private sealed record Group(EnemyKind Kind, int Min, int Max);
}
