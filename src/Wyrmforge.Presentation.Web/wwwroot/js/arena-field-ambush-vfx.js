// Hunt 1.0 field ambush, presentation only. C# marks the exact spots a ring will break out of (`snapshot.fieldAmbush`, Progress 0 to 1 over the
// tell) and then spawns the enemies already crawling out (`enemy.emergeProgress`); this draws only the loose earth over the ground (pebbles hopping, dust lifting) and the dirt and chips thrown as each one climbs out. No rings, no markers:
// the ground itself is the warning. Drawn unlit over the composite so it reads in the dark. Nothing here decides who appears or where.
const EARTH = ['#5a4632', '#3d2f22', '#6b5a41', '#2c231a'];
const FLECK = '#4f6a3a';

/** Deterministic 0..1 value from a position, so each fissure and chip keeps its own shape for the whole effect. */
export function markUnit(x, y, salt) {
    let h = (Math.imul(Math.round(x * 4) + 17, 0x9E3779B1) ^ Math.imul(Math.round(y * 4) + salt, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
}

const PEBBLES = 7;

/** Draws the loose earth of a running tell; returns how many pebbles were drawn (0 when there is none). */
export function drawFieldAmbushTell(ctx, ambush, seconds = 0, reducedMotion = false) {
    if (!ambush?.marks?.length) return 0;
    const progress = Math.max(0, Math.min(1, ambush.progress ?? 0));
    let drawn = 0;
    ctx.save();
    for (const mark of ambush.marks) {
        const { x, y } = mark, body = Math.max(8, mark.radius || 12);
        // Pebbles hop out of the real cleft C# is cutting, faster and higher as it opens; with reduced motion they sit still.
        for (let pebble = 0; pebble < PEBBLES; pebble++) {
            const angle = markUnit(x, y, 100 + pebble) * Math.PI * 2, spread = body * (.2 + markUnit(x, y, 120 + pebble) * 1.1 + progress * .5);
            const t = reducedMotion ? .5 : (seconds * (1.6 + markUnit(x, y, 140 + pebble)) + markUnit(x, y, 160 + pebble)) % 1;
            const lift = Math.sin(Math.PI * t) * (2 + progress * 9);
            ctx.fillStyle = EARTH[pebble % EARTH.length];
            const size = 1 + (pebble % 2);
            ctx.fillRect(Math.round(x + Math.cos(angle) * spread), Math.round(y + Math.sin(angle) * spread * .55 - lift), size, size);
            drawn++;
        }
        // Dust lifts off the fissure in the second half of the tell.
        if (progress > .45) {
            ctx.fillStyle = `rgba(88,72,54,${(progress - .45) * .5})`;
            for (let puff = 0; puff < 4; puff++) {
                const dx = (markUnit(x, y, 180 + puff) - .5) * body * 2.4, rise = (progress - .45) * (6 + markUnit(x, y, 190 + puff) * 10);
                ctx.fillRect(Math.round(x + dx), Math.round(y - rise), 2 + (puff % 2), 2);
            }
        }
    }
    ctx.restore();
    return drawn;
}

/**
 * The dirt thrown as one enemy climbs out (`progress` is C#'s 0 to 1): chips and flecks burst from its root in the first third, then a few
 * grains keep falling and dust thins out. Deterministic from the entity, so every frame of the same moment is the same picture.
 */
export function drawEmergeParticles(ctx, x, y, entityId, progress) {
    if (!(progress > 0 && progress < 1)) return 0;
    let drawn = 0;
    ctx.save();
    const burst = Math.min(1, progress / .4);
    for (let chip = 0; chip < 12; chip++) {
        const angle = markUnit(entityId, chip, 7) * Math.PI * 2, speed = 8 + markUnit(entityId, chip, 8) * 22;
        const out = speed * burst, lift = Math.sin(Math.PI * burst) * (6 + markUnit(entityId, chip, 9) * 12);
        ctx.globalAlpha = 1 - burst * .85;
        ctx.fillStyle = chip % 5 === 0 ? FLECK : EARTH[chip % EARTH.length];
        const size = 1 + (chip % 3 === 0 ? 1 : 0);
        ctx.fillRect(Math.round(x + Math.cos(angle) * out), Math.round(y + Math.sin(angle) * out * .5 - lift), size, size);
        drawn++;
    }
    // Dust hangs at the root and thins as the enemy gets clear.
    ctx.globalAlpha = (1 - progress) * .45;
    ctx.fillStyle = '#6b5a41';
    for (let puff = 0; puff < 5; puff++) {
        const dx = (markUnit(entityId, puff, 21) - .5) * 22, rise = progress * (6 + markUnit(entityId, puff, 22) * 10);
        ctx.fillRect(Math.round(x + dx), Math.round(y - 2 - rise), 3, 2);
        drawn++;
    }
    ctx.restore();
    return drawn;
}
