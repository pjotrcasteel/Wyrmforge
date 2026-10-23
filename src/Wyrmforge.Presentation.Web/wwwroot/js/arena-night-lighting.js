// All WyrmForge arenas take place at NIGHT. Rendering only: never alter
// movement, collision, saves, simulation RNG or attack timing.
// A screen-space darkness mask is punched open by REAL world-space light sources
// and then composited above terrain + actors. HUD/attack telegraphs are drawn after.
// On mobile, reuse a single viewport-sized mask rather than a giant world texture.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const isPoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.y);
export const GOTHIC_NIGHT = Object.freeze({
    darkness: .90,
    playerRadius: 125,
    playerRelief: .49, // Retain silhouette/readability without making the arena daylight.
    maximumLights: 10,
});
const warmFire = Object.freeze([255, 139, 66]);

export function gothicNightLightSources(snapshot, spellLights = [], width = 0, height = 0, fireTrees = []) {
    const lights = [];
    for (const source of spellLights ?? []) {
        if (!isPoint(source) || !Number.isFinite(source.radius) || source.radius <= 0) continue;
        const fire = source.family === 'fire' || source.family === 'frostfire';
        lights.push({
            x: source.x, y: source.y, radius: clamp(source.radius * (fire ? 1.7 : 1.35), 36, 330),
            relief: clamp((Number(source.strength) || 0) * (fire ? 1.25 : 1.0), .04, fire ? .99 : .86),
            color: fire ? warmFire : source.center ?? [180, 195, 210],
            kind: fire ? 'fire' : 'spell',
        });
    }
    for (const fire of fireTrees ?? []) {
        if (!isPoint(fire)) continue;
        lights.push({ x: fire.x, y: fire.y,
            radius: clamp((Number(fire.radius) || 90) * 1.7, 44, 250),
            relief: clamp(.65 + (Number(fire.intensity) || 0) * .9, .65, .97),
            color: warmFire, kind: 'burning-tree' });
    }
    const breath = snapshot?.dragonBreath;
    if (isPoint(breath) && (snapshot?.dragon?.school ?? snapshot?.hunt?.school) === 1) {
        const dx = Number(breath.directionX) || 0;
        const dy = Number(breath.directionY) || 0;
        const reach = clamp(Number(breath.range) || 0, 0, 420);
        if (reach > 0) lights.push({
            x: breath.x + dx * reach * .43, y: breath.y + dy * reach * .43,
            radius: clamp(reach * .8, 80, 340),
            relief: .98, color: warmFire, kind: 'wyrm-breath',
        });
    }
    // Highest-intensity sources first, deterministic stable order, bounded cost.
    return lights.filter(s => s.radius > 0 && isPoint(s) &&
        (width <= 0 || s.x + s.radius >= 0 && s.x - s.radius <= width) &&
        (height <= 0 || s.y + s.radius >= 0 && s.y - s.radius <= height))
        .sort((a, b) => b.relief - a.relief)
        .slice(0, GOTHIC_NIGHT.maximumLights);
}

export function gothicNightPlan(player, sources = [], view, options = {}) {
    const darkness = clamp(Number.isFinite(options.darkness) ? options.darkness : GOTHIC_NIGHT.darkness, .64, .97);
    const near = player && isPoint(player) ? [{
        x: player.x, y: player.y, radius: GOTHIC_NIGHT.playerRadius,
        relief: GOTHIC_NIGHT.playerRelief, color: null, kind: 'moon',
    }] : [];
    const sourcesInView = [...near, ...sources].filter(s => isPoint(s) &&
        Number.isFinite(s.radius) && s.radius > 0 &&
        s.x + s.radius >= view.x && s.y + s.radius >= view.y &&
        s.x - s.radius <= view.x + view.width && s.y - s.radius <= view.y + view.height);
    return { darkness, sources: sourcesInView, view };
}

function punchLight(mask, light, view) {
    const x = light.x - view.x, y = light.y - view.y;
    const r = light.radius;
    const alpha = clamp(light.relief, 0, 1);
    const radial = mask.createRadialGradient(x, y, 0, x, y, r);
    radial.addColorStop(0, 'rgba(0,0,0,' + alpha.toFixed(3) + ')');
    radial.addColorStop(.22, 'rgba(0,0,0,' + (alpha * .90).toFixed(3) + ')');
    radial.addColorStop(.60, 'rgba(0,0,0,' + (alpha * .52).toFixed(3) + ')');
    radial.addColorStop(1, 'rgba(0,0,0,0)');
    mask.fillStyle = radial;
    mask.fillRect(x - r, y - r, r * 2, r * 2);
}

export function drawGothicNight(ctx, plan, maskCanvas) {
    if (!ctx || !plan || !maskCanvas) return false;
    const { view } = plan;
    const width = Math.max(1, Math.ceil(view.width));
    const height = Math.max(1, Math.ceil(view.height));
    if (maskCanvas.width !== width || maskCanvas.height !== height) {
        maskCanvas.width = width;
        maskCanvas.height = height;
    }
    const mask = maskCanvas.getContext('2d');
    if (!mask) return false;
    mask.save();
    mask.setTransform(1, 0, 0, 1, 0, 0);
    mask.clearRect(0, 0, width, height);
    mask.fillStyle = 'rgba(0,0,0,' + plan.darkness.toFixed(3) + ')';
    mask.fillRect(0, 0, width, height);
    mask.globalCompositeOperation = 'destination-out';
    for (const light of plan.sources) punchLight(mask, light, view);
    mask.restore();

    ctx.save();
    ctx.drawImage(maskCanvas, view.x, view.y, width, height);
    // Subtle real fire color on the illuminated terrain, trunks and actors,
    // never a global orange filter. Bright VFX still render above this pass.
    ctx.globalCompositeOperation = 'screen';
    for (const light of plan.sources) {
        if (!light.color || light.relief < .04) continue;
        const [r, g, b] = light.color, radius = light.radius;
        const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
        const strength = clamp(light.relief * (light.kind === 'fire' || light.kind === 'wyrm-breath' ||
            light.kind === 'burning-tree' ? .47 : .24), 0, .48);
        gradient.addColorStop(0, `rgba(${r},${g},${b},${strength.toFixed(3)})`);
        gradient.addColorStop(.35, `rgba(${r},${g},${b},${(strength * .45).toFixed(3)})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
    return true;
}
