// L3 Lighting Lab only. These are visual calibration emitters, NEVER gameplay
// entities, saved world props, or replacements for C# spell snapshots.
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const FIRE = Object.freeze([255, 139, 66]);

export function calibrationEmitters({ fireball = true, torch = false, progress = .5 } = {}) {
    const result = [];
    if (fireball) {
        const p = clamp(Number.isFinite(progress) ? progress : .5, 0, 1);
        result.push({
            kind: 'fireball', x: 385 + 202 * p,
            y: 692 - Math.sin(Math.PI * p) * 24,
            radius: 218, relief: .99, color: FIRE,
            progress: p, altitude: 46,
        });
    }
    if (torch) result.push({
        kind: 'torch', x: 562, y: 737, radius: 126,
        relief: .80, color: FIRE, progress: 0, altitude: 18,
    });
    return result;
}

export function drawCalibrationEmitterCores(ctx, sources) {
    for (const emitter of sources) {
        const { x, y } = emitter;
        ctx.save();
        if (emitter.kind === 'fireball') {
            // A clearly airborne orb with a trailing tail; the shadow is
            // offset toward the ground, never interpreted as collision.
            ctx.fillStyle = 'rgba(0,0,0,.14)';
            ctx.beginPath();
            ctx.ellipse(x, y + emitter.altitude, 13, 4, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.translate(x, y);
            const trail = ctx.createLinearGradient(-23, 0, 10, 0);
            trail.addColorStop(0, 'rgba(219,52,20,0)');
            trail.addColorStop(.55, 'rgba(238,91,25,.55)');
            trail.addColorStop(1, 'rgba(255,174,68,.92)');
            ctx.fillStyle = trail;
            ctx.beginPath();
            ctx.moveTo(-28, -7);
            ctx.quadraticCurveTo(-4, -15, 10, 0);
            ctx.quadraticCurveTo(-4, 15, -28, 7);
            ctx.fill();
            const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
            halo.addColorStop(0, 'rgba(255,255,218,1)');
            halo.addColorStop(.28, 'rgba(255,214,111,.98)');
            halo.addColorStop(.68, 'rgba(251,104,28,.78)');
            halo.addColorStop(1, 'rgba(233,60,18,0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, 2 * Math.PI);
            ctx.fill();
        } else if (emitter.kind === 'torch') {
            ctx.fillStyle = '#403025';
            ctx.fillRect(x - 2, y - 8, 4, 26);
            ctx.fillStyle = '#d19445';
            ctx.fillRect(x - 5, y - 10, 10, 4);
            const flame = ctx.createRadialGradient(x, y - 19, 1, x, y - 19, 14);
            flame.addColorStop(0, 'rgba(255,249,193,1)');
            flame.addColorStop(.35, 'rgba(255,168,62,.96)');
            flame.addColorStop(.75, 'rgba(236,77,20,.7)');
            flame.addColorStop(1, 'rgba(236,77,20,0)');
            ctx.fillStyle = flame;
            ctx.beginPath();
            ctx.ellipse(x, y - 18, 10, 16, 0, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.restore();
    }
}
