// A single cosmetic Hollowed hit profile; C# damage-number records are authoritative.
// Source: PVFX Foundry blood-splat strict, recolored to Wyrmforge's gothic palette.
// Never infer damage from proximity, attack animation or the hit-flash boolean.
const ATLAS_URL = new URL('../art/vfx/hollowed-hit-gothic-pal.png', import.meta.url);
export const HOLLOW_HIT = Object.freeze({ cellWidth: 64, cellHeight: 60, frames: 8, feedbackSeconds: .8 });
let atlas = null;
let loading = null;

export function preloadHollowHitVfx() {
    if (atlas) return Promise.resolve(true);
    if (loading) return loading;
    if (typeof Image === 'undefined') return Promise.resolve(false);
    loading = new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            const valid = image.naturalWidth === HOLLOW_HIT.cellWidth * HOLLOW_HIT.frames &&
                image.naturalHeight === HOLLOW_HIT.cellHeight;
            if (valid) atlas = image;
            else loading = null;
            resolve(valid);
        };
        image.onerror = () => { loading = null; resolve(false); };
        image.src = ATLAS_URL.href;
    });
    return loading;
}

// The target ID and amount come directly from C# health-damage feedback.
// A blocked hit has no positive damage record; damage-over-time has periodic=true.
export function hollowHitFrame(number, reducedMotion = false) {
    if (!number || !Number.isSafeInteger(number.targetId) || number.targetId <= 0 ||
        number.isDragon || number.periodic || !Number.isFinite(number.amount) || number.amount <= 0 ||
        !Number.isFinite(number.progress) || number.progress < 0) return -1;
    const duration = number.heavy || number.finisher ? .36 : .28;
    const elapsed = number.progress * HOLLOW_HIT.feedbackSeconds;
    if (elapsed >= duration) return -1;
    if (reducedMotion) return elapsed < .10 ? 3 : -1;
    return Math.min(HOLLOW_HIT.frames - 1, Math.floor(elapsed / duration * HOLLOW_HIT.frames));
}

// Called from the same depth-sorted actor pass as the Hollowed sprite, in Canvas
// or GPU captures. A maximum of two short bursts per actor prevents noise in packs.
export function drawHollowHitVfx(ctx, enemy, numbers, reducedMotion = false) {
    if (!atlas || Number(enemy?.kind) !== 0 || !Array.isArray(numbers)) return 0;
    const radius = Math.max(6, Number(enemy.radius) || 11);
    let rendered = 0;
    for (let index = numbers.length - 1; index >= 0 && rendered < 2; index--) {
        const number = numbers[index];
        if (number?.targetId !== enemy.entityId) continue;
        const frame = hollowHitFrame(number, reducedMotion);
        if (frame < 0) continue;
        const forceful = Boolean(number.heavy || number.finisher);
        const width = Math.round(Math.min(60, radius * (forceful ? 3.7 : 2.85)));
        const height = Math.round(width * HOLLOW_HIT.cellHeight / HOLLOW_HIT.cellWidth);
        // Pin the strike to the upper torso; never the mage's face or the
        // damage text, which C# intentionally floats above the shoulders.
        const x = Math.round(enemy.x - width / 2);
        const y = Math.round(enemy.y - radius * 1.45 - height * 0.51);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(atlas, frame * HOLLOW_HIT.cellWidth, 0, HOLLOW_HIT.cellWidth, HOLLOW_HIT.cellHeight,
            x, y, width, height);
        ctx.restore();
        rendered++;
    }
    return rendered;
}