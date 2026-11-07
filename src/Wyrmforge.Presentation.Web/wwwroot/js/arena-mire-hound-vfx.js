// Mire Hound VFX sourced from the owner's PVFX Foundry archive.
// C# owns the windup, locked charge, collision and recovery; art never creates attacks.
const ATLAS_URL = new URL('../art/vfx/mire-hound-atlas.png', import.meta.url);
const DUST = Object.freeze({ width: 68, height: 32, pivotX: 24, pivotY: 28, frames: 13, y: 0 });
const CONTACT = Object.freeze({ width: 48, height: 40, pivotX: 17, pivotY: 21, frames: 11, y: 64 });
let atlas = null;
let loading = null;

export function preloadMireHoundVfx() {
    if (atlas) return Promise.resolve(true);
    if (loading) return loading;
    if (typeof Image === 'undefined') return Promise.resolve(false);
    loading = new Promise(resolve => {
        const image = new Image();
        image.onload = () => { atlas = image; resolve(true); };
        image.onerror = () => { loading = null; resolve(false); };
        image.src = ATLAS_URL.href;
    });
    return loading;
}

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

// Every frame follows an authoritative C# phase, never an inferred hit.
export function mireHoundDustFrame(effect) {
    if (!effect) return -1;
    const progress = clamp01(effect.progress);
    switch (effect.phase) {
        case 'Windup': return progress < .7 ? -1 : Math.min(3, Math.floor((progress - .7) / .3 * 4));
        case 'Pounce': return Math.min(10, 4 + Math.floor(progress * 7));
        case 'Recover': return Math.min(DUST.frames - 1, Math.floor(progress * DUST.frames));
        default: return -1;
    }
}

export function mireHoundContactFrame(effect) {
    return effect?.phase === 'Recover' && effect.pounceLanded === true
        ? Math.min(CONTACT.frames - 1, Math.floor(clamp01(effect.progress) * CONTACT.frames)) : -1;
}

function drawAtlasFrame(ctx, image, sheet, frame, x, y, scaleX, scaleY) {
    if (!image || frame < 0) return;
    const sx = frame % 8 * sheet.width;
    const sy = sheet.y + Math.floor(frame / 8) * sheet.height;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(image, sx, sy, sheet.width, sheet.height,
        -sheet.pivotX, -sheet.pivotY, sheet.width, sheet.height);
    ctx.restore();
}

// Dust is anchored to the actor's feet, already raised by C# terrain height.
export function drawMireHoundGround(ctx, enemy, reducedMotion = false) {
    if (Number(enemy?.kind) !== 1 || !atlas) return;
    const effect = enemy.mireHoundVfx;
    const frame = mireHoundDustFrame(effect);
    if (frame < 0) return;
    const dx = Number(effect.directionX) || 0;
    const dy = Number(effect.directionY) || 0;
    const x = enemy.x - dx * enemy.radius * .75;
    const y = enemy.y - dy * enemy.radius * .3;
    const flip = dx > 0 ? -1 : 1;
    drawAtlasFrame(ctx, atlas, DUST, reducedMotion ? Math.min(frame, 4) : frame, x, y, flip * .9, .62);
}

// Actor-depth contact burst, only when C# reports an actual connected pounce.
// The passed actor has already been raised from its ground coordinates.
export function drawMireHoundContact(ctx, enemy, reducedMotion = false) {
    if (Number(enemy?.kind) !== 1 || !atlas) return;
    const effect = enemy.mireHoundVfx;
    const frame = mireHoundContactFrame(effect);
    if (frame < 0) return;
    const dx = Number(effect.directionX) || 0;
    const dy = Number(effect.directionY) || 0;
    const x = enemy.x + dx * enemy.radius * .65;
    const y = enemy.y - enemy.radius * .6 + dy * enemy.radius * .3;
    drawAtlasFrame(ctx, atlas, CONTACT, reducedMotion ? Math.min(frame, 3) : frame,
        x, y, dx < 0 ? -.85 : .85, .85);
}
