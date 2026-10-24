// Bounded decoded textures; the canonical C# snapshots own position, damage and attack timing.
const base = new URL('../art/enemies/', import.meta.url);
const images = new Map();
let manifest;
let loading;
export function mireHoundPixelPreviewEnabled() {
    const location = globalThis.location;
    if (!location || !/(^|[/])enemy-lab[/]?$/.test(location.pathname || '')) return false;
    return new URLSearchParams(location.search || '').get('mireStyle') === 'pixel';
}
export function preloadPaintedEnemies() {
    return loading ??= fetch(new URL('manifest.json', base)).then(r => {
        if (!r.ok) throw new Error('Painted manifest unavailable');
        return r.json();
    }).then(async data => {
        manifest = data;
        // The approved painted assets remain in regular hunts. In the explicit
        // developer preview we skip decoding those 768x384 sheets, using the
        // same cached native actor atlas and pixel density as the mage.
        const descriptors = [...Object.entries(data.enemies)
            .filter(([kind]) => kind !== '1' || !mireHoundPixelPreviewEnabled()).map(([, entry]) => entry),
            ...Object.values(data.wyrms)];
        await Promise.all(descriptors.flatMap(d => [[d.image,d.hash], ...(d.walkImage ? [[d.walkImage,d.walkHash]] : [])])
            .map(([name,hash]) => loadImage(name,hash)));
        return true;
    }).catch(() => false); // Native atlas remains available if art is offline.
}
function loadImage(name, hash) {
    if (images.has(name)) return images.get(name).promise;
    const image = new Image();
    const entry = { image, ready:false, promise:null };
    entry.promise = new Promise(resolve => {
        image.onload = () => { entry.ready = image.naturalWidth === 768 && image.naturalHeight === 384; resolve(entry.ready); };
        image.onerror = () => resolve(false);
        image.src = new URL(`${name}?v=${hash}`,base).href;
    });
    images.set(name,entry);
    return entry.promise;
}
export function paintedPose(enemy, gait = 0) {
    if (enemy.dead) return 7;
    if (enemy.hitFlash) return 6;
    if (enemy.frozen) return 0;
    if (enemy.telegraph) return 3;
    if (gait === 4 || gait === 5) return gait;
    if (Number(enemy.kind) === 1 && gait >= 8 && gait <= 15) return gait;
    return gait === 1 || gait === 2 ? gait : 0;
}
function draw(ctx, descriptor, pose, x, y, size, facing, opacity = 1) {
    const gait = pose >= 8;
    const entry = images.get(gait && descriptor.walkImage ? descriptor.walkImage : descriptor.image);
    if (!entry?.ready) return false;
    const frame = gait ? pose-8 : pose;
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, opacity));
    ctx.translate(x,y);
    ctx.scale(facing < 0 ? -1 : 1,1);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(entry.image,(frame%4)*192,Math.floor(frame/4)*192,192,192,-size/2,-size*180/192,size,size);
    ctx.restore();
    return true;
}
export function drawPaintedEnemy(ctx, enemy, gait = 0, facing = 1) {
    // Only the explicit developer lab art preview swaps the canine to pixels;
    // regular hunts keep their previously published art pending iPhone approval.
    if (Number(enemy?.kind) === 1 && mireHoundPixelPreviewEnabled()) return false;
    const d = manifest?.enemies?.[enemy.kind];
    if (!d) return false;
    // Match collision footprint without rescaling individual animation poses.
    const scale = Math.max(.65, Math.min(1.8, (Number(enemy.radius)||11)/(Number(enemy.kind)===1?12:11)));
    return draw(ctx,d,paintedPose(enemy,gait),enemy.x,enemy.y,d.worldSize*scale,facing,Number(enemy.opacity ?? 1));
}
export function drawPaintedWyrm(ctx, dragon, pose = 0) {
    const d = manifest?.wyrms?.[dragon.school];
    if (!d) return false;
    return draw(ctx,d,dragon.frozen?0:pose,0,dragon.radius*1.1,d.worldSize*dragon.radius/34,1);
}

// A disappearance can be a phase transition or despawn. Only actual C# death events leave bodies.
export function updatePaintedCorpses(state, bursts, motion, seconds) {
    state.corpses ??= new Map();
    state.seen ??= new Set();
    const current = new Set();
    for (const burst of bursts ?? []) {
        if (!Number.isSafeInteger(burst.entityId) || burst.kind == null) continue;
        const key = `${burst.entityId}:${burst.kind}`;
        current.add(key);
        if (state.seen.has(key)) continue;
        state.corpses.set(key,{kind:burst.kind,entityId:burst.entityId,x:burst.x,y:burst.y,
            radius:burst.bodyRadius,dead:true,facing:motion?.entities?.get(burst.entityId)?.facing ?? 1,at:seconds});
    }
    state.seen = current;
    for (const [key, corpse] of state.corpses)
        if (seconds-corpse.at >= .8 || seconds < corpse.at) state.corpses.delete(key);
    return state.corpses;
}
export function drawPaintedCorpses(ctx, state, seconds, skipHollow = false, skipAshling = false) {
    for (const corpse of state.corpses?.values() ?? [])
        if((!skipHollow||Number(corpse.kind)!==0)&&(!skipAshling||Number(corpse.kind)!==2))
        drawPaintedEnemy(ctx,{...corpse,opacity:Math.max(0,1-(seconds-corpse.at)/.8)},0,corpse.facing);
}
