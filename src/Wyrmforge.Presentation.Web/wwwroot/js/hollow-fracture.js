// Hollowed real-geometry corpse fracture: release-gated, no procedural bone sprites.
// This consumes ONLY authored eight-way Blender frame atlases from the original
// skinned Hollowed source. Unknown, incomplete and unapproved assets never render.
export const FRACTURE_DIRECTIONS = Object.freeze(['N','NE','E','SE','S','SW','W','NW']);
export const FRACTURE_FRAMES = 24;
const MAX_VISIBLE_LIGHTS = 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function isApprovedHollowFractureManifest(m) {
    if (!m || m.schemaVersion !== 1 || m.actor !== 'hollowed' || m.clip !== 'fracture' ||
        m.ownerApproved !== true || m.sourceGeometry !== 'original-skinned-blender-mesh' ||
        m.injury !== 'standard' || m.frames !== FRACTURE_FRAMES || m.fps !== 12 ||
        m.cell !== 128 || m.worldSize !== 124 ||
        m.anchor?.[0] !== 64 || m.anchor?.[1] !== 88 ||
        JSON.stringify(m.directions) !== JSON.stringify(FRACTURE_DIRECTIONS)) return false;
    return FRACTURE_DIRECTIONS.every(dir => {
        const a = m.atlases?.[dir];
        return a?.file === `fracture-${dir}.png` &&
            /^[a-f0-9]{64}$/.test(a.sha256 ?? '');
    });
}

// Deterministic appearance choice, independent of spawn RNG and game authority.
// Applied only if the complete source geometry artwork passed owner approval.
// Injured body types stay on their exact source-authored injury death actions.
export function eligibleHollowFracture(entityId, injury = 'standard') {
    // The original visual roster is about 25% wholly intact Hollowed;
    // doubling chance rolls reduced the explosion to ~7% of total kills.
    // Use every intact source-geometry variant; damaged rigs remain protected.
    return injury === 'standard' && Number.isSafeInteger(entityId) && entityId >= 0;
}

export function createHollowFractureAssets(baseUrl) {
    let loading = null, approved = false;
    const frames = new Map();
    const ready = () => approved && frames.size === FRACTURE_DIRECTIONS.length;
    function preload() {
        return loading ??= fetch(new URL('manifest.json',baseUrl))
            .then(r => { if (!r.ok) throw Error('No authored Hollowed fracture manifest'); return r.json(); })
            .then(async manifest => {
                if (!isApprovedHollowFractureManifest(manifest)) return false;
                const images = await Promise.all(FRACTURE_DIRECTIONS.map(direction => {
                    const a = manifest.atlases[direction];
                    return new Promise((resolve,reject) => {
                        const image = new Image();
                        image.onload = () => image.naturalWidth === FRACTURE_FRAMES*128 &&
                            image.naturalHeight === 128 ? resolve([direction,image]) :
                            reject(Error('Wrong source-fracture atlas size: '+direction));
                        image.onerror = () => reject(Error('Missing source-fracture atlas: '+direction));
                        image.src = new URL(a.file+'?v='+a.sha256.slice(0,16),baseUrl).href;
                    });
                }));
                // All or nothing: never show missing directions or mismatch the rig.
                for (const [direction,image] of images) frames.set(direction,image);
                approved = true;
                return true;
            }).catch(() => false);
    }
    function draw(ctx,corpse,age,reducedMotion=false) {
        if (!ready() || !Number.isFinite(age) || age < 0 || corpse.deathInjury !== 'standard') return false;
        const image = frames.get(corpse.direction);
        if (!image) return false;
        const frame = reducedMotion ? FRACTURE_FRAMES-1 : clamp(Math.floor(age*12),0,FRACTURE_FRAMES-1);
        const size = 124*clamp((Number(corpse.radius)||11)/11,.65,1.8)*
            clamp(Number(corpse.visualScale)||1,.9,1.1);
        ctx.save();
        ctx.globalAlpha *= age < 3 ? 1 : clamp(4-age,0,1);
        ctx.imageSmoothingEnabled = false;
        ctx.filter = 'none';
        ctx.drawImage(image,frame*128,0,128,128,
            corpse.x-64/128*size,corpse.y-88/128*size,size,size);
        ctx.restore();
        return true;
    }
    return {preload,ready,draw};
}

// SAME emitter wire shape as the universal GPU lighting engine (contracts.d.ts).
// The legacy Canvas Hunt consumes a view-only adapter until GPU scene adoption.
// This does NOT add light for ordinary collapses or unapproved assets.
export function hollowFractureEmitters(corpses, clock, reducedMotion=false) {
    if (!Number.isFinite(clock)) return [];
    const lights = [];
    for (const corpse of corpses?.values?.() ?? []) {
        if (corpse.deathStyle !== 'fracture' || !Number.isSafeInteger(corpse.entityId)) continue;
        const age = clock-corpse.at;
        if (!Number.isFinite(age) || age < .38 || age >= 1.38) continue;
        const release = clamp((age-.38)/.22,0,1);
        const decay = clamp((1.38-age)/.80,0,1);
        const strength = (reducedMotion ? .45 : .85)*Math.min(release,decay);
        if (strength <= .005) continue;
        const body = clamp(Number(corpse.radius)||11,6,20);
        lights.push({
            id:`hollow-fracture:${corpse.entityId}:ember`,
            ownerId:`hollow-fracture:${corpse.entityId}`,
            type:'point',enabled:true,
            position:[corpse.x,corpse.y,body*.62],direction:[0,0,-1],
            color:'#f78a39',intensity:strength,range:body*7.5,
            coneAngle:Math.PI/4,penumbra:0,castsShadow:false,priority:2

        });
    }
    return lights.sort((a,b) => b.intensity-a.intensity || a.id.localeCompare(b.id))
        .slice(0,MAX_VISIBLE_LIGHTS);
}

export function hollowFractureCanvasLights(emitters) {
    return emitters.map(e => ({
        x:e.position[0], y:e.position[1], radius:e.range, strength:e.intensity,
        type:'corpse-fracture',family:'fire',center:[247,138,57],edge:[126,48,24],surge:false
    }));
}

/** Merge into the existing GPU snapshot without mutating C# authoritative input. */
export function withHollowFractureLightingFrame(frame, emitters) {
    if (!frame || !Array.isArray(emitters) || emitters.length === 0) return frame;
    // Explicit G1/G5 zero-light diagnostics must remain truly black. A VFX
    // descriptor must not re-enable world illumination behind the engine's back.
    const zero = frame.environment?.ambient === 0 && frame.environment?.emission === false &&
        (frame.lights ?? []).every(light => !light.enabled || light.intensity === 0);
    if (zero) return frame;
    return {...frame,lights:[...(frame.lights ?? []),...emitters]};
}
