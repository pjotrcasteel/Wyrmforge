using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public static class ResonanceThresholdCatalog
{
    public const int PureThreshold = 8;
    public const int HybridThreshold = 5;

    public static IReadOnlyList<ResonanceThresholdDefinition> All { get; } =
    [
        Pure("fire-attuned", "Kindled", "🔥", "Deep Fire resonance increases all damage by 10%.", SpellSchool.Fire,
            new BuildStatModifier(BuildStatId.Damage, BuildStatOperation.Multiply, 1.10)),
        Pure("frost-attuned", "Rimebound", "❄", "Deep Frost resonance reduces incoming damage by 10%.", SpellSchool.Frost,
            new BuildStatModifier(BuildStatId.DamageTaken, BuildStatOperation.Multiply, 0.90)),
        Pure("storm-attuned", "Overcharged", "⚡", "Deep Storm resonance shortens cast intervals by 10%.", SpellSchool.Storm,
            new BuildStatModifier(BuildStatId.CastInterval, BuildStatOperation.Multiply, 0.90)),
        Pure("arcane-attuned", "Aether-Touched", "✦", "Deep Arcane resonance increases projectile speed by 15%.", SpellSchool.Arcane,
            new BuildStatModifier(BuildStatId.ProjectileSpeed, BuildStatOperation.Multiply, 1.15)),
        Hybrid("thermal-flux", "Thermal Flux", "🔥❄", "Fire and Frost reinforce offense and resilience.", SpellSchool.Fire, SpellSchool.Frost,
            new BuildStatModifier(BuildStatId.Damage, BuildStatOperation.Multiply, 1.04),
            new BuildStatModifier(BuildStatId.DamageTaken, BuildStatOperation.Multiply, 0.97)),
        Hybrid("wildfire-current", "Wildfire Current", "🔥⚡", "Fire and Storm accelerate aggressive casting.", SpellSchool.Fire, SpellSchool.Storm,
            new BuildStatModifier(BuildStatId.Damage, BuildStatOperation.Multiply, 1.04),
            new BuildStatModifier(BuildStatId.CastInterval, BuildStatOperation.Multiply, 0.97)),
        Hybrid("starfire", "Starfire", "🔥✦", "Fire and Arcane drive harder, faster projectiles.", SpellSchool.Fire, SpellSchool.Arcane,
            new BuildStatModifier(BuildStatId.Damage, BuildStatOperation.Multiply, 1.04),
            new BuildStatModifier(BuildStatId.ProjectileSpeed, BuildStatOperation.Multiply, 1.06)),
        Hybrid("rime-current", "Rime Current", "❄⚡", "Frost and Storm combine defense with casting speed.", SpellSchool.Frost, SpellSchool.Storm,
            new BuildStatModifier(BuildStatId.DamageTaken, BuildStatOperation.Multiply, 0.97),
            new BuildStatModifier(BuildStatId.CastInterval, BuildStatOperation.Multiply, 0.97)),
        Hybrid("voidfrost", "Voidfrost", "❄✦", "Frost and Arcane reinforce defense and projectile control.", SpellSchool.Frost, SpellSchool.Arcane,
            new BuildStatModifier(BuildStatId.DamageTaken, BuildStatOperation.Multiply, 0.97),
            new BuildStatModifier(BuildStatId.ProjectileSpeed, BuildStatOperation.Multiply, 1.06)),
        Hybrid("aetherstorm", "Aetherstorm", "⚡✦", "Storm and Arcane accelerate both casting and projectiles.", SpellSchool.Storm, SpellSchool.Arcane,
            new BuildStatModifier(BuildStatId.CastInterval, BuildStatOperation.Multiply, 0.97),
            new BuildStatModifier(BuildStatId.ProjectileSpeed, BuildStatOperation.Multiply, 1.06)),
    ];

    private static ResonanceThresholdDefinition Pure(string id, string name, string icon, string description, SpellSchool school, params BuildStatModifier[] modifiers) =>
        new(id, name, icon, description, [new ResonanceRequirement(school, PureThreshold)], new BuildModifierProfile(modifiers));

    private static ResonanceThresholdDefinition Hybrid(string id, string name, string icon, string description, SpellSchool first, SpellSchool second,
        params BuildStatModifier[] modifiers) => new(id, name, icon, description,
        [new ResonanceRequirement(first, HybridThreshold), new ResonanceRequirement(second, HybridThreshold)], new BuildModifierProfile(modifiers));
}
