// Nexus-only visual storyboard. All shapes reuse the actual Hunt morphology painters.
// This is an illustrative, deterministic ritual preview: no damage, aiming, target
// selection, collision, lifetime or gameplay calculation is performed in the browser.
import {
    drawComposedFireProjectile, drawComposedFireImpact, drawBurningGround,
} from './fireball-morphology.js';

const active = new WeakMap();
const SEQUENCE_DURATION_MS = 4200;
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));

export function fireballSequencePhase(normalizedTime) {
    const time = clamp(normalizedTime);
    if (time < .20) return { name: 'Cast', progress: time / .20 };
    if (time < .55) return { name: 'Travel', progress: (time - .20) / .35 };
    if (time < .73) return { name: 'Impact', progress: (time - .55) / .18 };
    return { name: 'Aftermath', progress: (time - .73) / .27 };
}

function drawScene(ctx) {
    // Neutral stone surface for legibility, not a duplicate Town/Hunt rendering path.
    ctx.fillStyle = '#141016';
    ctx.fillRect(0, 0, 320, 160);
    ctx.fillStyle = '#272026';
    ctx.fillRect(0, 118, 320, 42);
    ctx.fillStyle = '#433336';
    for (let index = 0; index < 10; index++) {
        const x = index * 37 + (index % 2) * 9;
        ctx.fillRect(x, 127 + index % 3 * 6, 22, 3);
    }
    ctx.fillStyle = '#594039';
    ctx.fillRect(217, 92, 5, 26);
    ctx.fillRect(213, 91, 14, 5);
    ctx.fillStyle = '#2b262d';
    ctx.fillRect(217, 88, 7, 6);
}

function drawProjectile(ctx, x, y, recipe, scale, reducedMotion) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // This calls exactly the same C#-recipe-driven pixel composer as Hunts.
    drawComposedFireProjectile(ctx, { radius: 11, rank: 1 }, recipe, reducedMotion);
    ctx.restore();
}

export function drawFireballSequenceFrame(canvas, recipe, normalizedTime, reducedMotion = false) {
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return null;
    const { name, progress } = fireballSequencePhase(normalizedTime);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(canvas.width / 320, canvas.height / 160);
    drawScene(ctx);

    if (name === 'Cast') {
        const charge = .65 + progress * .35;
        drawProjectile(ctx, 44, 83, recipe, charge * 1.5, reducedMotion);
    } else if (name === 'Travel') {
        const x = 47 + 168 * progress;
        drawProjectile(ctx, x, 83 - Math.sin(progress * Math.PI) * 6, recipe, 1.25, reducedMotion);
    } else if (name === 'Impact') {
        ctx.save();
        ctx.translate(220, 89);
        // Example-only impact data; real Hunts use C# ElementalImpactRenderSnapshot
        // with the actual splashRadius. Never put this synthetic event in RunSimulation.
        const detonation = recipe?.detonation === true || (recipe?.mutationMask & 2) !== 0;
        drawComposedFireImpact(ctx,
            { rank: 1, progress, splashRadius: detonation ? 34 : 0, surge: false },
            recipe, reducedMotion);
        ctx.restore();
    } else if (recipe?.scorchedEarth === true || (recipe?.mutationMask & 4) !== 0) {
        // One demonstration-only hazard. Real ground is drawn exclusively from
        // BurningGroundRenderSnapshot, with actual lifetime and radius.
        drawBurningGround(ctx, {
            x: 220, y: 112, radius: 40, remainingSeconds: Math.max(.001, 1 - progress),
        }, reducedMotion);
    } else {
        ctx.fillStyle = '#4d3330';
        ctx.fillRect(216, 103, 12, 3);
    }
    ctx.restore();
    canvas.dataset.phase = name;
    return name;
}

const recipeKey = recipe => recipe?.cacheKey ?? JSON.stringify(recipe ?? {});

export function syncFireballSequencePreview(canvas, recipe) {
    if (!canvas) return;
    const session = active.get(canvas);
    if (session?.key === recipeKey(recipe) && session.frame !== null) return;
    if (session?.frame !== null && session?.frame !== undefined) cancelAnimationFrame(session.frame);
    active.delete(canvas);
    drawFireballSequenceFrame(canvas, recipe, .37, true);
    canvas.dataset.phase = 'Ready';
}

export function playFireballSequencePreview(canvas, recipe) {
    if (!canvas) return;
    disposeFireballSequencePreview(canvas);
    const key = recipeKey(recipe);
    const prefersReducedMotion = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        // Honor reduced-motion: show a stable end-state without automatic movement.
        drawFireballSequenceFrame(canvas, recipe, .85, true);
        return;
    }
    const session = { frame: null, key };
    active.set(canvas, session);
    const start = performance.now();
    const advance = now => {
        if (active.get(canvas) !== session) return;
        const t = Math.min(1, (now - start) / SEQUENCE_DURATION_MS);
        drawFireballSequenceFrame(canvas, recipe, t, false);
        if (t >= 1) {
            session.frame = null;
            drawFireballSequenceFrame(canvas, recipe, .37, true);
            canvas.dataset.phase = 'Ready';
        } else {
            session.frame = requestAnimationFrame(advance);
        }
    };
    session.frame = requestAnimationFrame(advance);
}

export function disposeFireballSequencePreview(canvas) {
    const session = active.get(canvas);
    if (session?.frame !== null && session?.frame !== undefined) cancelAnimationFrame(session.frame);
    active.delete(canvas);
}
