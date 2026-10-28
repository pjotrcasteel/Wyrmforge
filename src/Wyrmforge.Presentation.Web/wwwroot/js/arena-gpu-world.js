// Live Hunt adapter. Existing C# lights and animation samplers remain authoritative.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { lightsIntersectingView } from './lighting/registry.js';
const UNIT = 48;
const GROUND_Y = Math.SQRT2;
function projectLightDirection(direction,groundY=GROUND_Y) {
    const projected = [direction[0], -direction[1] * groundY, direction[2]];
    const length = Math.hypot(...projected);
    // Point emitters may have a zero direction; never introduce NaN there.
    return length === 0 ? projected : projected.map(value => value / length);
}
export function huntLightFrame(frame, camera, viewport = null,groundY=GROUND_Y) {
    if (!frame) throw new TypeError('Missing authoritative Hunt lighting');
    const visible = viewport ? lightsIntersectingView(frame.lights, {
        left: camera.x, top: camera.y,
        right: camera.x + viewport.width, bottom: camera.y + viewport.height,
    }) : frame.lights;
    return { ...frame, lights: visible.map(light => ({ ...light,
        position: [(light.position[0] - camera.x) / UNIT, -(light.position[1] - camera.y) * groundY / UNIT, light.position[2] / UNIT],
        direction: projectLightDirection(light.direction,groundY),
        range: light.range / UNIT, intensity: light.intensity,
    })) };
}
const material = id => ({ id, albedo: id, color: '#ffffff', roughness: .95, metalness: 0,
    specular: .15, reflection: 'direct', emission: '#000000', emissionIntensity: 0,
    alphaCutoff: .1, doubleSided: true });
export function huntActorGeometry() {
    const actor = new T.PlaneGeometry(1, 1);
    actor.translate(0, .25, 0);
    actor.rotateX(Math.PI / 4);
    return actor;
}
export class HuntGpuWorld {
    constructor({sourceCamera=false,maxSkinActors=12}={}) {
        if(!Number.isSafeInteger(maxSkinActors)||maxSkinActors<0||maxSkinActors>32)throw new RangeError('Bounded Hunt skin population required');
        this.maxSkinActors=maxSkinActors;
        this.groundY=sourceCamera?61.93548774719238/34.730770111083984:GROUND_Y;
        this.elevation=sourceCamera?Math.asin(1/this.groundY):Math.PI/4;
        this.canvas = document.createElement('canvas');
        this.engine = new LightingEngine(this.canvas, { shadowViews: 6, maxLights: 8 });
        this.engine.registerGeometry('hunt-plane', new T.PlaneGeometry(1, 1));
        const billboard=huntActorGeometry();if(sourceCamera){billboard.rotateX(-Math.PI/4);billboard.rotateX(Math.PI/2-this.elevation);}
        this.engine.registerGeometry('hunt-billboard', billboard);
        this.skins=new Map();
        this.layers = new Map();
        this.used = new Set();
    }
    begin(ctx, camera, width, height) {
        this.camera = camera; this.width = width; this.height = height;
        this.used.clear(); this.objects = []; this.materials = [];this.skinCount=0;
        this.capture('hunt-ground', ctx.canvas, 0, 0, width, height, 0, false);
    }
    capture(id, source, x, y, width, height, elevation = 0, castsShadow = true,billboard=castsShadow) {
        this.used.add(id);
        let layer = this.layers.get(id);
        if (!layer) {
            const pixels = document.createElement('canvas');
            pixels.width = Math.max(1, Math.ceil(width)); pixels.height = Math.max(1, Math.ceil(height));
            const texture = new T.CanvasTexture(pixels);
            this.engine.registerTexture(id, texture);
            layer = { pixels, texture }; this.layers.set(id, layer);
        }
        if (layer.pixels.width !== Math.ceil(width)) layer.pixels.width = Math.ceil(width);
        if (layer.pixels.height !== Math.ceil(height)) layer.pixels.height = Math.ceil(height);
        const ctx = layer.pixels.getContext('2d');
        ctx.clearRect(0, 0, layer.pixels.width, layer.pixels.height);
        ctx.drawImage(source, 0, 0, layer.pixels.width, layer.pixels.height);
        layer.texture.needsUpdate = true;
        this.materials.push(material(id));
        const actor = billboard;
        this.objects.push({ id, ownerId: id, geometry: actor ? 'hunt-billboard' : 'hunt-plane', material: id,
            position: [(x + width / 2) / UNIT, -(y + height * (actor ? .75 : .5)) * this.groundY / UNIT, actor ? .001 : 0],
            rotation: [0, 0, 0], scale: [width / UNIT, height * (actor ? 1 : this.groundY) / UNIT, 1],
            castsShadow, receivesShadow: true, receivesLight: true });
    }
    captureSkin(id,descriptor,x,y,scale=1){
        if(this.skinCount>=this.maxSkinActors)throw new RangeError('Hunt skin budget exceeded');
        this.skinCount++;
        const resource=descriptor.skin,key='source-skin-'+resource.manifest.bufferSha256;
        if(!this.skins.has(key)){
            const geometry=new T.BufferGeometry();
            for(const [name,a] of Object.entries(resource.attributes))if(name==='index')geometry.setIndex(new T.BufferAttribute(a.array,a.itemSize));else geometry.setAttribute(name,new T.BufferAttribute(a.array,a.itemSize));
            this.engine.registerGeometry(key,geometry,{skinBinding:{bones:resource.surface.bones,influenceSets:resource.manifest.influenceSets,motionRadius:resource.surface.strideMetres*1.5}});
            const texture=new T.Texture(resource.image);texture.needsUpdate=true;this.engine.registerTexture(key,texture,true);
            this.skins.set(key,{...material(key),flatShading:resource.manifest.flatShading,doubleSided:resource.manifest.doubleSided,emission:resource.manifest.emission,emissionIntensity:resource.manifest.emissionIntensity});
        }
        if(!this.materials.some(m=>m.id===key))this.materials.push(this.skins.get(key));
        this.objects.push({id,ownerId:id,geometry:key,material:key,position:[x/UNIT,-y*this.groundY/UNIT,.625*scale],rotation:[0,0,descriptor.yaw],scale:[1.25*scale,1.25*scale,1.25*scale],castsShadow:true,receivesShadow:true,receivesLight:true,skinPose:descriptor.skinPose});
    }
    render(ctx, frame) {
        const engine = this.engine;
        engine.apply({ ...huntLightFrame(frame, this.camera, { width: this.width, height: this.height },this.groundY), materials: this.materials, objects: this.objects });
        // CanvasTexture clones share pixels, but each GPU map needs an upload notification.
        for (const object of engine.objects.values()) if (object.mesh.material.map?.isCanvasTexture) object.mesh.material.map.needsUpdate = true;
        engine.halfWidth = this.width / UNIT / 2;
        engine.camera.up.set(0, 0, 1);
        const centerY = -this.height * this.groundY / UNIT / 2;
        engine.camera.position.set(this.width / UNIT / 2, centerY - 42*Math.cos(this.elevation), 42*Math.sin(this.elevation));
        engine.camera.lookAt(this.width / UNIT / 2, centerY, 0);
        engine.render(this.width, this.height);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(this.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
        for (const [id, layer] of this.layers) if (!this.used.has(id)) {
            engine.textures.delete(id); layer.texture.dispose(); this.layers.delete(id);
        }
    }
    dispose() { this.engine.dispose(); this.layers.clear(); }
}
