// An asset binding, NOT a second lighting engine. Authored material channels feed
// the single LightingEngine; C# remains authoritative for positions and emitters.
import * as T from './lighting/vendor/three.module.js';
import { fireballV5Frame, fireballV5GpuAssets } from './arena-fireball-v5.js';
import { huntSurfaceMaterial, huntSurfaceRenderable } from './arena-gpu-world.js';

const ALBEDO = 'art:fireball-v5:albedo';
const EMISSIVE = 'art:fireball-v5:emissive';
const GEOMETRY = 'art:projectile-camera-facing';
const MATERIAL = 'art:fireball-v5:surface';
const FRAME_COUNT = 16;
const SHEET_WIDTH = 120;
const SHEET_HEIGHT = 72;
const ANCHOR_X = 87;
const ANCHOR_Y = 36;
const CORE_RADIUS = 14;
const UNITS_PER_PIXEL = 1 / 48;
const material = huntSurfaceMaterial(MATERIAL, {
    albedo: ALBEDO, emissiveMap: EMISSIVE,
    color: '#ffffff', emission: '#ffffff', emissionIntensity: 1,
    roughness: 1, specular: 0, reflection: 'off',
    alphaCutoff: 0, blendMode: 'alpha',
}, false);

/** Geometry and atlas are registered once per live Hunt renderer. */
function ensureGpuAssets(world, assets) {
    if (world.engine.textures.has(ALBEDO)) return;
    const geometry = new T.PlaneGeometry(1, 1);
    geometry.rotateX(Math.PI / 4);
    world.registerAssetGeometry(GEOMETRY, geometry);
    world.registerAssetTexture(ALBEDO, new T.Texture(assets.albedo));
    world.registerAssetTexture(EMISSIVE, new T.Texture(assets.emissive));
}

/** Project camera-facing authored art using C# projectile position and direction. */
export function fireballGpuSurface(projectile, camera, index, visualSeconds, reducedMotion = false) {
    if (projectile?.spell !== 1 || projectile.combination === 0 || !Number.isFinite(projectile.x)
        || !Number.isFinite(projectile.y)) return null;
    const r = Math.max(4, Math.min(19, Number(projectile.radius) || 7));
    const scale = r / CORE_RADIUS;
    const angle = Number.isFinite(projectile.angle) ? projectile.angle : 0;
    const dx = (SHEET_WIDTH / 2 - ANCHOR_X) * scale;
    const dy = (SHEET_HEIGHT / 2 - ANCHOR_Y) * scale;
    const centerX = projectile.x + dx * Math.cos(angle) - dy * Math.sin(angle);
    const centerY = projectile.y + dx * Math.sin(angle) + dy * Math.cos(angle);
    const quaternion = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(0, -Math.SQRT1_2, Math.SQRT1_2), angle);
    const rotation = new T.Euler().setFromQuaternion(quaternion, 'XYZ');
    const frame = fireballV5Frame(visualSeconds, projectile.fireballSourceId, reducedMotion);
    const descriptor = huntSurfaceRenderable(
        `hunt-fireball:${projectile.fireballSourceId ?? index}`,
        centerX - SHEET_WIDTH * scale / 2 - camera.x,
        centerY - SHEET_HEIGHT * scale / 2 - camera.y,
        SHEET_WIDTH * scale, SHEET_HEIGHT * scale, false,
        { ownerId: `projectile:${projectile.fireballSourceId ?? index}`,
            geometry: GEOMETRY, material,
            position: [(centerX - camera.x) * UNITS_PER_PIXEL,
                -(centerY - camera.y) * Math.SQRT2 * UNITS_PER_PIXEL, .001],
            scale: [SHEET_WIDTH * scale * UNITS_PER_PIXEL,
                SHEET_HEIGHT * scale * UNITS_PER_PIXEL, 1],
            rotation: [rotation.x, rotation.y, rotation.z],
            castsShadow: false, receivesShadow: false, receivesLight: true,
            frame: { offset: [frame / FRAME_COUNT, 0], repeat: [1 / FRAME_COUNT, 1] } });
    descriptor.material = MATERIAL;
    return descriptor;
}

/** Returns exactly the projectiles now owned by the GPU, so Canvas skips only those. */
export function submitGpuFireballs(world, projectiles, camera, visualSeconds, reducedMotion = false) {
    const assets = fireballV5GpuAssets();
    const submitted = new Set();
    if (!assets) return submitted;
    for (const [index, projectile] of projectiles.entries()) {
        const surface = fireballGpuSurface(projectile, camera, index, visualSeconds, reducedMotion);
        if (!surface) continue;
        if (surface.position[0] < -5 || surface.position[0] > world.width / 48 + 5 ||
            surface.position[1] > 5 || surface.position[1] < -world.height * Math.SQRT2 / 48 - 5) continue;
        ensureGpuAssets(world, assets);
        world.submitSurface(surface, material);
        submitted.add(projectile);
    }
    return submitted;
}
