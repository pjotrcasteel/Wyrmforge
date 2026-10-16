// Bestiary portraits: the idle frame of each creature from the actor atlas, drawn pixel-crisp.
// Unmet creatures are drawn as a dark silhouette so the shape teases without revealing detail.
import { artFrame, loadArt } from './art-atlas.js';

const SILHOUETTE = '#2b2234';

export function portraitFrameName(kind) {
    return `enemy.${Number(kind) || 0}.0.normal`;
}

// Largest whole-number scale that fits the frame inside the canvas with padding.
export function portraitScale(frameWidth, frameHeight, canvasWidth, canvasHeight, padding = 8) {
    const fit = Math.min((canvasWidth - padding * 2) / frameWidth, (canvasHeight - padding * 2) / frameHeight);
    return Math.max(1, Math.floor(fit));
}

// Atlas frames keep room for attack poses; crop to the visible pixels so the creature fills the portrait.
const boundsCache = new Map();
export function opaqueBounds(frame, image) {
    const key = `${frame.x},${frame.y},${frame.w},${frame.h}`;
    if (boundsCache.has(key)) return boundsCache.get(key);
    let bounds = { x: frame.x, y: frame.y, w: frame.w, h: frame.h };
    try {
        if (typeof document !== 'undefined') {
            const scratch = document.createElement('canvas');
            scratch.width = frame.w;
            scratch.height = frame.h;
            const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
            scratchCtx.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
            const { data } = scratchCtx.getImageData(0, 0, frame.w, frame.h);
            let minX = frame.w, minY = frame.h, maxX = -1, maxY = -1;
            for (let y = 0; y < frame.h; y++) {
                for (let x = 0; x < frame.w; x++) {
                    if (data[(y * frame.w + x) * 4 + 3] < 16) continue;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
            if (maxX >= minX) bounds = { x: frame.x + minX, y: frame.y + minY, w: maxX - minX + 1, h: maxY - minY + 1 };
        }
    } catch {
        // A tainted or unavailable scratch canvas keeps the full frame.
    }
    boundsCache.set(key, bounds);
    return bounds;
}

export function drawBestiaryPortrait(canvas) {
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return false;
    // Match the backing store to the device so integer scaling stays crisp on high-DPI screens.
    const ratio = Math.max(1, Math.round(globalThis.devicePixelRatio || 1));
    if (canvas.clientWidth > 0) {
        canvas.width = Math.round(canvas.clientWidth * ratio);
        canvas.height = Math.round(canvas.clientHeight * ratio);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const entry = artFrame('actors', portraitFrameName(canvas.dataset.bestiaryKind));
    if (!entry) return false;
    const source = opaqueBounds(entry.frame, entry.image);
    const scale = portraitScale(source.w, source.h, canvas.width, canvas.height, 6 * ratio);
    const width = source.w * scale;
    const height = source.h * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(entry.image, source.x, source.y, source.w, source.h,
        Math.round((canvas.width - width) / 2), Math.round((canvas.height - height) / 2), width, height);
    if (canvas.dataset.unknown === 'true') {
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = SILHOUETTE;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
    return true;
}

export async function drawBestiaryPortraits(root) {
    if (!root?.querySelectorAll) return 0;
    await loadArt();
    let drawn = 0;
    for (const canvas of root.querySelectorAll('canvas[data-bestiary-kind]')) {
        if (drawBestiaryPortrait(canvas)) drawn++;
    }
    return drawn;
}
