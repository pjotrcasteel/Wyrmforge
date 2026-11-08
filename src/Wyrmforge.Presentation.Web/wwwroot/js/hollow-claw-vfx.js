// Hollowed claw visual profile. Source frames are the PVFX Foundry strict shadow-claw,
// remapped pixel-for-pixel to Wyrmforge's ink / dead-flesh / cold-bone palette.
// This reads the existing Hollowed attack animation; it never creates damage or an attack.
const ATLAS_URL = new URL('../art/vfx/hollowed-claw-strict.png', import.meta.url);
export const HOLLOW_CLAW = Object.freeze({ cell: 56, frames: 12, start: 0.47, duration: 0.30 });
const DIRECTIONS = Object.freeze({ E: 0, SE: Math.PI / 4, S: Math.PI / 2, SW: Math.PI * 3 / 4,
    W: Math.PI, NW: -Math.PI * 3 / 4, N: -Math.PI / 2, NE: -Math.PI / 4 });
// Wrist keys are copied from the approved Hollowed attack rig's right-hand trajectory
// (tools/sprite-lab/build-hollow-attack.py). The contact sweep is frames 6–8 at 12fps.
// Distances are Blender metres; projection uses the current 93px/1.55m runtime scale.
const CLAW_WRIST = Object.freeze([
    { frame: 5, side: -0.29, forward: -0.025, height: 0.46 },
    { frame: 7, side: -0.09, forward: 0.34, height: 0.21 },
    { frame: 8, side: 0.11, forward: 0.33, height: 0.04 },
    { frame: 10, side: 0.22, forward: 0.16, height: -0.05 },
]);

function interpolateWrist(attackFrame) {
    const progress = Math.max(CLAW_WRIST[0].frame,
        Math.min(CLAW_WRIST[CLAW_WRIST.length - 1].frame, attackFrame));
    const after = CLAW_WRIST.findIndex(point => point.frame >= progress);
    if (after <= 0) return CLAW_WRIST[0];
    const previous = CLAW_WRIST[after - 1], next = CLAW_WRIST[after];
    const t = (progress - previous.frame) / (next.frame - previous.frame);
    return { side: previous.side + (next.side - previous.side) * t,
        forward: previous.forward + (next.forward - previous.forward) * t,
        height: previous.height + (next.height - previous.height) * t };
}

// Align the effect to the moving right claw, not a fixed overhead point. The
// downward and inward registration puts the visible trail around the actual fingers
// rather than hovering above the wrist; the forward offset leads its strike.
export function hollowClawAnchor(enemy, pose) {
    const angle = DIRECTIONS[pose?.direction];
    if (!enemy || !pose || angle === undefined || !Number.isFinite(pose.age) ||
        !Number.isFinite(pose.attackAt)) return null;
    const wrist = interpolateWrist((pose.age - pose.attackAt) * 12);
    const radius = Math.max(7, Number(enemy.radius) || 11);
    const actorScale = Math.max(.85, Math.min(1.15, Number(pose.visualScale) || 1));
    const pxPerMetre = 93 / 1.55 * radius / 11 * actorScale;
    // The strict-grid atlas has its visible claw pixels biased ahead of its
    // cell center. Register the sweep near the actual hand, not out ahead of it.
    // Keep the forward motion from the Blender wrist path, at a shorter reach.
    const reach = wrist.forward * pxPerMetre * 0.55 - radius * 0.35;
    const sideways = wrist.side * pxPerMetre;
    return { x: enemy.x + reach * Math.cos(angle) - sideways * Math.sin(angle),
        y: enemy.y + reach * Math.sin(angle) * 0.42 + sideways * Math.cos(angle) * 0.18 -
            (wrist.height + .2) * pxPerMetre + radius * 0.9 };
}

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
    const injured = pose.armVariant === 'broken-arm-right';
    const size = Math.min(70, radius * (injured ? 4.0 : 4.7));
    const anchor = hollowClawAnchor(enemy, pose);
    if (!anchor) return false;
    const { x, y } = anchor;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.drawImage(atlas, (frame % 8) * HOLLOW_CLAW.cell, Math.floor(frame / 8) * HOLLOW_CLAW.cell,
        HOLLOW_CLAW.cell, HOLLOW_CLAW.cell, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
}
