// H4 Hollowed death impact. Read-only C# deathBursts are the ONLY trigger.
// The 24-frame approved Blender death/fracture and authored 4-frame deaths stay
// untouched. Reuse the already-decoded gothic H2 hit + H3 ground sprite sheets.
import { drawHollowDeathSplatFrame, hollowHitAtlasReady } from './hollow-hit-vfx.js?v=20261108-hollow-hit-h2';
import { drawHollowDeathDustFrame, hollowGroundAtlasReady, hollowGroundMaterial, HOLLOW_GROUND } from './hollow-ground-vfx.js?v=20261108-hollow-h3';

export const HOLLOW_DEATH_VFX = Object.freeze({
    burstSeconds: .26, bloodSeconds: .30, dustSeconds: .36,
    authoredContact: .54, fractureContact: .38, collapseContact: .78,
    expireSeconds: 1.45, maxTracked: 32, maxRendered: 16,
});

export function createHollowDeathVfxState() {
    return { clock: 0, events: new Map(), confirmedDeaths: 0 };
}

// Register once by the authoritative C# death identity. The same snapshot may
// be delivered many times while a 0.26s burst lives; it is NOT a new kill.
export function updateHollowDeathVfx(state, snapshot, clock, authored, corpses) {
    if (!Number.isFinite(clock)) return;
    if (clock < state.clock) {
        state.events.clear();
        state.confirmedDeaths = 0;
    }
    state.clock = clock;
    for (const [id, event] of state.events)
        if (clock - event.at >= HOLLOW_DEATH_VFX.expireSeconds) state.events.delete(id);
    for (const death of snapshot?.deathBursts ?? []) {
        if (Number(death.kind) !== 0 || !Number.isSafeInteger(death.entityId) ||
            death.entityId <= 0 || state.events.has(death.entityId) ||
            !Number.isFinite(death.x) || !Number.isFinite(death.y)) continue;
        const corpse = corpses?.get?.(`${death.entityId}:0`);
        const style = authored ? 'authored' : corpse?.deathStyle === 'fracture' ? 'fracture' : 'collapse';
        const progress = Number.isFinite(death.progress) ? Math.max(0, Math.min(1, death.progress)) : 0;
        state.events.set(death.entityId, {
            id: death.entityId, x: death.x, y: death.y,
            radius: Math.max(6, Math.min(25, Number(death.bodyRadius) || 11)),
            style, at: clock - progress * HOLLOW_DEATH_VFX.burstSeconds,
        });
        state.confirmedDeaths++;
        if (state.events.size > HOLLOW_DEATH_VFX.maxTracked)
            state.events.delete(state.events.keys().next().value);
    }
}

export function hollowDeathContact(event) {
    return event?.style === 'authored' ? HOLLOW_DEATH_VFX.authoredContact
        : event?.style === 'fracture' ? HOLLOW_DEATH_VFX.fractureContact
        : HOLLOW_DEATH_VFX.collapseContact;
}

// This pass goes after GPU composition but before the night veil. It never
// reads/writes the terrain cache, changes Z, or invents an additional corpse.
// The low, source-art dust is allowed to overlap the fallen body's feet.
export function drawHollowDeathGroundVfx(ctx, state, terrainFrame, band = 0, reducedMotion = false) {
    let drawn = 0;
    for (const event of state.events.values()) {
        if (drawn >= HOLLOW_DEATH_VFX.maxRendered * 2) break;
        const elapsed = state.clock - event.at - hollowDeathContact(event);
        if (elapsed < 0 || elapsed >= HOLLOW_DEATH_VFX.dustSeconds ||
            (reducedMotion && elapsed >= .12)) continue;
        const material = hollowGroundMaterial(terrainFrame, event.x, event.y);
        if (material === 'lava') continue;
        const frame = reducedMotion ? 3
            : Math.min(HOLLOW_GROUND.frames - 1, Math.floor(elapsed / HOLLOW_DEATH_VFX.dustSeconds * HOLLOW_GROUND.frames));
        const fracture = event.style === 'fracture';
        const strength = (material === 'stone' ? .24 : material === 'ash' ? .53 : band > 0 ? .50 : .43) *
            (fracture ? .83 : 1) * (1 - elapsed / HOLLOW_DEATH_VFX.dustSeconds);
        const span = event.radius * .44;
        // Two source-authored pixel puffs, no random bones, rings, or glowing outlines.
        if (drawHollowDeathDustFrame(ctx, material, event.x - span, event.y,
            frame, Math.round(event.radius * (fracture ? 2.8 : 3.2)), strength)) drawn++;
        if (drawHollowDeathDustFrame(ctx, material, event.x + span, event.y,
            frame, Math.round(event.radius * 2.65), strength * .8)) drawn++;
    }
    return drawn;
}

// A death-verified final splat, restrained enough to stay in the H2 palette.
// Return zero if the asset is not ready so the existing generic death cue can
// remain visible as a graceful fallback instead of hiding the death entirely.
export function drawHollowDeathAccentVfx(ctx, state, reducedMotion = false) {
    let drawn = 0;
    for (const event of state.events.values()) {
        if (drawn >= HOLLOW_DEATH_VFX.maxRendered) break;
        const elapsed = state.clock - event.at;
        if (elapsed < 0 || elapsed >= HOLLOW_DEATH_VFX.bloodSeconds ||
            (reducedMotion && elapsed >= .11)) continue;
        const frame = reducedMotion ? 3 : Math.min(7,
            Math.floor(elapsed / HOLLOW_DEATH_VFX.bloodSeconds * 8));
        const opacity = (1 - elapsed / HOLLOW_DEATH_VFX.bloodSeconds) *
            (event.style === 'fracture' ? .85 : event.style === 'authored' ? .65 : .76);
        if (drawHollowDeathSplatFrame(ctx, event.x, event.y, event.radius, frame, opacity)) drawn++;
    }
    return drawn;
}

export function hollowDeathVfxDiagnostics(state) {
    return { confirmedDeaths: state.confirmedDeaths, activeImpacts: state.events.size,
        styles: [...state.events.values()].map(event => ({ id: event.id, style: event.style,
            age: state.clock - event.at, contact: hollowDeathContact(event) })) };
}


/** Hide the obsolete white circular death ring only when approved H2/H3 art is decoded. */
export function hollowDeathArtReady() {
    return hollowHitAtlasReady() || hollowGroundAtlasReady();
}
