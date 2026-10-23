// WyrmForge Arena V2 L0-L2: presentation-only world lighting and grounded sprite depth.
// Reusable pure plans; NO DOM dependency, gameplay RNG, geometry or collision.
// World coordinates match the existing approved ground and sprite foot anchors.
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;

export function resolveSceneLighting(input = {}) {
    return Object.freeze({
        enabled: input.enabled === true,
        ambient: clamp(finite(input.ambient, .24), 0, .5),
        sunDegrees: ((finite(input.sunDegrees, 315) % 360) + 360) % 360,
        shadows: input.shadows !== false,
    });
}

export function contactShadowPlan(anchor, trunkWidth, lighting) {
    const profile = resolveSceneLighting(lighting);
    if (!profile.enabled || !profile.shadows ||
        !Number.isFinite(anchor?.x) || !Number.isFinite(anchor?.y) ||
        !Number.isFinite(trunkWidth) || trunkWidth <= 0) return null;
    const angle = profile.sunDegrees * Math.PI / 180;
    const w = clamp(trunkWidth, 8, 110);
    // Light vector points toward the light; projected shadow points away.
    return Object.freeze({
        x: anchor.x - Math.cos(angle) * w * .18,
        y: anchor.y - Math.sin(angle) * w * .12,
        radiusX: w * .78,
        radiusY: w * .33,
        opacity: clamp(.16 + profile.ambient * .3, .16, .31),
    });
}

// A broad, low-opacity projected shape is separate from tight root occlusion.
// Art-directed widths/heights, not alpha bounding boxes, drive the footprint.
// The cast shape is intentionally very soft: it must not cover attack telegraphs.
export function projectedShadowPlan(anchor, trunkWidth, spriteHeight, lighting) {
    const profile = resolveSceneLighting(lighting);
    if (!profile.enabled || !profile.shadows ||
        !Number.isFinite(anchor?.x) || !Number.isFinite(anchor?.y) ||
        !Number.isFinite(trunkWidth) || trunkWidth <= 0 ||
        !Number.isFinite(spriteHeight) || spriteHeight <= 0) return null;
    const angle = profile.sunDegrees * Math.PI / 180;
    const cast = clamp(spriteHeight * .26, 16, 84);
    const dx = -Math.cos(angle), dy = -Math.sin(angle) * .55;
    return Object.freeze({
        x: anchor.x + dx * cast * .55,
        y: anchor.y + dy * cast * .55,
        radiusX: clamp(cast * .70 + trunkWidth * .52, 12, 105),
        radiusY: clamp(trunkWidth * .43, 5, 44),
        opacity: clamp(.065 + profile.ambient * .08, .065, .105),
        rotation: Math.atan2(dy, dx),
    });
}

export function drawContactShadow(ctx, plan) {
    if (!ctx || !plan) return false;
    ctx.save();
    ctx.translate(plan.x, plan.y);
    if (Number.isFinite(plan.rotation)) ctx.rotate(plan.rotation);
    ctx.scale(plan.radiusX, plan.radiusY);
    const radial = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    radial.addColorStop(0, 'rgba(8,12,10,' + plan.opacity.toFixed(3) + ')');
    radial.addColorStop(.37, 'rgba(8,12,10,' + (plan.opacity * .5).toFixed(3) + ')');
    radial.addColorStop(1, 'rgba(8,12,10,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    return true;
}

// Composite after ground AND objects so both receive the same global ambient.
// Lighting is world-anchored, never regenerated in viewport/pointer coordinates.
// This is an L1 approximation, not a normal-map shader or full lighting engine.
export function drawSceneLighting(ctx, world, lighting) {
    const light = resolveSceneLighting(lighting);
    if (!ctx || !light.enabled || !Number.isFinite(world?.width) ||
        !Number.isFinite(world?.height) || world.width <= 0 || world.height <= 0) return false;
    ctx.save();
    ctx.fillStyle = 'rgba(11,23,28,' + (light.ambient * .70).toFixed(3) + ')';
    ctx.fillRect(0, 0, world.width, world.height);
    const radians = light.sunDegrees * Math.PI / 180;
    const radius = Math.hypot(world.width, world.height) * .5;
    const cx = world.width * .5, cy = world.height * .5;
    const dx = Math.cos(radians) * radius, dy = Math.sin(radians) * radius;
    const gradient = ctx.createLinearGradient(cx + dx, cy + dy, cx - dx, cy - dy);
    gradient.addColorStop(0, 'rgba(230,216,192,0.066)');
    gradient.addColorStop(.45, 'rgba(220,212,190,0.022)');
    gradient.addColorStop(1, 'rgba(7,15,19,0.095)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.restore();
    return true;
}

// Pure foot-sorting contract: canopy image bounds must NEVER become colliders.
export function sortSpritesByFoot(sprites) {
    return [...sprites].filter(s => s && Number.isFinite(s.foot?.y))
        .sort((a, b) => a.foot.y - b.foot.y || String(a.id).localeCompare(String(b.id)));
}
