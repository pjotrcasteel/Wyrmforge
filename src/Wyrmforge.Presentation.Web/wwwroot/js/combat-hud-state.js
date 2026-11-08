// Presentation-only helpers. Combat and cooldown ownership remain in the authoritative C# simulation.
export function clampHudFraction(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

export function cooldownPresentation(remaining, duration) {
    if (!Number.isFinite(remaining) || !Number.isFinite(duration) || duration <= 0 || remaining <= 0.05) {
        return { readyDegrees: 360, shadeDegrees: 0, text: '', recovering: false };
    }
    const ratio = clampHudFraction(remaining / duration);
    return {
        readyDegrees: Math.round((1 - ratio) * 360),
        shadeDegrees: Math.round(ratio * 360),
        text: remaining >= 10 ? `${Math.ceil(remaining)}s` : `${remaining.toFixed(1)}s`,
        recovering: true,
    };
}

export function selectCombatSlots(spells) {
    const active = Array.isArray(spells) ? spells.filter(spell => spell?.isActive !== false) : [];
    return {
        primary: active.find(spell => !spell.contextual) ?? null,
        defensive: active.find(spell => spell.contextual) ?? null,
    };
}
