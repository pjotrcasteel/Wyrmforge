// Presentation-only helpers. Combat and cooldown ownership remain in the authoritative C# simulation.
export function clampHudFraction(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}


/** Fixed-size pixel art is revealed from bottom to top; it is never resized with HP. */
export function healthCrystalPresentation(health, maxHealth) {
    const fraction = clampHudFraction(Number.isFinite(maxHealth) && maxHealth > 0 ? health / maxHealth : 0);
    return {
        fraction,
        unfilledPercent: Math.round((1 - fraction) * 10000) / 100,
        state: fraction <= .25 ? 'critical' : fraction <= .55 ? 'wounded' : 'healthy',
    };
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
