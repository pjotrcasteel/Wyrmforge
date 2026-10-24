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
    const progress = Math.max(0, Math.min(1, Number(event.progress) || 0));
    if (progress >= 1) return;
    const rank = bounded(event.rank, 1, 3);
    const actualExplosion = morph.detonation && Number(event.splashRadius) > 0;
    // Real enemy impacts carry the actual simulation radius. Wall contacts
    // remain cosmetic, with NO pretend damaging explosion.
    const maxRadius = actualExplosion
        ? bounded(event.splashRadius, 1, 400)
        : (11 + rank * 6) * (event.surge ? 1.36 : 1);
    const radius = maxRadius * (.34 + .66 * progress);
    const fragments = reducedMotion ? 6 : actualExplosion ? 16 : 9;
    const stone = morph.body === 'meteor' || morph.body === 'molten-spine';
    const unit = Math.max(2, Math.round(maxRadius / 17));
    const fade = Math.pow(1 - progress, .65);
    ctx.save();
    ctx.globalAlpha *= fade;
    // Fireball collapses into one hot, fractured center, not multiple fake shots.
    const fill = (color, x, y, w, h) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    };
    const core = Math.max(6, radius * .22);
    if (!reducedMotion && progress < .42) {
        const flash = .42 - progress;
        ctx.globalAlpha *= .75 + flash;
        fill('#6f3124', -core * 1.4, -core * 1.2, core * 2.8, core * 2.4);
    }
    fill(stone ? '#282229' : '#9a402a', -core, -core, core * 2, core * 2);
    fill('#b94f2b', -core * .7, -core * .6, core * 1.5, core * 1.1);
    fill('#faac55', -core * .4, -core * .4, core * .85, core * .8);
    fill('#ffe1a0', -core * .13, -core * .2, core * .35, core * .35);

    // Reproducible, angular fragments inherit the volcanic/fire materials.
    // No random state and no particle allocations per frame.
    for (let i = 0; i < fragments; i++) {
        const angle = i * Math.PI * 2 / fragments + .23;
        const distance = radius * (.64 + (i % 4) * .085);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const size = Math.max(2, Math.round(unit * (i % 3 === 0 ? 1.6 : 1)));
        fill(stone && i % 3 === 0 ? '#33252a' : i % 3 === 1 ? '#f7a052' : '#c65b31', x, y, size, size);
        if (i % 3 === 0) fill('#ffcf78', x + size, y - 1, Math.max(2, size * .55), Math.max(2, size * .55));
    }
    // An irregular rupture across the SAME C# blast area. Never a perfect
    // neon circle around the projectile or a second damage event.
    if (actualExplosion) {
        ctx.lineWidth = Math.max(2, maxRadius * .065);
        ctx.strokeStyle = '#f48e3c';
        for (let i = 0; i < (reducedMotion ? 4 : 7); i++) {
            const angle = i * Math.PI * 2 / 7 + .19;
            const kink = radius * .12;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * core, Math.sin(angle) * core);
            ctx.lineTo(Math.cos(angle + .14) * radius * .55 + kink, Math.sin(angle + .14) * radius * .55);
            ctx.lineTo(Math.cos(angle) * radius * .92, Math.sin(angle) * radius * .92);
            ctx.stroke();
        }
    }
    ctx.restore();
}

export function drawBurningGround(ctx, ground, reducedMotion = false) {
    if (!ground || !(ground.remainingSeconds > 0) || !(ground.radius > 0)) return;
    // The actual C# hazard owns radius, position and lifetime. There is exactly
    // one charred patch for one real damaging field, never a simulated extra hit.
    const radius = bounded(ground.radius, 1, 400);
    const alpha = Math.min(.95, ground.remainingSeconds / .55);
    const count = reducedMotion ? 6 : 11;
    const seed = (Math.abs(Math.floor(ground.x * 7 + ground.y * 11)) % 13) * .029;
    ctx.save();
    ctx.translate(ground.x, ground.y);
    ctx.globalAlpha *= alpha;
    const fill = (color, x, y, w, h) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    };
    const emberSize = Math.max(2, Math.min(6, Math.round(radius * .065)));
    // Deep scorched irregular patches preserve the rock/material identity.
    for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count + seed;
        const r = radius * (.2 + (i % 5) * .14);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        fill(i % 2 ? '#3b2926' : '#432b29', x - emberSize * 1.3, y - emberSize,
            emberSize * (i % 3 + 2.5), emberSize * 1.7);
        if (i % 3 !== 0) fill(i % 2 ? '#c45d2d' : '#ee8b3d', x, y, emberSize, Math.max(2, emberSize * .5));
    }
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count + seed;
        const wave = (i % 3) * .08;
        const start = radius * (.12 + (i % 2) * .09);
        const end = radius * (.68 + wave);
        ctx.strokeStyle = i % 4 === 0 ? '#ffbd61' : i % 2 === 0 ? '#d96b30' : '#a94a2b';
        ctx.lineWidth = Math.max(2, radius / (i % 4 === 0 ? 30 : 40));
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * start, Math.sin(angle) * start);
        ctx.lineTo(Math.cos(angle + .22) * radius * .43, Math.sin(angle + .22) * radius * .43);
        ctx.lineTo(Math.cos(angle - .09) * end, Math.sin(angle - .09) * end);
        ctx.stroke();
        if (i % 2 === 0) {
            fill('#ffc078', Math.cos(angle) * end - 1, Math.sin(angle) * end - 1,
                emberSize * .55, emberSize * .55);
        }
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
    if (canvas.dataset) canvas.dataset.artwork = artworkReady ? 'canonical' : 'fallback';
    if (!artworkReady && fireballArtwork) awaitingNexus.add({ canvas, recipe });
}
