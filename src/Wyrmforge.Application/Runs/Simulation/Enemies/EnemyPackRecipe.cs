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
    // Rimeclaw's region (Frost F4). Fire pressures, Frost boxes in: each pack builds a shape around the hunter rather than a rush.
    /// <summary>6–10 Packlings: the circling litter, waiting for the hunter to go cold.</summary>
    PacklingLitter,
    /// <summary>2–4 Packlings hold the ring while 2–3 Whitefangs feint to the flanks behind it.</summary>
    WhitefangHunt,
    /// <summary>4–6 Packlings with 2–3 Shardcasters planting lances and black ice behind them: a lane-closing line.</summary>
    ShardLine,
    /// <summary>5–8 Packlings tended by one Hoarfrost Cantor (and maybe a Shardcaster): armour and reknit, kill the chanter.</summary>
    CantorRite,
    /// <summary>1–2 Cairn Sentinels screening a Shardcaster, with a few Packlings at their feet: a moving wall.</summary>
    CairnWall,
    /// <summary>3–6 Packlings with 1–2 Mirror Wisps gliding in between them, one reflection at a time.</summary>
    WispVeil,
    /// <summary>The Frost Last Stand: every Frost role at once in a closing ring. Director climax only.</summary>
    Whiteout,
}

public static class EnemyPackRecipeCatalog
{
    /// <summary>The climax Last Stand is deliberately bigger than an ordinary pack (brief §6 "rare pressure spikes").</summary>
    public const double LastStandBudgetMultiplier = 1.8;

    /// <summary>The climax packs: the director sends them on the final approach, never as an ordinary roll.</summary>
    public static bool IsLastStand(EnemyPackRecipe recipe) => recipe is EnemyPackRecipe.LastStand or EnemyPackRecipe.Whiteout;

    /// <summary>The Last Stand of the habitat's region.</summary>
    public static EnemyPackRecipe LastStandFor(WyrmrealmHabitat habitat) =>
        WyrmrealmHabitatCatalog.School(habitat) == Domain.Spells.SpellSchool.Frost ? EnemyPackRecipe.Whiteout : EnemyPackRecipe.LastStand;

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
            [WyrmrealmHabitat.FrozenRoad] = new Dictionary<EnemyPackRecipe, double> { [EnemyPackRecipe.PacklingLitter] = 1 },
            [WyrmrealmHabitat.SnowboundPines] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.WhitefangHunt] = 5, [EnemyPackRecipe.PacklingLitter] = 2, [EnemyPackRecipe.ShardLine] = 1,
            },
            [WyrmrealmHabitat.WhiteoutPlain] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.ShardLine] = 4, [EnemyPackRecipe.PacklingLitter] = 3, [EnemyPackRecipe.WhitefangHunt] = 1,
            },
            [WyrmrealmHabitat.BuriedHamlet] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.CantorRite] = 4, [EnemyPackRecipe.PacklingLitter] = 3, [EnemyPackRecipe.CairnWall] = 1,
            },
            [WyrmrealmHabitat.CairnBarrows] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.CairnWall] = 5, [EnemyPackRecipe.CantorRite] = 2, [EnemyPackRecipe.PacklingLitter] = 1, [EnemyPackRecipe.WispVeil] = 1,
            },
            [WyrmrealmHabitat.MirrorMere] = new Dictionary<EnemyPackRecipe, double>
            {
                [EnemyPackRecipe.WispVeil] = 5, [EnemyPackRecipe.CairnWall] = 2, [EnemyPackRecipe.PacklingLitter] = 1,
            },
            [WyrmrealmHabitat.GlacierApproach] = GlacierApproach(),
            [WyrmrealmHabitat.GlacierLair] = GlacierApproach(),
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
        WyrmrealmHabitat.FrozenRoad => EnemyPackRecipe.PacklingLitter,
        WyrmrealmHabitat.SnowboundPines => EnemyPackRecipe.WhitefangHunt,
        WyrmrealmHabitat.WhiteoutPlain => EnemyPackRecipe.ShardLine,
        WyrmrealmHabitat.BuriedHamlet or WyrmrealmHabitat.GlacierApproach or WyrmrealmHabitat.GlacierLair => EnemyPackRecipe.CantorRite,
        WyrmrealmHabitat.CairnBarrows => EnemyPackRecipe.CairnWall,
        WyrmrealmHabitat.MirrorMere => EnemyPackRecipe.WispVeil,
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
        return recipe switch
        {
            EnemyPackRecipe.DrownedWatch => Stagger(members, EnemyKind.DrownedWraith),
            EnemyPackRecipe.WispVeil => Stagger(members, EnemyKind.MirrorWisp),
            _ => members,
        };
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
        EnemyPackRecipe.PacklingLitter => [new(EnemyKind.FrostlingPackling, 6, 10)],
        EnemyPackRecipe.WhitefangHunt => [new(EnemyKind.FrostlingPackling, 2, 4), new(EnemyKind.WhitefangStalker, 2, 3)],
        EnemyPackRecipe.ShardLine => [new(EnemyKind.FrostlingPackling, 4, 6), new(EnemyKind.Shardcaster, 2, 3)],
        EnemyPackRecipe.CantorRite => [new(EnemyKind.FrostlingPackling, 5, 8), new(EnemyKind.HoarfrostCantor, 1, 1), new(EnemyKind.Shardcaster, 0, 1)],
        EnemyPackRecipe.CairnWall => [new(EnemyKind.CairnSentinel, 1, 2), new(EnemyKind.FrostlingPackling, 2, 4), new(EnemyKind.Shardcaster, 1, 1)],
        EnemyPackRecipe.WispVeil => [new(EnemyKind.FrostlingPackling, 3, 6), new(EnemyKind.MirrorWisp, 1, 2)],
        EnemyPackRecipe.Whiteout =>
        [
            new(EnemyKind.FrostlingPackling, 6, 9), new(EnemyKind.CairnSentinel, 1, 1), new(EnemyKind.WhitefangStalker, 1, 2),
            new(EnemyKind.Shardcaster, 1, 2), new(EnemyKind.HoarfrostCantor, 0, 1), new(EnemyKind.MirrorWisp, 0, 1),
        ],
        _ =>
        [
            new(EnemyKind.Hollow, 4, 7), new(EnemyKind.MireHound, 1, 2), new(EnemyKind.Ashling, 4, 7), new(EnemyKind.Penitent, 1, 1),
            new(EnemyKind.AshSlinger, 1, 2), new(EnemyKind.AshPriest, 0, 1),
        ],
    };

    // Ambushers (wraiths, wisps) surface between the pack rather than together, so their tells arrive one at a time.
    private static List<EnemyKind> Stagger(List<EnemyKind> members, EnemyKind ambusher)
    {
        var count = members.Count(kind => kind == ambusher);
        var others = members.Where(kind => kind != ambusher).ToList();
        var stride = Math.Max(1, others.Count / (count + 1));
        for (var index = 0; index < count; index++) others.Insert(Math.Min(others.Count, (index + 1) * stride + index), ambusher);
        return others;
    }

    private static Dictionary<EnemyPackRecipe, double> Approach() => new()
    {
        [EnemyPackRecipe.PriestWarband] = 3, [EnemyPackRecipe.AshlingMob] = 3, [EnemyPackRecipe.Bastion] = 2, [EnemyPackRecipe.HuntingPack] = 1,
    };

    private static Dictionary<EnemyPackRecipe, double> GlacierApproach() => new()
    {
        [EnemyPackRecipe.CantorRite] = 3, [EnemyPackRecipe.ShardLine] = 3, [EnemyPackRecipe.CairnWall] = 2, [EnemyPackRecipe.WhitefangHunt] = 1,
        [EnemyPackRecipe.WispVeil] = 1,
    };

    private sealed record Group(EnemyKind Kind, int Min, int Max);
}
