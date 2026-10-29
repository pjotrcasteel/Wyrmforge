// Live Hunt adapter. Existing C# lights and animation samplers remain authoritative.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { lightsIntersectingView } from './lighting/registry.js';
import {spritePlaneGeometry} from './lighting/lit-sprite.js';
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
        this.sourceCamera=sourceCamera;this.groundY=GROUND_Y;this.elevation=Math.PI/4;
        this.canvas = document.createElement('canvas');
        this.engine = new LightingEngine(this.canvas, { shadowViews: 6, maxLights: 8 });
        this.engine.registerGeometry('hunt-plane', new T.PlaneGeometry(1, 1));
        const billboard=this.billboardGeometry=huntActorGeometry();
        this.engine.registerGeometry('hunt-billboard', billboard);
        this.skins=new Map();
        this.sprites=new Map();
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
        const resource=descriptor.skin,key='source-skin-'+resource.manifest.sourceSignature+'-'+(resource.manifest.skinningMode??'linear')+'-'+resource.manifest.bufferSha256;
        if(!this.skins.has(key)){
            const geometry=new T.BufferGeometry();
            for(const [name,a] of Object.entries(resource.attributes))if(name==='index')geometry.setIndex(new T.BufferAttribute(a.array,a.itemSize));else geometry.setAttribute(name,new T.BufferAttribute(a.array,a.itemSize));
            this.engine.registerGeometry(key,geometry,{skinBinding:{bones:resource.surface.bones,influenceSets:resource.manifest.influenceSets,skinningMode:resource.manifest.skinningMode,motionRadius:resource.surface.strideMetres*1.5}});
            const texture=new T.Texture(resource.image);texture.needsUpdate=true;this.engine.registerTexture(key,texture,true);
            this.skins.set(key,{...material(key),flatShading:resource.manifest.flatShading,doubleSided:resource.manifest.doubleSided,emission:resource.manifest.emission,emissionIntensity:resource.manifest.emissionIntensity});
        }
        if(!this.materials.some(m=>m.id===key))this.materials.push(this.skins.get(key));
        const modelScale=descriptor.worldUnitsPerMetre/UNIT*scale;
        this.objects.push({id,ownerId:id,geometry:key,material:key,position:[x/UNIT,-y*this.groundY/UNIT,-descriptor.groundZ*modelScale],rotation:[0,0,descriptor.yaw],scale:[modelScale,modelScale,modelScale],castsShadow:true,receivesShadow:true,receivesLight:true,skinPose:descriptor.skinPose});
    }
    captureSprite(id,descriptor,x,y,scale=1){
        if(!descriptor.gpuMaterialComplete||!descriptor.material?.albedo||!descriptor.material.normal||!descriptor.material.emissiveMap)throw new TypeError('Complete aligned sprite materials required');
        const key='sprite-'+descriptor.sourceSignature+'-'+descriptor.clip.sha256;
        if(!this.sprites.has(key)){
            const maps={};
            for(const [kind,image] of Object.entries(descriptor.material)){
                const texture=new T.Texture(image);texture.needsUpdate=true;
                maps[kind]=key+'-'+kind;this.engine.registerTexture(maps[kind],texture,kind!=='normal');
            }
            this.engine.registerGeometry(key,spritePlaneGeometry(T,descriptor.clip,1/UNIT,[0,-Math.cos(this.elevation),Math.sin(this.elevation)]));
            this.sprites.set(key,{...material(key),...maps,emissionIntensity:1});
        }
        if(!this.materials.some(m=>m.id===key))this.materials.push(this.sprites.get(key));
        const offset=descriptor.rootOffset??{x:0,y:0};
        this.objects.push({id,ownerId:id,geometry:key,material:key,frame:descriptor.frame,
            position:[(x+offset.x)/UNIT,-(y+offset.y)*this.groundY/UNIT,.001],rotation:[0,0,0],scale:[scale,scale,scale],
            castsShadow:true,receivesShadow:true,receivesLight:true});
    }
    configureSourceProjection(descriptor){
        if(!this.sourceCamera)return;
        const units=descriptor.worldUnitsPerMetre,b=descriptor.projection?.groundBasis,h=descriptor.projection?.heightProjection;
        if(!Number.isFinite(units)||units<=0||!Array.isArray(b)||b.length!==4||!Array.isArray(h)||h.length!==2||![...b,...h].every(Number.isFinite)||Math.abs(b[0]-units)>units*.0001||Math.abs(b[1])+Math.abs(b[2])+Math.abs(h[0])>units*.0001||b[3]>=0||h[1]>=0||Math.abs(Math.hypot(b[3],h[1])-units)>units*.0001)throw new TypeError('Source projection must match the canonical orthographic scene axes');
        const key=JSON.stringify([b,h,units]);if(this.sourceProjectionKey===key)return;
        const groundY=units/-b[3],elevation=Math.asin(1/groundY);
        this.billboardGeometry.rotateX(this.elevation-elevation);
        this.groundY=groundY;this.elevation=elevation;this.sourceProjectionKey=key;
    }
    render(ctx, frame) {
        const engine = this.engine;
        if(this.inspectionLighting==='zero'){
            const environment={...frame.environment,ambient:0,emission:false};delete environment.fog;
            frame={...frame,environment,lights:[]};
        }else if(this.inspectionLighting){
            const environment={...frame.environment,ambient:.35,color:'#aebaca',exposure:1,emission:true};delete environment.fog;
            frame={...frame,environment,lights:[...frame.lights,{id:'developer-inspection:key',ownerId:'developer-inspection',type:'point',enabled:true,position:[this.camera.x+this.width*.35,this.camera.y+this.height*.45,96],direction:[0,0,-1],color:'#fff3dc',intensity:16,range:720,coneAngle:.7,penumbra:0,castsShadow:true,priority:1000}]};
        }
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
    dispose() { this.engine.dispose(); this.layers.clear(); this.sprites.clear(); }
}
