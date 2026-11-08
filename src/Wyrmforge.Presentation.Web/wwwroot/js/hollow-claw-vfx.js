// Hollowed claw visual profile. Source frames are the PVFX Foundry strict shadow-claw,
// remapped pixel-for-pixel to Wyrmforge's ink / dead-flesh / cold-bone palette.
// This reads the existing Hollowed attack animation; it never creates damage or an attack.
const ATLAS_URL = new URL('../art/vfx/hollowed-claw-strict.png', import.meta.url);
export const HOLLOW_CLAW = Object.freeze({ cell: 56, frames: 12, start: 0.36, duration: 0.36 });
const DIRECTIONS = Object.freeze({ E: 0, SE: Math.PI / 4, S: Math.PI / 2, SW: Math.PI * 3 / 4,
    W: Math.PI, NW: -Math.PI * 3 / 4, N: -Math.PI / 2, NE: -Math.PI / 4 });
let atlas = null;
let loading = null;

export function preloadHollowClawVfx() {
    if (atlas) return Promise.resolve(true);
    if (loading) return loading;
    if (typeof Image === 'undefined') return Promise.resolve(false);
    loading = new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            const valid = image.naturalWidth === HOLLOW_CLAW.cell * 8 &&
                image.naturalHeight === HOLLOW_CLAW.cell * 2;
            if (valid) atlas = image;
            else loading = null;
            resolve(valid);
        };
        image.onerror = () => { loading = null; resolve(false); };
        image.src = ATLAS_URL.href;
    });
    return loading;
}

// The animation is contact-driven presentation today; a claw trail means a swing,
// NEVER a confirmed player hit. The current C# contact-DPS implementation is untouched.
export function hollowClawFrame(pose, reducedMotion = false) {
    if (pose?.clip !== 'attack' || !Number.isFinite(pose.attackAt) ||
        !Number.isFinite(pose.age) || !Object.hasOwn(DIRECTIONS, pose.direction)) return -1;
    const elapsed = pose.age - pose.attackAt;
    if (elapsed < HOLLOW_CLAW.start || elapsed >= HOLLOW_CLAW.start + HOLLOW_CLAW.duration) return -1;
    // Only one restrained frame is visible briefly with reduced-motion enabled.
    if (reducedMotion) return elapsed >= 0.48 && elapsed < 0.55 ? 4 : -1;
    return Math.min(HOLLOW_CLAW.frames - 1,
        Math.floor((elapsed - HOLLOW_CLAW.start) / HOLLOW_CLAW.duration * HOLLOW_CLAW.frames));
}

// Drawn at the actor's depth, after its body, before terrain occlusion. The passed enemy
// already has its authoritative Z projection from the shared Arena renderer.
export function drawHollowClawVfx(ctx, enemy, hollowState, reducedMotion = false) {
    if (!atlas || Number(enemy?.kind) !== 0) return false;
    const pose = hollowState?.entities?.get(enemy.entityId);
    const frame = hollowClawFrame(pose, reducedMotion);
    if (frame < 0) return false;
    const angle = DIRECTIONS[pose.direction];
    const radius = Math.max(7, Number(enemy.radius) || 11);
    const size = Math.min(70, radius * 4.7);
    const x = enemy.x + Math.cos(angle) * radius * 1.45;
    const y = enemy.y - radius * 3.65 + Math.sin(angle) * radius * 0.45;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.drawImage(atlas, (frame % 8) * HOLLOW_CLAW.cell, Math.floor(frame / 8) * HOLLOW_CLAW.cell,
        HOLLOW_CLAW.cell, HOLLOW_CLAW.cell, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
}
