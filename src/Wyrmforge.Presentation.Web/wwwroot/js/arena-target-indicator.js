// Tactical selection feedback lives in presentation only. The C# aim target IDs,
// not pointer position or renderer heuristics, are the single source of truth.
// Objects are matched by registered prop ID, never by their current art/kind.
const finite = value => Number.isFinite(value);

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
    // Readable at 320px mobile width; respects each target's C# collision size.
    const footprint = Math.min(160, Math.max(32, radius * 1.7 + (kind === 'boss' ? 20 : 8)));
    return {
        kind,
        x: Math.round(x),
        y: Math.round(y + radius * (kind === 'object' ? .7 : .75)),
        rx: footprint,
        ry: Math.max(13, Math.round(footprint * .46)),
    };
}

// Target selection is an in-world magical seal, not an attack telegraph.
// All schools and object kinds share the same desaturated, near-ivory ink.
const SIGIL_COLOR = '#d9cfee';

// Small hand-drawn Futhark-inspired strokes, not text characters or a font.
// Normalized coordinates keep glyphs legible on high-DPI mobile canvases.
const RUNES = Object.freeze([
    [[-0.45, -1, -0.45, 1], [-0.45, -.85, .55, -.48], [-.45, -.15, .45, .15]],
    [[-.5, -1, -.5, 1], [-.5, -1, .48, -.1], [.48, -.1, -.5, .18]],
    [[-.52, -1, .48, 1], [.48, -1, -.52, 1]],
    [[0, -1, 0, 1], [-.65, -.5, 0, -.05], [.65, -.5, 0, -.05]],
    [[-.5, -1, .52, -.15], [.52, -.15, -.5, .6], [-.5, .6, .5, 1]],
    [[-.55, -.9, .5, -.9], [0, -.9, 0, 1], [-.48, -.25, .45, -.25]],
    [[-.55, -1, -.55, 1], [-.55, -.1, .53, -.1], [.53, -.1, .53, .8]],
    [[-.5, -1, .5, 1], [.5, -1, -.5, 1], [0, -.55, 0, .6]],
]);

// A rune CIRCLE rather than a broken targeting reticle: concentric, unbroken
// ground-plane inscriptions bound actual runes. Geometry remains school-neutral.
function strokeRuneBorders(ctx, rx, ry, inner = true) {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (inner) {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * .62, ry * .62, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function strokeRuneDividers(ctx, rx, ry, count) {
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
        const angle = (i + .5) * Math.PI * 2 / count;
        ctx.moveTo(Math.cos(angle) * rx * .67, Math.sin(angle) * ry * .67);
        ctx.lineTo(Math.cos(angle) * rx * .72, Math.sin(angle) * ry * .72);
    }
    ctx.stroke();
}

function strokeRune(ctx, rune, size) {
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of rune) {
        ctx.moveTo(x1 * size, y1 * size);
        ctx.lineTo(x2 * size, y2 * size);
    }
    ctx.stroke();
}

function drawRuneInscriptions(ctx, marker) {
    const { rx, ry, kind } = marker;
    const count = kind === 'boss' ? 12 : kind === 'object' ? 4 : 8;
    const size = Math.min(6.5, Math.max(3.3, rx * .145));
    const offset = .18;
    for (let index = 0; index < count; index++) {
        const angle = -Math.PI + offset + (index + .5) * (Math.PI * 2 / count);
        const x = Math.cos(angle) * rx * .83;
        const y = Math.sin(angle) * ry * .81;
        // A narrower glyph height follows the foreshortened ground plane.
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, .72);
        strokeRune(ctx, RUNES[index % RUNES.length], size);
        ctx.restore();
    }
}

// The selection light is ONE standard emitter within the shared GPU frame.
// Its CURRENT Canvas compatibility view comes from the existing arena spell
// light-spill/night adapters; this module never paints an independent light.
// Explicit G1/G5 zero-light validation keeps every world pixel unlit.
export function targetSelectionLightEmitter(marker, frame) {
    if (!marker || !frame || marker.kind === 'object' ||
        !Number.isFinite(marker.x) || !Number.isFinite(marker.y)) return null;
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
        color: SIGIL_COLOR,
        intensity: boss ? .34 : .48,
        range: Math.min(125, Math.max(48, marker.rx * 1.25)),
        coneAngle: Math.PI / 4,
        penumbra: 0,
        castsShadow: false,
        priority: 1,
    };
}

// Bridge the SAME emitter, without a second lighting algorithm, to the
// existing Canvas Hunt adapter while G5's universal GPU integration lands.
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

export function drawTargetIndicator(ctx, marker, pass = 'ground', seconds = 0, reducedMotion = false) {
    if (!marker || (pass !== 'ground' && pass !== 'contrast')) return;

    const isObject = marker.kind === 'object';
    const baseAlpha = isObject ? .35 : marker.kind === 'boss' ? .66 : .62;
    const breath = reducedMotion || !Number.isFinite(seconds) ? 1 : 1 + Math.sin(seconds * .9) * .035;
    const count = marker.kind === 'boss' ? 12 : isObject ? 4 : 8;

    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.strokeStyle = SIGIL_COLOR;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pass === 'ground') {
        ctx.globalAlpha = baseAlpha * .45;
        ctx.lineWidth = 1.8;
        strokeRuneBorders(ctx, marker.rx, marker.ry, true);
    } else {
        // This pass must be executed BEFORE all actor/depth sprites; never above them.
        // Visibility is supplied by the SAME physical point emitter and night mask.
        ctx.globalAlpha = Math.min(.72, baseAlpha * breath);
        ctx.shadowColor = 'rgba(210,197,240,.15)';
        ctx.shadowBlur = isObject ? .8 : 1.8;
        ctx.lineWidth = 1.15;
        strokeRuneBorders(ctx, marker.rx, marker.ry, true);
        ctx.shadowBlur = 0;
        ctx.lineWidth = .85;
        strokeRuneDividers(ctx, marker.rx, marker.ry, count);
        ctx.lineWidth = 1;
        drawRuneInscriptions(ctx, marker);

        if (marker.kind === 'boss') {
            ctx.globalAlpha *= .45;
            ctx.beginPath();
            ctx.ellipse(0, 0, marker.rx * .42, marker.ry * .42, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    ctx.restore();
}
