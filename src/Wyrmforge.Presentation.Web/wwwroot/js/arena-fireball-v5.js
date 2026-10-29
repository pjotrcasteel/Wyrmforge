// Art-only compatibility adapter: reuse the existing 2D Hunt projectile renderer.
// No new light, shadow, collider, damage, burn event, or second rendering engine.
// PR #332 owns the later universal GPU-lit material integration.
export const FIREBALL_V5_FRAME_COUNT = 16;
export const FIREBALL_V5_FRAME_SIZE = Object.freeze([120, 72]);
export const FIREBALL_V5_ANCHOR = Object.freeze([87, 36]);
const CADENCE_SECONDS = .083;
const CORE_RADIUS_PIXELS = 14;
const ALBEDO_URL = new URL('../art/fireball-v5-albedo.png?v=5dd7e083e79a', import.meta.url);
const EMISSIVE_URL = new URL('../art/fireball-v5-emissive.png?v=0c56b5f00bae', import.meta.url);
let albedo = null;
let emissive = null;
let loading = null;

function readSheet(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image.naturalWidth === 1920 && image.naturalHeight === 72 ? image : null);
        image.onerror = () => resolve(null);
        image.src = url.href;
    });
}

export function preloadFireballV5() {
    if (typeof Image === 'undefined') return Promise.resolve(false);
    return loading ??= Promise.all([readSheet(ALBEDO_URL), readSheet(EMISSIVE_URL)])
        .then(([a, e]) => { albedo = a; emissive = e; return Boolean(a && e); })
        .catch(() => false);
}

// Global cosmetic clock, not C# simulation time. Source ID decorrelates nearby projectiles.
export function fireballV5Frame(seconds, sourceId, reducedMotion = false) {
    if (reducedMotion) return 0;
    const clock = Number.isFinite(seconds) ? seconds : 0;
    const offset = Number.isSafeInteger(sourceId) && sourceId > 0 ? sourceId % FIREBALL_V5_FRAME_COUNT : 0;
    return (((Math.floor(clock / CADENCE_SECONDS) + offset) % FIREBALL_V5_FRAME_COUNT)
        + FIREBALL_V5_FRAME_COUNT) % FIREBALL_V5_FRAME_COUNT;
}

// The caller has already translated/rotated to the real C# projectile.
// No synthetic world lights or visual-only projectile trajectories.
export function drawFireballV5(ctx, projectile, seconds = 0, reducedMotion = false) {
    if (projectile?.spell !== 1 || projectile.combination === 0 || !albedo || !emissive) return false;
    const r = Math.max(4, Math.min(19, Number(projectile.radius) || 7));
    const scale = r / CORE_RADIUS_PIXELS;
    const frame = fireballV5Frame(seconds, projectile.fireballSourceId, reducedMotion);
    const sourceX = frame * FIREBALL_V5_FRAME_SIZE[0];
    const x = -FIREBALL_V5_ANCHOR[0] * scale;
    const y = -FIREBALL_V5_ANCHOR[1] * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(albedo, sourceX, 0, 120, 72, x, y, 120 * scale, 72 * scale);
    // The emissive channel is the artist's visible pixel color on the legacy
    // Canvas, NOT a dynamic light source. PR #332 owns actual illumination.
    ctx.drawImage(emissive, sourceX, 0, 120, 72, x, y, 120 * scale, 72 * scale);
    ctx.restore();
    return true;
}

export function installFireballV5ForTesting(a, e) { albedo = a; emissive = e; }
export function resetFireballV5ForTesting() { albedo = null; emissive = null; loading = null; }
