// Small authored 2px-pixel studies for the *existing physical* Wet Forest props.
// One named story prop = one C# collider; no new landmarks, loot or hitboxes here.
const ink = Object.freeze({
    contact: '#111815', cut: '#222622', stone: '#3b4039', face: '#4b5046',
    rim: '#66685a', lichen: '#3b483b', wet: '#272f2b',
    wood: '#302a24', plank: '#524334', split: '#695540', soot: '#201d1a',
});
const snap = n => Math.round(n / 2) * 2;
function hash(seed, id) {
    let value = (seed | 0) ^ Math.imul(id | 0, 0x9e3779b1);
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
    return (value ^ (value >>> 15)) >>> 0;
}

/** World-foot-relative marks, always attached to one destructible prop ID. */
export function createWetForestStoryArtPlan(prop, seed) {
    const kind = prop?.kind;
    if (!['grave-marker', 'waystone', 'camp-remains', 'broken-cart', 'fallen-log'].includes(kind))
        return null;
    const marks = [];
    const r = (x, y, w, h, color) => marks.push({
        x: snap(x), y: snap(y), w: Math.max(2, snap(w)), h: Math.max(2, snap(h)), color,
    });
    const variant = hash(seed, prop.id);
    const crack = (x, y) => {
        r(x, y, 2, 8, ink.cut);
        r(x + 2, y + 6, 4, 2, ink.cut);
        r(x + 4, y + 6, 2, 6, ink.cut);
    };
    // Contact darkens the actual object foot, not the player's walkable space.
    r(-18, -2, 36, 4, ink.contact);
    if (kind === 'grave-marker') {
        // Broken shoulder and hollow chisel marks on a centuries-old human slab.
        r(-12, -26, 22, 24, ink.cut);
        r(-10, -28, 18, 24, ink.stone);
        r(-8, -32, 14, 6, ink.face);
        r(-6, -34, 10, 4, ink.rim);
        if (variant % 3 === 0) r(4, -34, 6, 10, ink.cut); // Missing corner.
        r(-8, -22, 14, 2, ink.rim);
        r(-6, -16, 10, 2, ink.cut);
        r(-2, -20, 2, 12, ink.wet); // Cross-shaped *carved* incision.
        r(-6, -16, 10, 2, ink.wet);
        crack(variant % 2 ? 4 : -8, -24);
        r(6, -10, 4, 6, ink.lichen);
    } else if (kind === 'waystone') {
        // Taller tilted medieval direction-stone, not a bright ritual monolith.
        r(-12, -48, 25, 46, ink.cut);
        r(-10, -50, 20, 42, ink.stone);
        r(-8, -54, 16, 8, ink.face);
        r(-6, -56, 12, 4, ink.rim);
        r(8, -50, 4, 12, ink.wet);
        if (variant % 2 === 0) r(-8, -56, 6, 8, ink.cut);
        // Worn directional arrow is cut into the stone, never a glowing icon.
        r(-4, -34, 8, 2, ink.cut);
        r(-2, -36, 4, 6, ink.wet);
        r(2, -30, 2, 8, ink.wet);
        crack(-8, -24);
        r(-12, -12, 6, 6, ink.lichen);
        r(6, -8, 4, 4, ink.lichen);
    } else if (kind === 'camp-remains') {
        // An extinguished fire bed: collapsed shelter supports, soot, unlit stones.
        r(-24, -12, 48, 12, ink.wood);
        r(-18, -14, 36, 8, ink.soot);
        for (const [x, y] of [[-20,-12],[-14,-18],[4,-18],[16,-12],[18,-4],[-18,-4]]) {
            r(x, y, 8, 4, ink.stone);
            r(x + 2, y, 4, 2, ink.rim);
        }
        r(-42, -29, 6, 30, ink.wood);
        r(-40, -31, 32, 4, ink.plank);
        r(-8, -31, 5, 8, ink.split);
        r(27, -22, 4, 24, ink.wood);
        r(24, -20, 12, 4, ink.split);
        for (const x of [-10, -2, 8]) r(x, -9, 8, 2, ink.cut);
    } else if (kind === 'broken-cart') {
        // Rotten axle and *two damaged wheel remnants*, not two intact circles.
        r(-34, -29, 68, 26, ink.wood);
        r(-30, -31, 58, 6, ink.plank);
        r(-26, -23, 54, 4, ink.split);
        for (const x of [-24, -8, 10, 24]) r(x, -25, 4, 20, ink.cut);
        r(-38, -7, 72, 6, ink.wood);
        for (const cx of [-29, 29]) {
            r(cx - 10, -14, 16, 4, ink.split);
            r(cx - 12, -10, 4, 14, ink.plank);
            r(cx + 8, -8, 4, 10, ink.plank);
            r(cx - 8, 2, 12, 4, ink.split);
            r(cx - 2, -6, 5, 6, ink.cut);
        }
        r(30, -30, 24, 4, ink.split); // Broken shaft.
        r(46, -26, 5, 8, ink.wood);
        crack(-8, -19);
    } else {
        // Heavy fallen timber, asymmetric knots and wet longitudinal bark.
        r(-38, -15, 74, 18, ink.cut);
        r(-36, -17, 70, 13, ink.wood);
        r(-33, -17, 63, 4, ink.plank);
        r(-28, -12, 53, 2, ink.split);
        r(-18, -8, 46, 2, ink.cut);
        r(26, -21, 5, 14, ink.wood);
        r(-25, -4, 6, 12, ink.plank);
        r(-10, -19, 8, 4, ink.lichen);
        r(10, -14, 12, 4, ink.lichen);
        if (variant % 2 === 0) r(-33, -15, 8, 4, ink.soot);
    }
    if ((prop.healthFraction ?? 1) < .55) {
        r(-2, kind === 'waystone' ? -36 : -18, 4, 12, ink.cut);
        r(2, -10, 8, 2, ink.cut);
    }
    return { id: prop.id, kind, marks };
}

/** Pixel marks are painted in normal world-foot depth order, not baked into soil. */
export function drawWetForestStoryArt(ctx, prop, seed, x, y) {
    const plan = createWetForestStoryArtPlan(prop, seed);
    if (!plan) return false;
    ctx.save();
    for (const mark of plan.marks) {
        ctx.fillStyle = mark.color;
        ctx.fillRect(snap(x) + mark.x, snap(y) + mark.y, mark.w, mark.h);
    }
    ctx.restore();
    return true;
}
