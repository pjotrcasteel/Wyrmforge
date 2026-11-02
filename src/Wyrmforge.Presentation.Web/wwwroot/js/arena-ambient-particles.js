// Hunt 1.0 ambient ash and embers (H7). Cosmetic only: it reads the influence band and the visual clock, never touches
// C# state, and the same inputs always give the same particles. Anchored in world space so the camera pans across them.
export const AMBIENT_PARTICLE_COUNTS = Object.freeze([0, 36, 84, 150]);
export const EMBER_COLOR = '#ff7a1a';
export const ASH_COLOR = '#8d8780';
const RISE_UNITS = 72;

function hash01(index, salt) {
    let h = (Math.imul(index + 1, 0x9E3779B1) ^ Math.imul(salt + 1, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    h = Math.imul(h ^ (h >>> 12), 0x297A2D39) >>> 0;
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** Share of embers (rest is grey ash): none in Scorched, rising through Burning to mostly embers in Volcanic. */
function emberShare(band) {
    return band >= 3 ? 0.7 : band === 2 ? 0.35 : 0;
}

export function ambientParticles(band, seconds, world, reducedMotion = false) {
    const count = AMBIENT_PARTICLE_COUNTS[Math.min(AMBIENT_PARTICLE_COUNTS.length - 1, Math.max(0, band | 0))];
    const time = reducedMotion || !Number.isFinite(seconds) ? 0 : seconds;
    const particles = [];
    for (let i = 0; i < count; i++) {
        const life = 5 + hash01(i, 1) * 4;
        const phase = (time / life + hash01(i, 2)) % 1;
        const ember = hash01(i, 3) < emberShare(band);
        const sway = Math.sin((phase + hash01(i, 4)) * Math.PI * 2) * 10;
        particles.push({
            x: hash01(i, 5) * world.width + sway,
            y: hash01(i, 6) * world.height - phase * RISE_UNITS,
            size: ember && hash01(i, 7) > 0.8 ? 2 : 1,
            alpha: Math.sin(phase * Math.PI) * (ember ? 0.85 : 0.45),
            ember,
        });
    }
    return particles;
}

/** Draws only the particles inside the view, snapped to whole pixels. Returns how many were drawn. */
export function drawAmbientParticles(ctx, particles, view) {
    let drawn = 0;
    ctx.save();
    for (const particle of particles) {
        if (particle.alpha <= 0.02 || particle.x < view.x || particle.y < view.y ||
            particle.x > view.x + view.width || particle.y > view.y + view.height) continue;
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.ember ? EMBER_COLOR : ASH_COLOR;
        ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
        drawn++;
    }
    ctx.restore();
    return drawn;
}
