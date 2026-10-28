// LOCKED ART: V3 outer ring is exactly one authored decal.
// School emblems live in separate atlas cells. C# owns the active school,
// target IDs, hitboxes and aim; presentation only paints the selected target.
// Do not redraw or procedurally reinterpret the approved sigil.
const finite = Number.isFinite;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = t => t * t * (3 - 2 * t);
const NEUTRAL_COLOR = '#d9cfee';

// The C# player's active primary school is the only authority. This palette
// recolors the locked V3 PNG; it never replaces the approved rune geometry.
export const SIGIL_SCHOOL_COLORS = Object.freeze({
    fire: '#ff784a',
    frost: '#8bd8ff',
    storm: '#ffd665',
    arcane: '#c497ff',
    necromancer: '#8cdb80',
    summoner: '#6cdbc9',
});
const tintedArtCache = new WeakMap();

function rgb(hex) {
    return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}

// One-time atlas pixel transform: preserve the source's alpha, details,
// highlights, and all seven independent atlas rectangles.
export function tintSigilPixels(pixels, school) {
    const color = SIGIL_SCHOOL_COLORS[resolveSigilSchool(school)];
    if (!color || resolveSigilSchool(school) === 'arcane') return pixels;
    const [red, green, blue] = rgb(color);
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) continue;
        const value = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) / 255;
        const brightness = .20 + value * .80;
        const highlight = Math.max(0, (value - .72) / .28) * .15;
        for (let channel = 0; channel < 3; channel++) {
            const target = [red, green, blue][channel];
            pixels[i + channel] = Math.min(255, Math.round(target * brightness + (255 - target) * highlight));
        }
    }
    return pixels;
}

function artForSchool(art, school) {
    const key = resolveSigilSchool(school);
    if (!key || key === 'arcane' || typeof document === 'undefined') return art;
    let cache = tintedArtCache.get(art);
    if (!cache) {
        cache = new Map();
        tintedArtCache.set(art, cache);
    }
    if (cache.has(key)) return cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = art.naturalWidth;
    canvas.height = art.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return art;
    context.drawImage(art, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    tintSigilPixels(pixels.data, key);
    context.putImageData(pixels, 0, 0);
    cache.set(key, canvas);
    return canvas;
}

// Atlas cells are independent textures; never bake a school icon into the base.
// Source: user-approved PNGs, downsampled for the mobile renderer.
export const SIGIL_ATLAS = Object.freeze({
    base: [0, 0, 128, 85],
    fire: [128, 0, 64, 64],
    frost: [192, 0, 64, 64],
    storm: [128, 64, 64, 64],
    arcane: [192, 64, 64, 64],
    necromancer: [0, 128, 64, 64],
    summoner: [64, 128, 64, 64],
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
        default: return null; // Missing/unknown C# school must not impersonate Arcane.
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
    // A combat-readability floor keeps the approved ring legible beneath Hollowed silhouettes.
    // Bosses scale independently so their marker does not become an oversized telegraph.
    const boss = kind === 'boss';
    const footprint = Math.min(boss ? 92 : 68,
        Math.max(boss ? 52 : 32, (radius * 1.7 + (boss ? 20 : 8)) * (boss ? .7 : .98)));
    return {
        kind,
        x: Math.round(x),
        y: Math.round(y + radius * (kind === 'object' ? .7 : .95)),
        rx: footprint,
        ry: Math.max(15, Math.round(footprint * .56)),
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
        // Fast retargeting must not leave a short-lived enemy permanently half-faded.
        const opacity = reducedMotion ? 1 : smoothstep(clamp((seconds - state.enteredAt) / .12, 0, 1));
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

export function targetSelectionLightEmitter(marker, frame, school) {
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
        color: SIGIL_SCHOOL_COLORS[resolveSigilSchool(school)] ?? NEUTRAL_COLOR,
        intensity: (marker.kind === 'boss' ? .66 : .90) * opacity,
        range: Math.min(155, Math.max(65, marker.rx * 1.9)),
        coneAngle: Math.PI / 4,
        penumbra: 0,
        castsShadow: false,
        priority: 1,
    };
}

export function targetSelectionCanvasLight(emitter) {
    if (!emitter) return [];
    const center = rgb(emitter.color);
    return [{
        x: emitter.position[0], y: emitter.position[1],
        radius: emitter.range, strength: emitter.intensity,
        type: 'target-selection', family: 'selection',
        center, edge: center.map(channel => Math.round(channel * .44)), surge: false,
    }];
}

// Both pieces render on the GROUND, before depth-sorted actors. The shared
// lighting adapter handles underlight; this only paints authored artwork.
export function drawTargetIndicator(ctx, marker, pass = 'ground', seconds = 0, reducedMotion = false,
    art = null, school = null) {
    if (!marker || (pass !== 'ground' && pass !== 'contrast') ||
        !art?.complete || art.naturalWidth < 256 || art.naturalHeight < 192) return false;

    const alpha = clamp(marker.opacity ?? 1, 0, 1);
    if (alpha <= 0 || marker.rx <= 0 || marker.ry <= 0) return false;

    const activeSchool = resolveSigilSchool(school);
    const selectedArt = artForSchool(art, activeSchool);
    const isObject = marker.kind === 'object';
    const pulse = reducedMotion ? 1 : 1 + Math.sin(seconds * 1.9) * .035;

    ctx.save();
    ctx.translate(marker.x, marker.y);
    // The atlas is intentional pixel art; bilinear shrinking erased its thin rune strokes.
    ctx.imageSmoothingEnabled = false;
    // Preserve the approved texture: improve visibility with opacity and additive
    // compositing, not new runes, circles, procedural glow or another light engine.
    ctx.globalAlpha = alpha * (pass === 'ground' ? .48 : Math.min(1, (isObject ? .72 : 1) * pulse));
    if (pass === 'contrast') ctx.globalCompositeOperation = 'screen';

    if (pass === 'ground') {
        // Base material only; never add screen-space spotlights here.
        const [sx, sy, sw, sh] = SIGIL_ATLAS.base;
        ctx.drawImage(selectedArt, sx, sy, sw, sh, -marker.rx, -marker.ry, marker.rx * 2, marker.ry * 2);
    } else {
        const [sx, sy, sw, sh] = SIGIL_ATLAS.base;
        ctx.drawImage(selectedArt, sx, sy, sw, sh, -marker.rx, -marker.ry, marker.rx * 2, marker.ry * 2);
        if (activeSchool) {
            const [ix, iy, iw, ih] = SIGIL_ATLAS[activeSchool];
            const iconRx = marker.rx * .34;
            const iconRy = marker.ry * .52;
            ctx.drawImage(selectedArt, ix, iy, iw, ih, -iconRx, -iconRy, iconRx * 2, iconRy * 2);
        }
    }

    ctx.restore();
    return true;
}
