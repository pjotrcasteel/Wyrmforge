// Presentation-only Fireball morphology. The C# recipe owns available mutations;
// the C# combat snapshots own positions, hit geometry, triggers and persistence.
// Never create new hits or projectiles here. Shared by Nexus and Hunt.
export const FireballMutation = Object.freeze({
    MeteorHeart: 1, Detonation: 2, ScorchedEarth: 3, CinderNeedle: 4,
});
const bit = id => 1 << (id - 1);
const bounded = (value, low, high) => Math.min(high, Math.max(low, Number(value) || low));

export function fireballMorphology(recipe) {
    const mask = recipe?.version === 1 && Number.isInteger(recipe.mutationMask) ? recipe.mutationMask : 0;
    const meteor = (mask & bit(FireballMutation.MeteorHeart)) !== 0;
    const needle = (mask & bit(FireballMutation.CinderNeedle)) !== 0;
    const fallbackShape = meteor && needle ? 'molten-spine' : meteor ? 'meteor' : needle ? 'needle' : 'flame';
    const validShapes = ['flame', 'meteor', 'needle', 'molten-spine'];
    // Prefer the already-resolved C# anatomy; old snapshots may have only the mask.
    const body = recipe?.version === 1 && validShapes.includes(recipe.coreShape) ? recipe.coreShape : fallbackShape;
    return {
        body,
        detonation: recipe?.version === 1 && typeof recipe.detonation === 'boolean'
            ? recipe.detonation : (mask & bit(FireballMutation.Detonation)) !== 0,
        scorchedEarth: recipe?.version === 1 && typeof recipe.scorchedEarth === 'boolean'
            ? recipe.scorchedEarth : (mask & bit(FireballMutation.ScorchedEarth)) !== 0,
    };
}


// Reuse the owner's canonical source Fireball painting in both Nexus and Hunts.
// The painting is a TEMPORARY emissive UI/VFX source; real GPU albedo/normal/depth
// layers belong to the universal lighting engine's later migration.
const fireballArtwork = typeof Image === 'function' ? new Image() : null;
const awaitingNexus = new Set();
export function fireballArtworkReady() { return artworkReady; }
let artworkReady = false;
if (fireballArtwork) {
    fireballArtwork.onload = () => {
        artworkReady = true;
        for (const item of awaitingNexus) drawFireballNexusPreview(item.canvas, item.recipe);
        awaitingNexus.clear();
    };
    fireballArtwork.src = new URL('../art/fireball-ritual-hero.png', import.meta.url).href;
}

function drawAuthoredCore(ctx, radius, morphology, reducedMotion) {
    if (!artworkReady || typeof ctx.drawImage !== 'function') return false;
    const size = Math.max(12, Math.round(radius * 2.6));
    const r = Math.max(2, radius);
    const u = Math.max(1, r / 9);
    const needle = morphology.body === 'needle' || morphology.body === 'molten-spine';
    const meteor = morphology.body === 'meteor' || morphology.body === 'molten-spine';
    ctx.save();
    if (needle) {
        // Cinder Needle keeps Fireball's real molten texture, but reshapes
        // its BODY into a projectile rather than putting a filter over it.
        ctx.beginPath();
        ctx.moveTo(-r * 1.35, -r * .48);
        ctx.lineTo(r * .42, -r * .65);
        ctx.lineTo(r * 1.5, 0);
        ctx.lineTo(r * .42, r * .65);
        ctx.lineTo(-r * 1.35, r * .48);
        ctx.closePath();
        ctx.clip();
    }
    ctx.drawImage(fireballArtwork, -size / 2, -size / 2, size, size);
    ctx.restore();
    if (meteor) {
        // Heavy matte basalt plates interrupt the actual fiery surface.
        ctx.fillStyle = '#2c2529';
        for (const [x, y, w, h] of [
            [-7,-4,4,3],[-4,-7,6,2],[3,-6,4,3],
            [-9,0,3,4],[6,-2,3,5],[-6,5,5,2],[1,6,5,2],
        ]) ctx.fillRect(x * u, y * u, w * u, h * u);
        ctx.fillStyle = '#f7af57';
        ctx.fillRect(-2 * u, -5 * u, u, 4 * u);
        ctx.fillRect(-3 * u, -u, 7 * u, u);
        ctx.fillRect(2 * u, u, u, 4 * u);
    }
    if (needle) {
        ctx.fillStyle = '#ffd99a';
        ctx.fillRect(3 * u, -u, 7 * u, 2 * u);
        ctx.fillStyle = '#e66f31';
        ctx.fillRect(-7 * u, -u, 6 * u, 2 * u);
    }
    if (morphology.detonation) {
        ctx.fillStyle = '#ffe1a3';
        ctx.fillRect(-3 * u, -4 * u, 2 * u, u);
        ctx.fillRect(2 * u, 3 * u, 2 * u, u);
        if (!reducedMotion) ctx.fillRect(5 * u, -3 * u, u, u);
    }
    if (morphology.scorchedEarth && !reducedMotion) {
        ctx.fillStyle = '#ed8036';
        ctx.fillRect(-6 * u, 7 * u, 2 * u, u);
        ctx.fillRect(4 * u, 8 * u, 2 * u, u);
    }
    return true;
}

function drawBody(ctx, radius, morphology, reducedMotion) {
    const u = Math.max(1, Math.round(bounded(radius, 2, 80) / 9));
    const fill = (color, x, y, w, h) => {
        ctx.fillStyle = color;
        ctx.fillRect(x * u, y * u, w * u, h * u);
    };
    const needle = morphology.body === 'needle' || morphology.body === 'molten-spine';
    const meteor = morphology.body === 'meteor' || morphology.body === 'molten-spine';
    if (needle) {
        // Both compact Cinder Needle and the authored dense Meteor+Needle hybrid
        // retain their physical identity. Only C# decides their combined speed/damage.
        fill('#592d2a', -9, -2, 11, 4);
        fill(meteor ? '#392c30' : '#b8522e', -7, -3, 9, 6);
        fill('#df7136', -5, -2, 11, 4);
        fill('#ffd085', -2, -1, 9, 2);
        fill('#ffe1a0', 5, 0, 3, 1);
        if (meteor) {
            fill('#231f25', -6, -3, 4, 2);
            fill('#32242a', -1, 2, 3, 2);
            fill('#ff8c44', -3, -3, 2, 1);
        }
    } else if (meteor) {
        // One cracked and weighty shell, not a Fireball image with a black overlay.
        fill('#39272a', -7, -5, 12, 10);
        fill('#261f25', -5, -7, 9, 14);
        fill('#572b27', -8, -2, 16, 5);
        fill('#32272a', 4, -4, 4, 8);
        fill('#e66a2d', -5, -1, 12, 2);
        fill('#f7a14a', -1, -5, 2, 11);
        fill('#ffcc75', 2, -1, 4, 2);
        fill('#b84b2b', -4, 4, 3, 2);
    } else {
        fill('#80372c', -7, -4, 11, 8);
        fill('#c75b32', -5, -6, 11, 12);
        fill('#ee9045', -2, -5, 10, 10);
        fill('#ffd28a', 1, -3, 7, 6);
        fill('#f9dd9a', 5, -1, 3, 2);
        fill('#ae482a', -8, 2, 5, 2);
    }
    if (morphology.detonation) {
        // Pressure fissures in the SAME core. No decorative second projectile.
        fill('#f7b45b', -4, -5, 2, 1);
        fill('#ffe0a1', -1, 3, 3, 1);
        if (!reducedMotion) fill('#f3a15b', 1, -8, 2, 1);
    }
    if (morphology.scorchedEarth) {
        // Molten material shed from the body; the ground hazard is separately
        // rendered only when C# actually reports a burning-ground instance.
        fill('#cf5c2b', -5, 7, 2, 2);
        if (!reducedMotion) fill('#f7aa53', 3, 8, 2, 1);
    }
}

export function drawComposedFireProjectile(ctx, event, recipe, reducedMotion = false) {
    if (!event) return;
    const morph = fireballMorphology(recipe);
    const radius = bounded(event.radius, 2, 80);
    const u = Math.max(1, Math.round(radius / 9));
    ctx.save();
    if (!reducedMotion) {
        const speedTrail = morph.body === 'needle' || morph.body === 'molten-spine' ? 14 : 9;
        ctx.fillStyle = morph.body === 'meteor' ? '#8b4130' : '#b85832';
        ctx.fillRect(-speedTrail * u, -u, 7 * u, 2 * u);
        ctx.fillStyle = '#eb9046';
        ctx.fillRect(-speedTrail * u - 3 * u, 0, 4 * u, u);
        if (morph.body === 'meteor') {
            ctx.fillStyle = '#382b2b';
            ctx.fillRect(-10 * u, -4 * u, 2 * u, 2 * u);
        }
    }
    if (!drawAuthoredCore(ctx, radius, morph, reducedMotion)) drawBody(ctx, radius, morph, reducedMotion);
    ctx.restore();
}

export function drawComposedFireImpact(ctx, event, recipe, reducedMotion = false) {
    if (!event) return;
    const morph = fireballMorphology(recipe);
    const t = bounded(event.progress, 0, 1);
    if (t >= 1) return;
    const rank = bounded(event.rank, 1, 3);
    const actualExplosion = morph.detonation && Number(event.splashRadius) > 0;
    // Only real enemy hits carry C# splash geometry. Wall impacts provide
    // feedback but cannot pretend to have damaged an area.
    const radius = actualExplosion
        ? bounded(event.splashRadius, 1, 400) * (.42 + .58 * t)
        : (11 + rank * 6) * (.45 + t * .84) * (event.surge ? 1.36 : 1);
    const count = reducedMotion ? 5 : actualExplosion ? 12 : 6;
    const fragment = Math.max(2, Math.round(radius * .12));
    ctx.save();
    ctx.globalAlpha *= 1 - t;
    ctx.fillStyle = morph.body === 'meteor' || morph.body === 'molten-spine' ? '#3a2829' : '#d26033';
    ctx.fillRect(-radius * .22, -radius * .22, radius * .44, radius * .44);
    ctx.fillStyle = '#ffba6c';
    ctx.fillRect(-radius * .1, -radius * .1, radius * .2, radius * .2);
    for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count + .19;
        const distance = radius * (.43 + (i % 3) * .16);
        ctx.fillStyle = morph.body === 'meteor' || morph.body === 'molten-spine'
            ? i % 3 === 0 ? '#35272a' : '#ed7e39'
            : i % 3 === 0 ? '#ffe2a0' : '#c15e33';
        ctx.fillRect(Math.round(Math.cos(angle) * distance), Math.round(Math.sin(angle) * distance),
            fragment, fragment);
    }
    ctx.restore();
}

export function drawBurningGround(ctx, ground, reducedMotion = false) {
    if (!ground || !(ground.remainingSeconds > 0) || !(ground.radius > 0)) return;
    // Every fracture lies INSIDE the C# authoritative burning-ground radius.
    const radius = bounded(ground.radius, 1, 400);
    const alpha = Math.min(.9, ground.remainingSeconds / .45);
    ctx.save();
    ctx.translate(ground.x, ground.y);
    ctx.globalAlpha *= alpha;
    ctx.lineCap = 'square';
    ctx.lineWidth = Math.max(2, radius / 25);
    const cracks = reducedMotion ? 4 : 7;
    for (let i = 0; i < cracks; i++) {
        const a = i * Math.PI * 2 / cracks + .23;
        ctx.strokeStyle = i % 2 ? '#bd4b26' : '#f69840';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * .12, Math.sin(a) * radius * .12);
        ctx.lineTo(Math.cos(a + .1) * radius * .47, Math.sin(a + .1) * radius * .47);
        ctx.lineTo(Math.cos(a - .07) * radius * .83, Math.sin(a - .07) * radius * .83);
        ctx.stroke();
    }
    ctx.restore();
}

export function drawFireballNexusPreview(canvas, recipe) {
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    const scale = Math.min(canvas.width, canvas.height) / 54;
    ctx.scale(scale, scale);
    drawComposedFireProjectile(ctx, { radius: 17, rank: 1 }, recipe, true);
    ctx.restore();
    canvas.dataset.artwork = artworkReady ? 'canonical' : 'fallback';
    if (!artworkReady && fireballArtwork) awaitingNexus.add({ canvas, recipe });
}
