import * as T from './vendor/three.module.js';
import { LightingInspection } from './inspection.js';
import { validateSnapshot, selectLights } from './registry.js';

/** Shared GPU adapter; accepts resource IDs and descriptors, never entity kinds. */
export class LightingEngine {
    constructor(canvas, { shadowViews = 8, maxLights = 8 } = {}) {
        this.canvas = canvas;
        this.renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
        this.renderer.outputColorSpace = T.SRGBColorSpace;
        this.renderer.toneMapping = T.NeutralToneMapping;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = T.PCFShadowMap;
        this.renderer.setPixelRatio(1);
        this.scene = new T.Scene();
        this.scene.background = new T.Color(0);
        this.camera = new T.OrthographicCamera(-5, 5, 7, -7, .1, 80);
        this.camera.up.set(0, 0, 1);
        this.camera.position.set(8, -12, 13);
        this.camera.lookAt(0, 0, 1);
        this.ambient = new T.AmbientLight();
        this.scene.add(this.ambient);
        this.objects = new Map(); this.lights = new Map();
        this.geometries = new Map(); this.textures = new Map();
        this.shadowViews = shadowViews; this.maxLights = maxLights;
        this.alive = true;
        this.debugView = 'lit';
        this.halfWidth = 5;
        this.inspection = new LightingInspection();
        this.materialBudget = { maps: 0, transmissive: 0, ao: 0 };
    }
    registerGeometry(id, geometry) {
        if (this.geometries.has(id)) throw new Error(`Duplicate geometry ${id}`);
        this.geometries.set(id, geometry);
    }
    registerTexture(id, texture, colorData = true) {
        if (this.textures.has(id)) throw new Error(`Duplicate texture ${id}`);
        if (texture.isCubeTexture) colorData = true;
        texture.colorSpace = colorData ? T.SRGBColorSpace : T.NoColorSpace;
        texture.magFilter = texture.minFilter = T.NearestFilter;
        texture.generateMipmaps = false;
        this.textures.set(id, texture);
    }
    material(descriptor, receivesLight) {
        const texture = (id, colorData = false) => {
            if (!id) return null;
            const source = this.textures.get(id);
            if (!source) return null;
            const map = source.clone();
            map.colorSpace = colorData ? T.SRGBColorSpace : T.NoColorSpace;
            return map;
        };
        const wetness = descriptor.wetness ?? 0;
        const wetRoughness = descriptor.roughness * (1 - wetness) + Math.min(descriptor.roughness, .08) * wetness;
        const material = new T.MeshPhysicalMaterial({
            color: receivesLight ? descriptor.color : '#000000', map: texture(descriptor.albedo, true),
            normalMap: texture(descriptor.normal), roughnessMap: texture(descriptor.roughnessMap),
            aoMap: texture(descriptor.aoMap), aoMapIntensity: descriptor.aoIntensity ?? 1,
            emissiveMap: texture(descriptor.emissiveMap, true),
            envMap: receivesLight && descriptor.reflection === 'probe' ? this.textures.get(descriptor.reflectionProbe) ?? null : null,
            roughness: wetRoughness, metalness: receivesLight && descriptor.reflection !== 'off' ? descriptor.metalness : 0,
            specularIntensity: receivesLight && descriptor.reflection !== 'off' ? descriptor.specular : 0,
            emissive: descriptor.emission, emissiveIntensity: descriptor.emissionIntensity,
            alphaTest: descriptor.alphaCutoff, side: descriptor.doubleSided ? T.DoubleSide : T.FrontSide,
        });
        if (descriptor.reflection === 'probe' && receivesLight) material.envMapIntensity = descriptor.specular;
        if (descriptor.normalScale !== undefined) material.normalScale.setScalar(descriptor.normalScale);
        // An emissive map modulates the emission color; a black base would suppress it entirely.
        if (descriptor.emissiveMap && descriptor.emission === '#000000') material.emissive.set('#ffffff');
        // Generic thin-surface transmission; never registers a light source.
        if (receivesLight && descriptor.foliageTransmission > 0) {
            material.transmission = descriptor.foliageTransmission;
            material.thickness = 0;
        }
        material.shadowSide = descriptor.doubleSided ? T.DoubleSide : T.FrontSide;
        for (const map of [material.map, material.normalMap, material.roughnessMap, material.aoMap, material.emissiveMap]) if (map) map.needsUpdate = true;
        return material;
    }
    removeObject(id) {
        const o = this.objects.get(id);
        if (!o) return;
        this.scene.remove(o.mesh);
        if (o.caster) this.scene.remove(o.caster);
        for (const map of [o.mesh.material.map, o.mesh.material.normalMap, o.mesh.material.roughnessMap, o.mesh.material.aoMap, o.mesh.material.emissiveMap]) map?.dispose();
        for (const material of o.debugMaterials?.values() ?? []) material.dispose();
        o.mesh.material.dispose(); o.caster?.material.dispose();
        this.objects.delete(id);
    }
    removeLight(id) {
        const light = this.lights.get(id);
        if (!light) return;
        this.scene.remove(light, light.target);
        light.shadow?.map?.dispose(); light.dispose?.();
        this.lights.delete(id);
    }
    /** Whole authoritative visual snapshot; validate all resource references before mutation. */
    apply(input) {
        const s = validateSnapshot(input);
        for (const m of s.materials) for (const key of ['albedo', 'normal', 'roughnessMap', 'aoMap', 'emissiveMap', 'reflectionProbe'])
            if (m[key] && !this.textures.has(m[key])) throw new Error(`Missing texture ${m[key]}`);
        for (const m of s.materials) if (m.reflection === 'probe' && !this.textures.get(m.reflectionProbe)?.isCubeTexture)
            throw new TypeError(`Reflection probe ${m.reflectionProbe} must be a cube texture`);
        for (const o of s.objects) for (const key of ['geometry', 'occluderGeometry'])
            if (o[key] && !this.geometries.has(o[key])) throw new Error(`Missing geometry ${o[key]}`);
        const selected = selectLights(s, this.shadowViews, this.maxLights);
        for (const id of this.lights.keys()) if (!selected.some(l => l.id === id)) this.removeLight(id);
        for (const d of selected) {
            let light = this.lights.get(d.id);
            if (light && light.userData.type !== d.type) { this.removeLight(d.id); light = null; }
            if (!light) {
                const constructors = { point: T.PointLight, spot: T.SpotLight, directional: T.DirectionalLight };
                light = new constructors[d.type](); light.userData.type = d.type;
                light.shadow.mapSize.set(512, 512); light.shadow.bias = -.00015; light.shadow.normalBias = .025;
                light.shadow.camera.near = .05;
                if (d.type === 'directional') Object.assign(light.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
                this.scene.add(light); if (light.target) this.scene.add(light.target);
                this.lights.set(d.id, light);
            }
            light.color.set(d.color); light.intensity = d.intensity; light.distance = d.range; light.decay = 2;
            light.position.fromArray(d.position); light.castShadow = d.shadow;
            light.shadow.camera.far = d.range; light.shadow.camera.updateProjectionMatrix();
            if (light.target) light.target.position.copy(light.position).add(new T.Vector3(...d.direction));
            if (light.isSpotLight) { light.angle = d.coneAngle; light.penumbra = d.penumbra; }
        }
        const materialById = new Map(s.materials.map(m => [m.id, m]));
        for (const id of this.objects.keys()) if (!s.objects.some(o => o.id === id)) this.removeObject(id);
        for (const d of s.objects) {
            const md = materialById.get(d.material);
            const signature = JSON.stringify([d.geometry, d.occluderGeometry, md, d.receivesLight]);
            let object = this.objects.get(d.id);
            if (object && object.signature !== signature) { this.removeObject(d.id); object = null; }
            if (!object) {
                const mesh = new T.Mesh(this.geometries.get(d.geometry), this.material(md, d.receivesLight));
                let caster;
                if (d.occluderGeometry) {
                    // Separate authored solid caster; never reuses collision or infers volume from albedo.
                    const hidden = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
                    caster = new T.Mesh(this.geometries.get(d.occluderGeometry), hidden);
                    this.scene.add(caster);
                }
                object = { id: d.id, mesh, caster, signature }; this.objects.set(d.id, object); this.scene.add(mesh);
            }
            for (const mesh of [object.mesh, object.caster].filter(Boolean)) {
                mesh.position.fromArray(d.position); mesh.rotation.set(...d.rotation); mesh.scale.fromArray(d.scale);
            }
            object.mesh.castShadow = d.castsShadow && !object.caster;
            if (object.caster) object.caster.castShadow = d.castsShadow;
            object.mesh.receiveShadow = d.receivesShadow;
            object.mesh.material.emissiveIntensity = s.environment.emission ? md.emissionIntensity : 0;
            if (d.frame) for (const map of [object.mesh.material.map, object.mesh.material.normalMap, object.mesh.material.roughnessMap, object.mesh.material.aoMap, object.mesh.material.emissiveMap]) if (map) {
                map.offset.fromArray(d.frame.offset); map.repeat.fromArray(d.frame.repeat); map.updateMatrix();
            }
        }
        // Fog is a bounded distance approximation, not a volumetric light simulation.
        // The zero-light diagnostic must not reveal silhouettes through fog.
        const fog = s.environment.fog;
        // Three.js scene fog is unlit and otherwise introduces its own full-bright color.
        // Disable it when ambient is zero; direct-light-only fog needs a lit-volume pass.
        this.scene.fog = fog && s.environment.ambient > 0 ? new T.Fog(
            new T.Color(fog.color).multiply(new T.Color(s.environment.color))
                .multiplyScalar(Math.min(1, s.environment.ambient)),
            fog.near, fog.far) : null;
        this.ambient.color.set(s.environment.color); this.ambient.intensity = s.environment.ambient;
        this.renderer.toneMappingExposure = s.environment.exposure;
        this.materialBudget = {
            maps: s.materials.reduce((count, m) => count + ['albedo', 'normal', 'roughnessMap', 'aoMap', 'emissiveMap'].filter(key => !!m[key]).length, 0),
            transmissive: s.materials.filter(m => (m.foliageTransmission ?? 0) > 0).length,
            ao: s.materials.filter(m => !!m.aoMap).length,
        };
        this.snapshot = s; this.selected = selected;
    }
    setCamera(target, halfWidth = 5) {
        if (target.length !== 3 || target.some(n => !Number.isFinite(n)) || !Number.isFinite(halfWidth) || halfWidth <= 0)
            throw new RangeError('Invalid inspection camera');
        this.halfWidth = halfWidth;
        this.camera.position.set(target[0] + 8, target[1] - 12, target[2] + 12);
        this.camera.lookAt(...target);
    }
    /** Explicit inspection passes, never world illumination. */
    setDebugView(view) {
        if (!['lit', 'albedo', 'normals', 'geometry', 'shadow-visibility', 'light-depth', 'light-bounds', 'object-mask'].includes(view)) throw new RangeError('Unknown diagnostic view');
        this.debugView = view;
    }
    debugMaterial(object) {
        object.debugMaterials ??= new Map();
        const key = `${this.debugView}-${object.id === this.inspectionObject}`;
        if (object.debugMaterials.has(key)) return object.debugMaterials.get(key);
        const view = this.debugView, material = object.mesh.material.clone();
        material.wireframe = view === 'geometry';
        material.toneMapped = false;
        material.onBeforeCompile = shader => {
            if (view === 'shadow-visibility') shader.fragmentShader = shader.fragmentShader.replace(
                '#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>
float proofShadowVisibility() {
#if NUM_POINT_LIGHT_SHADOWS > 0 && defined(USE_SHADOWMAP)
    PointLightShadow light = pointLightShadows[0];
    return receiveShadow ? getPointShadow(pointShadowMap[0], light.shadowMapSize, light.shadowIntensity,
        light.shadowBias, light.shadowRadius, vPointShadowCoord[0], light.shadowCameraNear, light.shadowCameraFar) : 1.0;
#else
    return 1.0;
#endif
}`);
            const output = { albedo: 'diffuseColor.rgb', normals: 'normal * 0.5 + 0.5',
                geometry: 'vec3(0.65, 0.85, 0.75)', 'object-mask': object.id === this.inspectionObject ? 'vec3(1.0)' : 'vec3(0.0)', 'shadow-visibility': 'vec3(proofShadowVisibility())' }[view];
            shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
                `outgoingLight = ${output};\n#include <opaque_fragment>`);
        };
        material.customProgramCacheKey = () => `lighting-inspection-${key}`;
        object.debugMaterials.set(key, material);
        return material;
    }
    render(width = this.canvas.clientWidth, height = this.canvas.clientHeight) {
        if (!this.alive) return;
        // One world sample per CSS pixel at 390px, bounded regardless of device DPR.
        const w = Math.max(1, Math.min(390, Math.round(width))), h = Math.max(1, Math.round(height * w / width));
        if (this.canvas.width !== w || this.canvas.height !== h) this.renderer.setSize(w, h, false);
        this.camera.left = -this.halfWidth; this.camera.right = this.halfWidth;
        this.camera.top = this.halfWidth * h / w; this.camera.bottom = -this.halfWidth * h / w;
        this.camera.updateProjectionMatrix();
        if (this.debugView === 'light-depth') {
            const source = this.selected?.find(l => l.shadow);
            this.inspection.depth(this.renderer, this.lights.get(source?.id));
            return;
        }
        const removeBounds = this.debugView === 'light-bounds' ? this.inspection.bounds(this.scene, this.lights.values()) : () => {};
        const originals = [], shadowUpdate = this.renderer.shadowMap.autoUpdate;
        try {
            if (!['lit', 'light-bounds'].includes(this.debugView)) {
                // The preceding lit render owns the actual depth maps, including animated alpha.
                this.renderer.shadowMap.autoUpdate = false;
                for (const object of this.objects.values()) {
                    originals.push([object.mesh, object.mesh.material]);
                    object.mesh.material = this.debugMaterial(object);
                }
            }
            this.renderer.render(this.scene, this.camera);
        } finally {
            for (const [mesh, material] of originals) mesh.material = material;
            this.renderer.shadowMap.autoUpdate = shadowUpdate;
            removeBounds();
        }
    }
    pixels() {
        const gl = this.renderer.getContext(), data = new Uint8Array(this.canvas.width * this.canvas.height * 4);
        gl.readPixels(0, 0, this.canvas.width, this.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        return data;
    }
    diagnostics() {
        return { backend: 'WebGL2 / Three 0.186.1', view: this.debugView, depthSource: this.selected?.find(l => l.shadow)?.id ?? null, framebuffer: [this.canvas.width, this.canvas.height], objects: this.objects.size,
            lights: this.selected?.map(l => ({ id: l.id, ownerId: l.ownerId, type: l.type, position: l.position, intensity: l.intensity, shadow: l.shadow, views: l.shadowViews })),
            drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
            textures: this.renderer.info.memory.textures, geometries: this.renderer.info.memory.geometries,
            inspectedReceiver: this.snapshot?.objects.find(o => o.id === this.inspectionObject) ?? null,
            materialBudget: this.materialBudget, fogEnabled: !!this.scene.fog,
            productionPathsMigrated: 0 };
    }
    dispose() {
        this.alive = false;
        for (const id of this.objects.keys()) this.removeObject(id);
        for (const id of this.lights.keys()) this.removeLight(id);
        for (const geometry of this.geometries.values()) geometry.dispose();
        for (const texture of this.textures.values()) texture.dispose();
        this.inspection.dispose();
        this.renderer.dispose();
    }
}
