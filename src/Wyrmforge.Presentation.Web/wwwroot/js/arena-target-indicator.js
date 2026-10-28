// Tactical selection remains presentation-only: C# owns all targeting IDs.
// V3 is one small, school-neutral WyrmForge combat sigil; its animated ink
// is not a separate light source, shader, or combat authority.
const finite = Number.isFinite;
const TAU = Math.PI * 2;
const COLOR = '#d9cfee';
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smoothstep = t => t * t * (3 - 2 * t);

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
    // Half the approved PR #388 footprint, including the mobile minimum.
    const footprint = Math.min(80, Math.max(16, (radius * 1.7 + (kind === 'boss' ? 20 : 8)) * .5));
    return {
        kind,
        x: Math.round(x),
        y: Math.round(y + radius * (kind === 'object' ? .7 : .75)),
        rx: footprint,
        ry: Math.max(7, Math.round(footprint * .46)),
    };
}

// Presentation-only transition state, owned by each arena (never global).
// A removed target gets a real fade-out; swapping targets starts a new fade-in.
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
        if (opacity > 0.001) return { ...state.exitMarker, opacity };
        state.exitMarker = null;
        state.exitedAt = null;
    }
    return null;
}

// Hand-drawn, Futhark-inspired rune strokes. No font loading or Unicode fallback.
const RUNES = Object.freeze([
    [[-.45,-1,-.45,1],[-.45,-.85,.55,-.48],[-.45,-.15,.45,.15]],
    [[-.5,-1,-.5,1],[-.5,-1,.48,-.1],[.48,-.1,-.5,.18]],
    [[-.52,-1,.48,1],[.48,-1,-.52,1]],
    [[0,-1,0,1],[-.65,-.5,0,-.05],[.65,-.5,0,-.05]],
    [[-.5,-1,.52,-.15],[.52,-.15,-.5,.6],[-.5,.6,.5,1]],
    [[-.55,-.9,.5,-.9],[0,-.9,0,1],[-.48,-.25,.45,-.25]],
    [[-.55,-1,-.55,1],[-.55,-.1,.53,-.1],[.53,-.1,.53,.8]],
    [[-.5,-1,.5,1],[.5,-1,-.5,1],[0,-.55,0,.6]],
]);

function ring(ctx, radius) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
}

function glyph(ctx, rune, size) {
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of rune) {
        ctx.moveTo(x1 * size, y1 * size);
        ctx.lineTo(x2 * size, y2 * size);
    }
    ctx.stroke();
}

function runeBand(ctx, radius, count, rotation) {
    const size = clamp(radius * .11, 2, 5.6);
    ctx.save();
    ctx.rotate(rotation);
    ctx.lineWidth = clamp(radius * .035, .65, 1);
    for (let index = 0; index < count; index++) {
        const angle = -Math.PI / 2 + (index + .5) * TAU / count;
        ctx.save();
        ctx.translate(Math.cos(angle) * radius * .785, Math.sin(angle) * radius * .785);
        ctx.rotate(angle + Math.PI / 2);
        glyph(ctx, RUNES[index % RUNES.length], size);
        ctx.restore();
    }
    ctx.restore();
}

function compass(ctx, radius) {
    ctx.lineWidth = clamp(radius * .035, .65, 1.2);
    for (let index = 0; index < 4; index++) {
        const angle = index * Math.PI / 2;
        ctx.save();
        ctx.rotate(angle);
        const width = radius * .09;
        ctx.beginPath();
        ctx.moveTo(radius * .64, -width);
        ctx.lineTo(radius * .99, 0);
        ctx.lineTo(radius * .64, width);
        ctx.lineTo(radius * .73, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
}

function crest(ctx, radius) {
    // Shared geometric Wyrmforge flame/diamond emblem; neutral to spell school.
    const size = radius * .34;
    ctx.lineWidth = clamp(radius * .055, .85, 1.7);
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.32);
    ctx.lineTo(size * .41, -size * .48);
    ctx.lineTo(size * .18, -size * .07);
    ctx.lineTo(size * .58, -size * .3);
    ctx.lineTo(size * .44, size * .47);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * .44, size * .47);
    ctx.lineTo(-size * .58, -size * .3);
    ctx.lineTo(-size * .18, -size * .07);
    ctx.lineTo(-size * .41, -size * .48);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -size * .56);
    ctx.lineTo(size * .19, size * .22);
    ctx.lineTo(0, size * .62);
    ctx.lineTo(-size * .19, size * .22);
    ctx.closePath();
    ctx.stroke();
}

function motes(ctx, radius, seconds, reducedMotion) {
    // Four inexpensive decorative glints. All ink is painted in the ground pass
    // before actors, so particles cannot draw through a character silhouette.
    ctx.fillStyle = COLOR;
    for (let i = 0; i < 4; i++) {
        const phase = reducedMotion ? .55 : (seconds * .19 + i * .31) % 1;
        const angle = i * 2.39996 + .7;
        const distance = radius * (.17 + phase * .62);
        const size = clamp(radius * .035, .55, 1.2);
        ctx.globalAlpha = (1 - phase) * .48;
        ctx.fillRect(Math.cos(angle) * distance, Math.sin(angle) * distance, size, size);
    }
}

// The same single point emitter used by the shared lighting frame.
// Fades in/out with the ink, including on retarget and target loss.
export function targetSelectionLightEmitter(marker, frame) {
    if (!marker || !frame || marker.kind === 'object' ||
        !finite(marker.x) || !finite(marker.y)) return null;
    const opacity = clamp(marker.opacity ?? 1, 0, 1);
    if (opacity <= 0) return null;
    const zeroLight = frame.environment?.ambient === 0 && frame.environment?.emission === false &&
        (frame.lights ?? []).every(light => !light.enabled || light.intensity === 0);
    if (zeroLight) return null;

    const boss = marker.kind === 'boss';
    return {
        id: 'target-selection:underlight',
        ownerId: 'target-selection',
        type: 'point',
        enabled: true,
        position: [marker.x, marker.y + 1, 2],
        direction: [0, 0, -1],
        color: COLOR,
        intensity: (boss ? .34 : .48) * opacity,
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
        x: emitter.position[0],
        y: emitter.position[1],
        radius: emitter.range,
        strength: emitter.intensity,
        type: 'target-selection',
        family: 'selection',
        center: [217, 207, 238],
        edge: [99, 90, 116],
        surge: false,
    }];
}

// Both passes are drawn BEFORE all actors and occluders by arena.js.
// The radial gradient changes only glyph/inscription opacity; it does NOT
// simulate a new world light (that is exclusively the shared emitter above).
export function drawTargetIndicator(ctx, marker, pass = 'ground', seconds = 0, reducedMotion = false) {
    if (!marker || (pass !== 'ground' && pass !== 'contrast')) return;
    const alpha = clamp(marker.opacity ?? 1, 0, 1);
    if (alpha <= 0 || marker.rx <= 0 || marker.ry <= 0) return;
    const radius = marker.rx;
    const boss = marker.kind === 'boss';
    const isObject = marker.kind === 'object';
    const count = boss ? 12 : isObject ? 4 : 8;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(seconds * 1.9) * .055;
    const rotation = reducedMotion ? 0 : seconds * .085;

    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.scale(1, marker.ry / radius);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const ink = ctx.createRadialGradient(0, 0, radius * .05, 0, 0, radius);
    ink.addColorStop(0, 'rgba(217,207,238,1)');
    ink.addColorStop(.5, 'rgba(217,207,238,1)');
    ink.addColorStop(.72, 'rgba(217,207,238,.85)');
    ink.addColorStop(.94, 'rgba(217,207,238,.23)');
    ink.addColorStop(1, 'rgba(217,207,238,0)');
    ctx.strokeStyle = ink;
    ctx.shadowColor = 'rgba(174,112,247,.64)';

    if (pass === 'ground') {
        // Low-contrast ambient inscription haze, no separate Canvas light pool.
        ctx.globalAlpha = alpha * (isObject ? .14 : .27);
        ctx.shadowBlur = clamp(radius * .18, 2, 8);
        ctx.lineWidth = clamp(radius * .11, 1.6, 4);
        ring(ctx, radius * .65);
        ctx.lineWidth = clamp(radius * .065, 1.1, 2.4);
        ring(ctx, radius * .86);
    } else {
        ctx.globalAlpha = alpha * (isObject ? .46 : .83) * pulse;
        ctx.shadowBlur = clamp(radius * .12, 1.4, 5);
        ctx.lineWidth = clamp(radius * .048, .85, 1.7);
        ring(ctx, radius * .88);
        ring(ctx, radius * .63);
        ctx.shadowBlur = clamp(radius * .09, 1, 3.5);
        compass(ctx, radius);
        ctx.shadowBlur = 0;
        runeBand(ctx, radius, count, rotation);
        // The central emblem is the strongest part: outer strokes vanish,
        // inward geometry stays fully opaque in the ink gradient.
        ctx.shadowBlur = clamp(radius * .14, 1.5, 5);
        crest(ctx, radius);
        ctx.shadowBlur = 0;
        if (boss) {
            ctx.lineWidth = .65;
            ring(ctx, radius * .43);
        }
        ctx.globalAlpha = alpha;
        motes(ctx, radius, seconds, reducedMotion);
    }
    ctx.restore();
}
