// L4 opt-in lighting lab: an original RGBA tree is an OCCLUDER with depth,
// not a flat brightened rectangle. All light coordinates use canonical world
// space. Candidate PNGs remain unapproved and never enter gameplay collision.
import { shadeTreeCameraNormals } from './arena-sprite-normal-lighting.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = value => Number.isFinite(value);

export function treeFirelightPlan(foot, treeHeight, sources = []) {
    if (!finite(foot?.x) || !finite(foot?.y) || !finite(treeHeight) || treeHeight <= 0) return null;
    let strongest = null;
    for (const source of sources) {
        if (!finite(source?.x) || !finite(source?.y) ||
            !finite(source?.radius) || source.radius <= 0) continue;
        const distance = Math.hypot(foot.x - source.x, foot.y - source.y);
        const reach = source.radius + treeHeight * .20;
        if (distance >= reach) continue;
        const influence = clamp(1 - distance / reach, 0, 1);
        const intensity = clamp((Number(source.relief) || 0) * (.40 + .60 * Math.sqrt(influence)), 0, 1);
        if (!strongest || intensity > strongest.intensity) {
            const norm = Math.max(1, distance);
            strongest = Object.freeze({
                sourceX: source.x, sourceY: source.y,
                dirX: (foot.x - source.x) / norm,
                dirY: (foot.y - source.y) / norm,
                intensity,
                distance,
                altitude: clamp(finite(source.altitude) ? source.altitude : 48, 12, 140),
                radius: source.radius,
                color: source.color ?? [255, 139, 66],
            });
        }
    }
    return strongest;
}

// A billboard can approximate a cast shadow, but cannot know its 3D geometry.
// Retain *the tree's actual alpha silhouette*, project it onto the ground away
// from the active emitter, and never use a generic circular shadow substitute.
export function treeProjectedSilhouettePlan(foot, height, light) {
    if (!light || !finite(foot?.x) || !finite(foot?.y) ||
        !finite(height) || height <= 0 || light.intensity <= 0) return null;
    const stretch = clamp((height / (light.altitude + 75)) * .56, .30, 1.38);
    return Object.freeze({
        x: foot.x, y: foot.y,
        skewX: -light.dirX * stretch,
        scaleY: .20 - light.dirY * stretch * .72,
        opacity: clamp(.26 + light.intensity * .74, .26, .94),
        blur: clamp(height * .010, 1.5, 3.3),
    });
}

export function makeTreeLightingAssets(image, crop, targetHeight, documentRef = document) {
    if (!image || !crop || !finite(targetHeight) || targetHeight <= 0) return null;
    const width = Math.max(1, Math.round(targetHeight * crop.width / crop.height));
    const height = Math.max(1, Math.round(targetHeight));
    const create = () => {
        const canvas = documentRef.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    };
    const base = create();
    const baseCtx = base.getContext('2d');
    if (!baseCtx) return null;
    baseCtx.imageSmoothingEnabled = true;
    baseCtx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
    const mask = create();
    const maskCtx = mask.getContext('2d');
    if (!maskCtx) return null;
    maskCtx.drawImage(base, 0, 0);
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.fillStyle = '#040608';
    maskCtx.fillRect(0, 0, width, height);
    maskCtx.globalCompositeOperation = 'source-over';
    return { base, mask, shading: create(), width, height,
        originalPixels: new Uint8ClampedArray(baseCtx.getImageData(0, 0, width, height).data),
        normals: null, shadedFrame: null,
        footInset: Math.min(crop.footInsetPixels ?? 0, crop.height * .12) * height / crop.height };
}

// The source normal map is exported from the SAME 3D geometry and SAME camera
// as the original transparent tree PNG; only camera-space vectors are sampled.
// Input remains a review-only local file until source artwork is approved.
export function attachTreeCameraNormalMap(assets, image, crop, documentRef = document) {
    if (!assets || !image || !crop || crop.width <= 0 || crop.height <= 0) return false;
    const surface = documentRef.createElement('canvas');
    surface.width = assets.width;
    surface.height = assets.height;
    const painter = surface.getContext('2d', { willReadFrequently: true });
    if (!painter) return false;
    painter.imageSmoothingEnabled = true;
    painter.drawImage(image, crop.x, crop.y, crop.width, crop.height,
        0, 0, assets.width, assets.height);
    const normals = painter.getImageData(0, 0, assets.width, assets.height).data;
    let coverage = 0;
    for (let i = 3; i < normals.length; i += 4)
        if (normals[i] > 6 && assets.originalPixels[i] > 6) coverage++;
    if (coverage < assets.width * assets.height * .015) return false;
    const shadeCtx = assets.shading.getContext('2d');
    if (!shadeCtx) return false;
    assets.normals = new Uint8ClampedArray(normals);
    assets.shadedFrame = shadeCtx.createImageData(assets.width, assets.height);
    return true;
}

export function drawTreeCastShadow(ctx, assets, plan) {
    if (!ctx || !assets?.mask || !plan) return false;
    ctx.save();
    ctx.globalAlpha = plan.opacity;
    // Only the original silhouette creates the contact/canopy footprint.
    // The cast is visible on fire-illuminated ground and changes direction
    // every frame with the traveling Fireball.
    ctx.translate(plan.x, plan.y);
    ctx.transform(1, 0, plan.skewX, plan.scaleY, 0, 0);
    if ('filter' in ctx) ctx.filter = `blur(${plan.blur.toFixed(2)}px)`;
    ctx.drawImage(assets.mask, -assets.width / 2, -assets.height + assets.footInset);
    ctx.restore();
    return true;
}

export function drawFirelitTree(ctx, assets, foot, light, darkness = .90) {
    if (!ctx || !assets?.base || !assets?.shading || !finite(foot?.x) || !finite(foot?.y)) return false;
    const { width, height, footInset } = assets;
    const layer = assets.shading;
    const painter = layer.getContext('2d');
    if (!painter) return false;
    painter.clearRect(0, 0, width, height);
    if (assets.normals && assets.shadedFrame) {
        shadeTreeCameraNormals(assets.originalPixels, assets.normals,
            light, darkness, assets.shadedFrame.data);
        painter.putImageData(assets.shadedFrame, 0, 0);
        ctx.save();
        ctx.drawImage(layer, foot.x - width * .5, foot.y - height + footInset);
        ctx.restore();
        return true;
    }
    painter.drawImage(assets.base, 0, 0);
    painter.globalCompositeOperation = 'source-atop';
    // Preserve the source painting, darken its *opaque tree pixels* in true
    // night; translucent corners stay transparent. No square sprite overlay.
    painter.fillStyle = `rgba(0,0,0,${clamp(darkness * .78, .45, .81).toFixed(3)})`;
    painter.fillRect(0, 0, width, height);
    if (light) {
        const dirFromTree = -light.dirX;
        const brightness = clamp(light.intensity, 0, 1);
        // Warm directional light comes from the actual Fireball side. The
        // opposite trunk/canopy retains a much darker silhouette; source
        // painting grain and branches still show beneath the shaded tint.
        const side = dirFromTree < 0 ? -width * .12 : width * 1.12;
        const middle = width * .5;
        const gradient = painter.createLinearGradient(side, height * .35,
            width - side, height * .35);
        const intensityNear = clamp(brightness * .88, 0, .88);
        gradient.addColorStop(0, `rgba(255,177,102,${intensityNear.toFixed(3)})`);
        gradient.addColorStop(.42, `rgba(220,123,65,${(intensityNear * .24).toFixed(3)})`);
        gradient.addColorStop(1, 'rgba(12,16,22,0)');
        painter.fillStyle = gradient;
        painter.fillRect(0, 0, width, height);
        // Actual distance to the emitter also varies from crown to roots:
        // narrow concentrated firelit highlights; no flat uniform tint.
        const sourceX = clamp(width * .5 + (light.sourceX - foot.x), -width, width * 2);
        const sourceY = height + (light.sourceY - foot.y) - footInset;
        const radius = Math.max(width, height) * 1.30;
        const glow = painter.createRadialGradient(sourceX, sourceY, 1,
            sourceX, sourceY, radius);
        glow.addColorStop(0, `rgba(255,188,112,${(brightness * .23).toFixed(3)})`);
        glow.addColorStop(.50, `rgba(219,109,56,${(brightness * .09).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        painter.fillStyle = glow;
        painter.fillRect(0, 0, width, height);
    }
    painter.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.drawImage(layer, foot.x - width * .5, foot.y - height + footInset);
    ctx.restore();
    return true;
}
