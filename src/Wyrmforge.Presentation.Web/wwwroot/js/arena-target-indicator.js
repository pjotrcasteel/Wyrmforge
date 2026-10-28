// LOCKED ART: V3 outer ring is exactly one authored decal.
// School emblems live in separate atlas cells. C# owns the active school,
// target IDs, hitboxes and aim; presentation only paints the selected target.
// Do not redraw or procedurally reinterpret the approved sigil.
const finite = Number.isFinite;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = t => t * t * (3 - 2 * t);
const COLOR = '#d9cfee';

// Atlas cells are independent textures; never bake a school icon into the base.
// Source: user-approved PNGs, downsampled for the mobile renderer.
export const SIGIL_ATLAS = Object.freeze({
    base: [0, 0, 192, 128],
    fire: [192, 0, 96, 96],
    frost: [288, 0, 96, 96],
    storm: [192, 96, 96, 96],
    arcane: [288, 96, 96, 96],
    necromancer: [0, 128, 96, 96],
    summoner: [96, 128, 96, 96],
});

export function resolveSigilSchool(school) {
    switch (String(school ?? '').toLowerCase()) {
        case 'fire':
        case 'pyromancer': return 'fire';
        case 'frost':
        case 'cryomancer': return 'frost';
        case 'storm':
        case 'stormcaller':
        case 'electric': return 'storm';
        case 'death':
        case 'necromancer': return 'necromancer';
        case 'binding':
        case 'summoner': return 'summoner';
        default: return 'arcane';
    }
}

export function preloadTargetSigilArt() {
    if (typeof Image === 'undefined') return null;
    const image = new Image();
    image.decoding = 'async';
    image.src = new URL('../art/target-sigil/atlas.png?v=20261028-locked-v1', import.meta.url).href;
    return image;
}

export function resolveTargetIndicator(snapshot) {
    const player = snapshot?.player;
    if (!player || player.manualAim || snapshot.paused || snapshot.ended) return null;

    if (Number.isInteger(player.aimPropId)) {
        const world = snapshot.world;
        const prop = world && (snapshot.environment?.props ?? [])
            .find(item => item.id === player.aimPropId && item.healthFraction > 0);
        if (!prop || !finite(world.width) || !finite(world.height)) return null;
        return indicator('object', prop.x * world.width, prop.y * world.height, prop.radius);
    }

    if (!Number.isInteger(player.aimTargetId)) return null;
    const enemy = (snapshot.enemies ?? [])
        .find(item => item.entityId === player.aimTargetId && item.healthRatio > 0);
    if (enemy) return indicator('enemy', enemy.x, enemy.y, enemy.radius);

    const dragon = snapshot.dragon;
    if (dragon?.entityId === player.aimTargetId && dragon.health > 0 && dragon.targetable !== false)
        return indicator('boss', dragon.x, dragon.y, dragon.radius);
    return null;
}

function indicator(kind, x, y, radius) {
    if (![x, y, radius].every(finite) || radius <= 0) return null;
    const footprint = Math.min(80, Math.max(16, (radius * 1.7 + (kind === 'boss' ? 20 : 8)) * .5));
    return {
        kind,
        x: Math.round(x),
        y: Math.round(y + radius * (kind === 'object' ? .7 : .75)),
        rx: footprint,
        ry: Math.max(7, Math.round(footprint * .46)),
    };
}

export function presentTargetSigil(state, marker, key, seconds, reducedMotion = false) {
    if (!state || !finite(seconds)) return marker;
    const nextKey = marker ? marker.kind + ':' + String(key) : null;

    if (nextKey !== state.key) {
        if (marker) {
            state.key = nextKey;
            state.enteredAt = seconds;
            state.exitedAt = null;
            state.exitMarker = null;
        } else if (state.key !== null) {
            state.key = null;
            state.exitedAt = seconds;
            state.exitMarker = { ...state.activeMarker, opacity: state.lastOpacity ?? 1 };
        }
    }

    if (marker) {
        state.activeMarker = marker;
        const opacity = reducedMotion ? 1 : smoothstep(clamp((seconds - state.enteredAt) / .23, 0, 1));
        state.lastOpacity = opacity;
        return { ...marker, opacity };
    }

    if (state.exitMarker && state.exitedAt !== null) {
        const progress = reducedMotion ? 1 : smoothstep(clamp((seconds - state.exitedAt) / .26, 0, 1));
        const opacity = state.exitMarker.opacity * (1 - progress);
        if (opacity > .001) return { ...state.exitMarker, opacity };
        state.exitMarker = null;
        state.exitedAt = null;
    }
    return null;
}

export function targetSelectionLightEmitter(marker, frame) {
    if (!marker || !frame || marker.kind === 'object' ||
        !finite(marker.x) || !finite(marker.y)) return null;
    const opacity = clamp(marker.opacity ?? 1, 0, 1);
    if (opacity <= 0) return null;
    const zeroLight = frame.environment?.ambient === 0 && frame.environment?.emission === false &&
        (frame.lights ?? []).every(light => !light.enabled || light.intensity === 0);
    if (zeroLight) return null;

    return {
        id: 'target-selection:underlight',
        ownerId: 'target-selection',
        type: 'point',
        enabled: true,
        position: [marker.x, marker.y + 1, 2],
        direction: [0, 0, -1],
        color: COLOR,
        intensity: (marker.kind === 'boss' ? .34 : .48) * opacity,
        range: Math.min(125, Math.max(48, marker.rx * 1.7)),
        coneAngle: Math.PI / 4,
        penumbra: 0,
        castsShadow: false,
        priority: 1,
    };
}

export function targetSelectionCanvasLight(emitter) {
    if (!emitter) return [];
    return [{
        x: emitter.position[0], y: emitter.position[1],
        radius: emitter.range, strength: emitter.intensity,
        type: 'target-selection', family: 'selection',
        center: [217, 207, 238], edge: [99, 90, 116], surge: false,
    }];
}

// Both pieces render on the GROUND, before depth-sorted actors. The shared
// lighting adapter handles underlight; this only paints authored artwork.
export function drawTargetIndicator(ctx, marker, pass = 'ground', seconds = 0, reducedMotion = false,
    art = null, school = 'arcane') {
    if (!marker || (pass !== 'ground' && pass !== 'contrast') ||
        !art?.complete || art.naturalWidth < 384 || art.naturalHeight < 224) return false;

    const alpha = clamp(marker.opacity ?? 1, 0, 1);
    if (alpha <= 0 || marker.rx <= 0 || marker.ry <= 0) return false;

    const isObject = marker.kind === 'object';
    const pulse = reducedMotion ? 1 : 1 + Math.sin(seconds * 1.9) * .035;

    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.globalAlpha = alpha * (pass === 'ground' ? .18 : (isObject ? .45 : .88) * pulse);

    if (pass === 'ground') {
        // Base material only; never add screen-space spotlights here.
        const [sx, sy, sw, sh] = SIGIL_ATLAS.base;
        ctx.drawImage(art, sx, sy, sw, sh, -marker.rx, -marker.ry, marker.rx * 2, marker.ry * 2);
    } else {
        const [sx, sy, sw, sh] = SIGIL_ATLAS.base;
        ctx.drawImage(art, sx, sy, sw, sh, -marker.rx, -marker.ry, marker.rx * 2, marker.ry * 2);
        const [ix, iy, iw, ih] = SIGIL_ATLAS[resolveSigilSchool(school)];
        const iconRx = marker.rx * .34;
        const iconRy = marker.ry * .52;
        ctx.drawImage(art, ix, iy, iw, ih, -iconRx, -iconRy, iconRx * 2, iconRy * 2);
    }

    ctx.restore();
    return true;
}
