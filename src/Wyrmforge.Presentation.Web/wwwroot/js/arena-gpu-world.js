// Live Hunt adapter. Existing C# lights and animation samplers remain authoritative.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
const UNIT = 48;
export function huntLightFrame(frame, camera) {
    if (!frame) throw new TypeError('Missing authoritative Hunt lighting');
    return { ...frame, lights: frame.lights.map(light => ({ ...light,
        position: [(light.position[0] - camera.x) / UNIT, -(light.position[1] - camera.y) / UNIT, light.position[2] / UNIT],
        direction: [light.direction[0], -light.direction[1], light.direction[2]],
        range: light.range / UNIT, intensity: light.intensity,
    })) };
}
const material = id => ({ id, albedo: id, color: '#ffffff', roughness: .95, metalness: 0,
    specular: .15, reflection: 'direct', emission: '#000000', emissionIntensity: 0,
    alphaCutoff: .1, doubleSided: true });
export class HuntGpuWorld {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.engine = new LightingEngine(this.canvas, { shadowViews: 6, maxLights: 8 });
        this.engine.registerGeometry('hunt-plane', new T.PlaneGeometry(1, 1));
        this.layers = new Map();
        this.used = new Set();
    }
    begin(ctx, camera, width, height) {
        this.camera = camera; this.width = width; this.height = height;
        this.used.clear(); this.objects = []; this.materials = [];
        this.capture('hunt-ground', ctx.canvas, 0, 0, width, height, 0, false);
    }
    capture(id, source, x, y, width, height, elevation = .15, castsShadow = true) {
        this.used.add(id);
        let layer = this.layers.get(id);
        if (!layer) {
            const pixels = document.createElement('canvas');
            pixels.width = Math.max(1, Math.ceil(width)); pixels.height = Math.max(1, Math.ceil(height));
            const texture = new T.CanvasTexture(pixels);
            this.engine.registerTexture(id, texture);
            layer = { pixels, texture }; this.layers.set(id, layer);
        }
        const ctx = layer.pixels.getContext('2d');
        ctx.clearRect(0, 0, layer.pixels.width, layer.pixels.height);
        ctx.drawImage(source, 0, 0, layer.pixels.width, layer.pixels.height);
        layer.texture.needsUpdate = true;
        this.materials.push(material(id));
        this.objects.push({ id, ownerId: id, geometry: 'hunt-plane', material: id,
            position: [(x + width / 2) / UNIT, -(y + height / 2) / UNIT, elevation],
            rotation: [0, 0, 0], scale: [width / UNIT, height / UNIT, 1],
            castsShadow, receivesShadow: true, receivesLight: true });
    }
    render(ctx, frame) {
        const engine = this.engine;
        engine.apply({ ...huntLightFrame(frame, this.camera), materials: this.materials, objects: this.objects });
        // CanvasTexture clones share pixels, but each GPU map needs an upload notification.
        for (const object of engine.objects.values()) if (object.mesh.material.map) object.mesh.material.map.needsUpdate = true;
        engine.halfWidth = this.width / UNIT / 2;
        engine.camera.up.set(0, 1, 0);
        engine.camera.position.set(this.width / UNIT / 2, -this.height / UNIT / 2, 30);
        engine.camera.lookAt(this.width / UNIT / 2, -this.height / UNIT / 2, 0);
        engine.render(this.width, this.height);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(this.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
        for (const [id, layer] of this.layers) if (!this.used.has(id)) {
            engine.textures.delete(id); layer.texture.dispose(); this.layers.delete(id);
        }
    }
    dispose() { this.engine.dispose(); this.layers.clear(); }
}
