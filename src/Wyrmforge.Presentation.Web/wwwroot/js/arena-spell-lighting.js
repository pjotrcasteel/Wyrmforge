import { spellFamily } from './arena-spell-vfx.js';

// The authoritative C# cast/projectile/impact snapshots determine every light's location,
// rank, combination and Surge. The entire light rig is cosmetic: no physics or RNG writes.
const palette = {
    fire:      { center: [248, 163, 104], edge: [178, 83, 42] },
    frost:     { center: [184, 232, 244], edge: [92, 154, 177] },
    storm:     { center: [251, 241, 172], edge: [145, 164, 196] },
    arcane:    { center: [207, 160, 246], edge: [118, 78, 169] },
    frostfire: { center: [246, 177, 124], edge: [118, 184, 208] },
};
const maximumLights = 6;

function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }

export function spellLightProfile(spell, combination = null) {
    const family = spellFamily(spell, combination);
    return { family, ...palette[family] };
}

function flicker(family, elapsed, reducedMotion) {
    if (reducedMotion) return 1;
    if (family === 'storm') return .42 + .58 * Math.pow(Math.sin(elapsed * 25 + .6), 2);
    if (family === 'fire' || family === 'frostfire') return .85 + .1 * Math.sin(elapsed * 11) + .05 * Math.sin(elapsed * 21);
    if (family === 'arcane') return .88 + .12 * Math.sin(elapsed * 4);
    return 1; // Frost is steady, sharp cold light.
}

export function buildSpellLights(snapshot, elapsed = 0, reducedMotion = false, viewport = null) {
    if (!snapshot) return [];
    const candidates = [];
    const add = (state, type, strength, radius) => {
        if (!state || !Number.isFinite(state.x) || !Number.isFinite(state.y)) return;
        const rank = clamp(Number(state.rank) || 1, 1, 3);
        const profile = spellLightProfile(state.spell, state.combination);
        const surge = state.surge === true;
        const intensity = strength * (1 + (rank - 1) * .13) * (surge ? 1.4 : 1)
            * flicker(profile.family, elapsed, reducedMotion);
        const angle = Number(state.angle) || 0;
        const offset = type === 'cast' ? 20 + rank * 3 : 0;
        candidates.push({ x: state.x + Math.cos(angle) * offset, y: state.y + Math.sin(angle) * offset,
            radius: radius + rank * 15 + (surge ? 42 : 0), strength: clamp(intensity, 0, 1.4), type, surge, ...profile });
    };

    const cast = snapshot.castMotion;
    if (cast && Number(cast.progress) < 1)
        add(cast, 'cast', .47 * (1 - clamp(Number(cast.progress) || 0, 0, 1)), 78);
    for (const projectile of snapshot.projectiles ?? []) add(projectile, 'projectile', .35, 66);
    for (const impact of snapshot.elementalImpacts ?? [])
        add(impact, 'impact', .8 * (1 - clamp(Number(impact.progress) || 0, 0, 1)), 106);

    // Bound the worst-case cost when several projectiles and impacts overlap on mobile.
    // Impact gets priority over an older projectile only when it is visibly brighter.
    return candidates.filter(light => !viewport ||
        (light.x + light.radius >= viewport.x && light.x - light.radius <= viewport.x + viewport.width &&
         light.y + light.radius >= viewport.y && light.y - light.radius <= viewport.y + viewport.height))
        .sort((a, b) => b.strength - a.strength).slice(0, maximumLights);
}

export function sampleSpellLight(lights, x, y) {
    let best = null;
    let strongest = 0;
    for (const light of lights ?? []) {
        const distance = Math.hypot(x - light.x, y - light.y);
        if (distance >= light.radius) continue;
        const falloff = 1 - distance / light.radius;
        const intensity = light.strength * falloff * falloff;
        if (intensity <= strongest) continue;
        best = light;
        strongest = intensity;
    }
    return best ? { intensity: clamp(strongest, 0, 1), color: best.center, sourceX: best.x, sourceY: best.y,
        family: best.family, surge: best.surge } : null;
}

export function drawSpellLightSpill(ctx, lights, camera, surface = 'terrain') {
    if (!lights?.length) return 0;
    let painted = 0;
    const width = camera.width;
    const height = camera.height;
    const margin = 4;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const light of lights) {
        const r = light.radius;
        if (light.x + r < camera.x - margin || light.y + r < camera.y - margin ||
            light.x - r > camera.x + width + margin || light.y - r > camera.y + height + margin) continue;

        const alpha = clamp(light.strength * (surface === 'terrain' ? .24 : .10), 0, .3);
        if (alpha <= .006) continue;
        const rgb = light.center;
        const edge = light.edge;
        const gradient = ctx.createRadialGradient(light.x, light.y, 3, light.x, light.y, r);
        gradient.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
        gradient.addColorStop(.28, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * .62})`);
        gradient.addColorStop(.68, `rgba(${edge[0]},${edge[1]},${edge[2]},${alpha * .18})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(light.x - r, light.y - r, r * 2, r * 2);
        painted++;
    }
    ctx.restore();
    return painted;
}
