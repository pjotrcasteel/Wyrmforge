// Hollowed internal ember sockets and attack flare. Presentation only.
// The actual eyes/mouth/wounds are source-authored emissive pixels in the
// no-cape Blender actor; this file provides LIGHT ONLY through the existing
// universal emitter contract. Never fake sockets with a second Canvas glow.
import { withHollowFractureLightingFrame } from './hollow-fracture.js';

export const HOLLOW_FIRE_COLOR = '#f78132';
export const HOLLOW_FIRE_MAX_LIGHTS = 5;
const ATTACK_SECONDS = 16 / 12;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function hollowAttackFireEnvelope(pose) {
    if (!pose || pose.attackAt == null || !Number.isFinite(pose.age) ||
        !Number.isFinite(pose.attackAt) || pose.clip !== 'attack') return 0;
    const t = (pose.age - pose.attackAt) / ATTACK_SECONDS;
    if (t < 0 || t >= 1) return 0;
    // The source-authored reach/impact peaks in the middle; recovery fades
    // before the 16-frame clip ends. No timing/damage/combat state edits.
    return t < .20 ? t / .20 :
        t < .50 ? 1 :
        clamp((.90 - t) / .40, 0, 1);
}

export function hollowFireEmitters(enemies, state, elapsed = 0, reducedMotion = false, viewport = null) {
    if (!state?.entities || !Number.isFinite(elapsed)) return [];
    const candidates = [];
    for (const enemy of enemies ?? []) {
        if (Number(enemy.kind) !== 0 || !Number.isSafeInteger(enemy.entityId) ||
            !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y) ||
            !(Number(enemy.radius) > 0) || !(Number(enemy.healthRatio) > 0) ||
            !(Number(enemy.opacity ?? 1) > 0)) continue;
        const pose = state.entities.get(enemy.entityId);
        if (!pose) continue;
        const attack = hollowAttackFireEnvelope(pose);
        const radius = clamp(Number(enemy.radius) * (attack > .01 ? 8.5 : 4.0), 26, 150);
        const x = enemy.x, y = enemy.y - enemy.radius * (pose.signature?.includes('crawler') ? .28 : 1.15);
        if (viewport && (x + radius < viewport.x || x - radius > viewport.x + viewport.width ||
            y + radius < viewport.y || y - radius > viewport.y + viewport.height)) continue;
        // Ember glow is always low. Attack reuses the same owner/ID rather
        // than multiplying light sources and shadow passes on mobile.
        const flicker = reducedMotion ? 1 : 1 + .045 * Math.sin(elapsed * 7 + enemy.entityId * .53);
        const intensity = clamp((.085 + .48 * attack) * flicker * (enemy.frozen ? .45 : 1), .01, .60);
        candidates.push({
            id:`hollow-inner-fire:${enemy.entityId}`,
            ownerId:`hollowed:${enemy.entityId}`,
            type:'point',enabled:true,
            position:[x, y, enemy.radius * .65],
            direction:[0,0,-1],color:HOLLOW_FIRE_COLOR,
            intensity,range:radius,coneAngle:Math.PI/4,
            penumbra:0,castsShadow:false,priority:attack > .01 ? 3 : 1,
        });
    }
    // Prefer the active attack then nearby bodies; this is a deterministic,
    // bounded renderer budget, NOT a gameplay change or new light algorithm.
    return candidates.sort((a,b) => b.priority-a.priority ||
        b.intensity-a.intensity || a.id.localeCompare(b.id)).slice(0,HOLLOW_FIRE_MAX_LIGHTS);
}

export function hollowFireCanvasLights(emitters, frame) {
    // Same zero-light gate and single immutable frame as the GPU renderer.
    if (!frame || withHollowFractureLightingFrame(frame,emitters) === frame) return [];
    return (emitters??[]).map(source=>({
        x:source.position[0],y:source.position[1],
        radius:source.range,strength:source.intensity,
        type:'hollow-inner-fire',family:'fire',
        center:[247,129,50],edge:[123,40,19],surge:false,
    }));
}
