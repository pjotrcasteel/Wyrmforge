// Renderer-neutral snapshot validation and deterministic light budgeting.
const finite = (value, name, min = -Infinity, max = Infinity) => {
    if (!Number.isFinite(value) || value < min || value > max) throw new TypeError(`Invalid ${name}`);
};
const vector = (value, name) => {
    if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`Invalid ${name}`);
    value.forEach(n => finite(n, name));
};
const color = value => { if (!/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError('Expected sRGB #rrggbb'); };
function unique(items, name) {
    if (!Array.isArray(items)) throw new TypeError(`Invalid ${name}`);
    const ids = new Set();
    for (const item of items) {
        if (!item.id || typeof item.id !== 'string' || ids.has(item.id)) throw new TypeError(`Duplicate/missing ${name} ID`);
        ids.add(item.id);
    }
    return ids;
}
/** @param {import('./contracts').LightingSnapshot} input */
export function validateSnapshot(input) {
    const s = structuredClone(input);
    if (s.version !== 1) throw new TypeError('Unsupported lighting snapshot version');
    finite(s.time, 'time', 0);
    unique(s.lights, 'light');
    const materials = unique(s.materials, 'material');
    unique(s.objects, 'object');
    for (const l of s.lights) {
        if (!['point', 'spot', 'directional'].includes(l.type)) throw new TypeError('Unsupported light type');
        if (!l.ownerId || typeof l.enabled !== 'boolean' || typeof l.castsShadow !== 'boolean') throw new TypeError('Invalid light state');
        vector(l.position, 'position'); vector(l.direction, 'direction'); color(l.color);
        if (l.type !== 'point' && Math.hypot(...l.direction) === 0) throw new TypeError('Zero light direction');
        finite(l.intensity, 'intensity', 0); finite(l.range, 'range', .01); finite(l.priority, 'priority');
        finite(l.coneAngle, 'coneAngle', .01, Math.PI / 2); finite(l.penumbra, 'penumbra', 0, 1);
        if (l.expiresAt !== undefined) finite(l.expiresAt, 'expiresAt', 0);
    }
    for (const m of s.materials) {
        color(m.color); color(m.emission);
        for (const field of ['roughness', 'metalness', 'specular', 'alphaCutoff']) finite(m[field], field, 0, 1);
        finite(m.emissionIntensity, 'emissionIntensity', 0);
        // G3 optional physically motivated material controls; omitted fields retain G1 behavior.
        for (const field of ['aoIntensity', 'normalScale', 'foliageTransmission', 'wetness'])
            if (m[field] !== undefined) finite(m[field], field, 0, field === 'normalScale' ? 4 : 1);
        for (const field of ['albedo', 'normal', 'roughnessMap', 'aoMap', 'emissiveMap', 'reflectionProbe'])
            if (m[field] !== undefined && (typeof m[field] !== 'string' || !m[field].trim()))
                throw new TypeError(`Invalid ${field}`);
        if (m.blendMode !== undefined && !['cutout', 'alpha', 'additive'].includes(m.blendMode))
            throw new TypeError('Unsupported world material blend mode');
        if (!['off', 'direct', 'probe'].includes(m.reflection)) throw new TypeError('Unsupported reflection tier');
        if (m.reflection === 'probe' && !m.reflectionProbe) throw new TypeError('Probe reflection requires a texture ID');
    }
    for (const o of s.objects) {
        if (!materials.has(o.material) || !o.geometry || !o.ownerId) throw new TypeError('Unresolved renderable');
        vector(o.position, 'position'); vector(o.rotation, 'rotation'); vector(o.scale, 'scale');
        if (o.scale.some(n => n <= 0)) throw new TypeError('Nonpositive scale');
        for (const key of ['occluderPosition', 'occluderRotation', 'occluderScale']) {
            if (o[key] === undefined) continue;
            if (!o.occluderGeometry) throw new TypeError('Caster transform requires occluder geometry');
            vector(o[key], key);
        }
        if (o.occluderScale?.some(n => n <= 0)) throw new TypeError('Nonpositive occluder scale');
        if (o.occluderAlphaSource !== undefined &&
            (typeof o.occluderAlphaSource !== 'boolean' || !o.occluderGeometry))
            throw new TypeError('Invalid caster alpha mode');
        for (const flag of ['castsShadow', 'receivesLight', 'receivesShadow'])
            if (typeof o[flag] !== 'boolean') throw new TypeError(`Missing ${flag}`);
        if (o.frame) for (const key of ['offset', 'repeat']) {
            if (o.frame[key]?.length !== 2) throw new TypeError('Invalid atlas frame');
            o.frame[key].forEach(n => finite(n, 'atlas frame', 0, 1));
        }
    }
    finite(s.environment.ambient, 'ambient', 0); finite(s.environment.exposure, 'exposure', .01, 10);
    color(s.environment.color);
    if (s.environment.fog !== undefined) {
        const fog = s.environment.fog;
        if (!fog || typeof fog !== 'object') throw new TypeError('Invalid fog');
        color(fog.color);
        finite(fog.near, 'fog near', 0);
        finite(fog.far, 'fog far', 0);
        if (fog.far <= fog.near) throw new TypeError('Fog far must exceed near');
    }
    if (typeof s.environment.emission !== 'boolean') throw new TypeError('Invalid emission switch');
    return s;
}
/** Renderer-owned, screen-aware relevance within a C#-authored priority tier. */
export function lightViewContribution(light, view) {
    if (!view) return 0;
    for (const key of ['minX', 'maxX', 'minY', 'maxY']) finite(view[key], 'light view');
    if (view.minX > view.maxX || view.minY > view.maxY) throw new RangeError('Invalid light view bounds');
    if (light.type === 'directional') return Number.POSITIVE_INFINITY;

    const [x, y] = light.position;
    const outsideX = Math.max(view.minX - x, 0, x - view.maxX);
    const outsideY = Math.max(view.minY - y, 0, y - view.maxY);
    const spill = Math.max(0, 1 - Math.hypot(outsideX, outsideY) / light.range);
    if (spill === 0) return 0;

    // Prioritize a source that actually illuminates more of the visible world.
    // Per-source intensity, range and projected location are data, not asset types.
    const centerX = (view.minX + view.maxX) / 2;
    const centerY = (view.minY + view.maxY) / 2;
    const distance = Math.hypot(x - centerX, y - centerY) / light.range;
    return light.intensity * spill / (1 + distance * distance);
}

export function selectLights(snapshot, shadowViews = 8, maxLights = 8, view = null) {
    const active = snapshot.lights.filter(l => l.enabled && l.intensity > 0 &&
        (l.expiresAt === undefined || l.expiresAt > snapshot.time));
    // A camera-aware budget is only used by renderers that explicitly supply a
    // view. Isolated lighting labs preserve their original ID-stable selection.
    const contribution = view ? new Map(active.map(light => [light.id, lightViewContribution(light, view)])) : null;
    const selected = active.filter(light => !contribution || contribution.get(light.id) > 0)
        .sort((a, b) => b.priority - a.priority ||
            (contribution ? contribution.get(b.id) - contribution.get(a.id) : 0) ||
            a.id.localeCompare(b.id));
    let remaining = shadowViews;
    return selected.slice(0, maxLights).map(light => {
        const cost = light.type === 'point' ? 6 : 1;
        const shadow = light.castsShadow && cost <= remaining;
        if (shadow) remaining -= cost;
        return { ...light, shadow, shadowViews: shadow ? cost : 0 };
    });
}
export function environmentProfile(mode, localHour = new Date().getHours()) {
    if (!['day', 'night', 'auto', 'zero'].includes(mode)) throw new TypeError('Unknown environment');
    const day = mode === 'day' || mode === 'auto' && localHour >= 7 && localHour < 19;
    return { ambient: mode === 'zero' ? 0 : day ? .55 : .012,
        color: day ? '#c2d0de' : '#8c9cbb', exposure: 1, emission: mode !== 'zero' };
}


/** Conservative XY range culling before light-budget selection. Directional lights are unbounded. */
export function lightsIntersectingView(lights, bounds) {
    const { left, top, right, bottom } = bounds;
    if (![left, top, right, bottom].every(Number.isFinite) || right < left || bottom < top)
        throw new TypeError('Invalid light view bounds');
    return lights.filter(light => {
        if (light.type === 'directional') return true;
        const [x, y] = light.position;
        const dx = Math.max(left - x, 0, x - right);
        const dy = Math.max(top - y, 0, y - bottom);
        return dx * dx + dy * dy <= light.range * light.range;
    });
}
