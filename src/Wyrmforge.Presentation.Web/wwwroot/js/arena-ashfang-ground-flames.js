// Ashfang breath burns C#-owned physical patches. This module cannot create or expand a hazard.
const ATLAS_URL = new URL('../art/vfx/ashfang-ground-flames.webp', import.meta.url);
const SIZE = Object.freeze({ width: 64, height: 40, pivotX: 32, pivotY: 33, columns: 8, frames: 16, frameMs: 75 });
const TAU = Math.PI * 2;
let atlas = null;
let pending = null;

export function preloadAshfangGroundFlames() {
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

export function ashfangGroundFireFrame(patch, reducedMotion = false) {
    if (patch?.burning !== true) return -1;
    const age = Number(patch.ageSeconds);
    if (!Number.isFinite(age) || age < 0) return -1;
    if (reducedMotion) return 4;
    const phaseOffset = Math.abs(Math.trunc(Number(patch.id) || 0)) % SIZE.frames;
    return (Math.floor(age * 1000 / SIZE.frameMs) + phaseOffset) % SIZE.frames;
}

/** Source-authored 2.5D ground flames. Gameplay collision uses the full-radius circular outline, not the stylised oval artwork. */
export function drawAshfangGroundFires(ctx, snapshot, reducedMotion = false) {
    for (const patch of snapshot?.ashfangGroundFires ?? []) {
        const x = Number(patch.x), y = Number(patch.y) - (Number(patch.z) || 0), radius = Number(patch.radius);
        if (![x, y, radius].every(Number.isFinite) || radius <= 0) continue;
        const age = Math.max(0, Number(patch.ageSeconds) || 0);
        const hot = patch.burning === true;
        const hotSeconds = Number(patch.hotSeconds) || 2.75;
        const visibleSeconds = Math.max(hotSeconds + 0.01, Number(patch.visibleSeconds) || 9);
        const cooledOpacity = Math.max(0, Math.min(1, (visibleSeconds - age) / (visibleSeconds - hotSeconds)));
        const fuel = String(patch.fuel || 'dryorganic');
        const frame = ashfangGroundFireFrame(patch, reducedMotion);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(x), Math.round(y));
        ctx.fillStyle = hot ? 'rgba(36, 15, 17, 0.72)' : 'rgba(32, 27, 29, 0.34)';
        ctx.globalAlpha = hot ? 1 : cooledOpacity;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.87, radius * 0.55, 0, 0, TAU);
        ctx.fill();

        // The bright outline is the EXACT C# damaging radius. It disappears when the patch stops hurting.
        if (hot) {
            ctx.strokeStyle = fuel === 'damporganic' ? 'rgba(221, 111, 72, 0.76)'
                : fuel === 'wood' ? 'rgba(255, 171, 83, 0.95)' : 'rgba(246, 119, 58, 0.86)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, TAU);
            ctx.stroke();
            if (atlas && frame >= 0) {
                const scale = radius / 34 * (fuel === 'wood' ? 1.24 : fuel === 'damporganic' ? .78 : 1);
                const sourceX = (frame % SIZE.columns) * SIZE.width;
                const sourceY = Math.floor(frame / SIZE.columns) * SIZE.height;
                ctx.globalAlpha = fuel === 'damporganic' ? .65 : .95;
                ctx.drawImage(atlas, sourceX, sourceY, SIZE.width, SIZE.height,
                    -SIZE.pivotX * scale, -SIZE.pivotY * scale, SIZE.width * scale, SIZE.height * scale);
                drawAshfangGroundCinders(ctx, patch, radius, age, fuel, reducedMotion);
            } else {
                // A truthful hot footprint remains visible during asset loading, without dynamic textures.
                ctx.fillStyle = 'rgba(217, 83, 41, 0.42)';
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 0.68, radius * 0.36, 0, 0, TAU);
                ctx.fill();
                drawAshfangGroundCinders(ctx, patch, radius, age, fuel, reducedMotion);
            }
        } else {
            // Cold charcoal is a non-damaging scar, never mistaken for a burning hazard.
            ctx.strokeStyle = 'rgba(104, 78, 72, 0.34)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.72, radius * 0.38, 0, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    }
}


// A handful of deterministic, whole-pixel embers; no GPU uploads, random noise, or world texture changes.
function drawAshfangGroundCinders(ctx, patch, radius, seconds, fuel, reducedMotion) {
    if (reducedMotion) return;
    const count = fuel === 'wood' ? 8 : fuel === 'damporganic' ? 2 : 5;
    const rise = fuel === 'wood' ? 36 : 23;
    const seed = (Number(patch.id) || 0) * 1.37;
    for (let index = 0; index < count; index++) {
        const phase = (seconds * .92 + index * .173 + seed * .021) % 1;
        const sway = Math.sin(index * 12.9898 + seed) * radius * .43;
        ctx.globalAlpha = .72 * (1 - phase);
        ctx.fillStyle = index % 3 === 0 ? '#f4bc72' : '#c85b35';
        ctx.fillRect(Math.round(sway + Math.sin(phase * 4 + index) * 3),
            Math.round(-8 - phase * rise + Math.cos(index * 3.4) * 5), 2, 2);
    }
}
