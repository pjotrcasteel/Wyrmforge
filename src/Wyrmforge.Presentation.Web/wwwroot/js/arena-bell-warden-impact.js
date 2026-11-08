// Authored, recoloured PVFX Foundry frames. C# owns impact time, terrain height and damaging ring radius.
const ATLAS_URL = new URL('../art/vfx/bell-warden-slam-atlas.webp', import.meta.url);
const SLAM = Object.freeze({ width: 128, height: 64, pivotX: 64, pivotY: 44, frames: 19, offsetY: 0, frameMs: 70 });
const SHATTER = Object.freeze({ width: 64, height: 56, pivotX: 30, pivotY: 44, frames: 18, offsetY: 192, frameMs: 60 });
let atlas = null;
let pending = null;

export function preloadBellWardenImpact() {
    if (atlas) return Promise.resolve(true);
    if (pending) return pending;
    if (typeof Image === 'undefined') return Promise.resolve(false);
    pending = new Promise(resolve => {
        const image = new Image();
        image.onload = () => { atlas = image; resolve(true); };
        image.onerror = () => { pending = null; resolve(false); };
        image.src = ATLAS_URL.href;
    });
    return pending;
}

export function bellWardenImpactFrames(wave, reducedMotion = false) {
    // Missing age means an older snapshot: never replay a fresh impact every render frame.
    const age = Number(wave?.ageSeconds);
    if (!Number.isFinite(age) || wave?.ageSeconds == null || age < 0) return { slam: -1, shatter: -1 };
    if (reducedMotion) return { slam: age < 0.25 ? 3 : -1, shatter: -1 };
    return {
        slam: age < SLAM.frames * SLAM.frameMs / 1000 ? Math.floor(age * 1000 / SLAM.frameMs) : -1,
        shatter: age < SHATTER.frames * SHATTER.frameMs / 1000 ? Math.floor(age * 1000 / SHATTER.frameMs) : -1,
    };
}

function drawFrame(ctx, image, sheet, frame, x, y, scaleX, scaleY) {
    if (frame < 0) return;
    const sourceX = frame % 8 * sheet.width;
    const sourceY = sheet.offsetY + Math.floor(frame / 8) * sheet.height;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(image, sourceX, sourceY, sheet.width, sheet.height,
        -sheet.pivotX, -sheet.pivotY, sheet.width, sheet.height);
    ctx.restore();
}

/** Cosmetic ground impact at C#'s exact smash centre, never a damage or terrain instruction. */
export function drawBellWardenImpact(ctx, wave, reducedMotion = false) {
    if (!atlas || !wave) return;
    const frames = bellWardenImpactFrames(wave, reducedMotion);
    if (frames.slam < 0 && frames.shatter < 0) return;
    const x = Number(wave.x);
    const y = Number(wave.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    // The caller translates the ground effect to its C# terrain elevation.
    drawFrame(ctx, atlas, SLAM, frames.slam, x, y, 1.75, 1.35);
    drawFrame(ctx, atlas, SHATTER, frames.shatter, x, y, 1.8, 1.6);
}
