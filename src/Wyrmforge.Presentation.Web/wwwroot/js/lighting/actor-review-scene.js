// Isolated *asset* review under the shared G1 renderer. Never hooks gameplay,
// Town or the mage. Ordinary Hunts still use the existing presentation path.
import * as T from './vendor/three.module.js';
import { LightingEngine } from './engine.js';
import { spritePlaneGeometry } from './lit-sprite.js';
import { actorMaterialSample, validateActorMaterialManifest } from './actor-materials.js';

const ACTORS = [['hollowed','hollow-rigged'],['ashling','ashling-rigged']];
const clipNames = ['walk','attack','death'];
const settingsDefault = () => ({
    clips: { hollowed: 'walk', ashling: 'walk' },
    frames: { hollowed: 0, ashling: 0 },
    directions: { hollowed: 'S', ashling: 'S' },
    lightX: 1, zero: false, shadows: true, scale: 1,
});

const light = (id, position, color, intensity) => ({
    id, ownerId: id, type: 'point', enabled: true, position, direction: [0,0,-1],
    color, intensity, range: 12, coneAngle: .6, penumbra: .2,
    castsShadow: true, priority: 8,
});
const material = (id, color, roughness, specular, albedo, normal) => ({
    id, color, albedo, normal, roughness, specular, reflection: 'direct',
    metalness: 0, emission: '#000000', emissionIntensity: 0,
    alphaCutoff: .5, doubleSided: true,
});
const worldObject = (id, geometry, materialId, position, scale = [1,1,1], extra = {}) => ({
    id, ownerId: id, geometry, material: materialId, position, rotation: [0,0,0], scale,
    castsShadow: true, receivesShadow: true, receivesLight: true, ...extra,
});

export async function createActorMaterialReview(canvas) {
    const engine = new LightingEngine(canvas);
    const bundles = {};
    const loader = new T.TextureLoader();
    try {
        engine.registerGeometry('actor-ground', new T.PlaneGeometry(1,1));
        engine.registerGeometry('actor-stone', new T.BoxGeometry(1,1,1));
        for (const [actor, folder] of ACTORS) {
            const base = new URL(`../../art/enemies/${folder}/`, import.meta.url);
            const [sprite, lit] = await Promise.all(
                ['manifest.json','lit-material-manifest.json'].map(async name => {
                    const response = await fetch(new URL(name, base));
                    if (!response.ok) throw new Error(`${actor}: missing ${name}`);
                    return response.json();
                }));
            validateActorMaterialManifest(sprite, lit);
            bundles[actor] = { sprite, lit };
            for (const clip of clipNames) {
                const data = lit.clips[clip];
                const prefix = `${actor}-${clip}`;
                const [albedo, normal] = await Promise.all(
                    [data.albedo, data.normal].map(name => loader.loadAsync(new URL(name, base).href)));
                engine.registerTexture(`${prefix}-color`, albedo);
                engine.registerTexture(`${prefix}-normal`, normal, false);
                engine.registerGeometry(prefix, spritePlaneGeometry(T, sprite.clips[clip]));
            }
        }
        const settings = settingsDefault();
        function render(options = {}) {
            Object.assign(settings, options);
            const materials = [material('actor-ground-mat','#555049',.94,.09),
                material('actor-stone-mat','#696773',.83,.15)];
            const objects = [
                worldObject('actor-ground','actor-ground','actor-ground-mat',[0,0,-.08],[10,9,1]),
                worldObject('actor-stone','actor-stone','actor-stone-mat',[0,2,.65],[4,.4,1.3])
            ];
            for (const [index,[actor]] of ACTORS.entries()) {
                const { sprite, lit } = bundles[actor];
                const clip = settings.clips[actor], count = sprite.clips[clip].frames;
                const frame = Math.max(0, Math.min(count-1, settings.frames[actor]));
                const direction = settings.directions[actor];
                const pass = actorMaterialSample(sprite, lit, { clip, frame, direction });
                const resource = `${actor}-${clip}`;
                materials.push(material(resource+'-material','#ffffff',pass.roughness,pass.specular,
                    resource+'-color',resource+'-normal'));
                objects.push(worldObject(actor,resource,resource+'-material',
                    [index === 0 ? -1.5 : 1.5,-.7,0],[settings.scale,settings.scale,settings.scale],
                    {frame: pass.frame, castsShadow: pass.castsShadow, receivesShadow: pass.receivesShadow,
                        receivesLight: pass.receivesLight}));
            }
            const lights = settings.zero ? [] : [
                light('actor-torch', [settings.lightX,-3,3.2], '#ff9b54', 36),
                light('actor-moon', [-2,1,6], '#819fbf', 9),
            ];
            if (!settings.shadows) for (const source of lights) source.castsShadow = false;
            const environment = {ambient:settings.zero ? 0 : .005,
                color:'#9bacc6', exposure:1, emission:false};
            engine.apply({version:1,time:0,lights,materials,objects,environment});
            engine.render();
            return engine.diagnostics();
        }
        render();
        return {
            render, pixels: () => engine.pixels(), bundles,
            dispose: () => engine.dispose(),
            verifyAllFrames: () => {
                let checked = 0, illuminated = 0;
                for (const [actor] of ACTORS) for (const clip of clipNames) {
                    const count = bundles[actor].sprite.clips[clip].frames;
                    for (const direction of bundles[actor].sprite.directions) for (let frame=0;frame<count;frame++) {
                        settings.clips[actor] = clip; settings.frames[actor] = frame;
                        settings.directions[actor] = direction;
                        settings.zero = false; render();
                        checked++;
                        if (engine.pixels().some((value,index)=>index%4!==3 && value>0)) illuminated++;
                    }
                }
                render({zero:true});
                const zeroMaximum = engine.pixels().reduce((maximum,value,index)=>
                    index%4===3 ? maximum : Math.max(maximum,value),0);
                return {checked, illuminated, zeroMaximum};
            }
        };
    } catch (error) {
        engine.dispose(); throw error;
    }
}
