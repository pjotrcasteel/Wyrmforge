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
        // A distinct, half-collapsed medieval forest refuge. Inspired by the
        // coherent world-building of D2's wilderness: roof -> beams -> ash bed,
        // rather than scattered, unrelated rectangles. This remains ONE real
        // destructible C# prop, with its visual body rising behind the foot.
        const roof = ['#191d19', '#282920', '#333127', '#494134'];
        // Ground contact and an old soot-blackened hearth below the entrance.
        r(-32, -4, 64, 6, ink.contact);
        r(-24, -12, 48, 12, ink.wood);
        r(-18, -10, 38, 6, ink.soot);
        for (const [x, y] of [[-20, -10], [-14, -16], [8, -16], [16, -10]]) {
            r(x, y, 8, 4, ink.stone);
            r(x + 2, y, 4, 2, ink.rim);
        }
        for (const x of [-10, -2, 6]) r(x, -7, 8, 2, ink.cut);
        // The interior stays dark and visibly OPEN beneath the collapsed roof.
        r(-31, -38, 61, 5, ink.cut);
        r(-27, -35, 53, 6, '#1a201c');
        r(-33, -43, 6, 41, ink.wood);
        r(-31, -43, 2, 35, ink.plank);
        r(26, -41, 6, 37, ink.wood);
        r(28, -37, 2, 26, ink.split);
        // Strong Gothic gable silhouette; the broken pitch is read at phone size.
        r(-16, -62, 25, 6, roof[0]);
        for (let i = 0; i < 9; i++) {
            const dy = i * 3;
            const leftX = -18 - i * 3;
            const rightX = 4 + i * 3;
            r(leftX, -60 + dy, 12, 4, roof[i % 3]);
            if (i < 6 || (variant >>> (i + 1)) % 3 !== 0)
                r(rightX, -60 + dy, 12, 4, roof[(i + 1) % 4]);
        }
        // Ragged wet shingles and exposed framing, never a clean triangular tent.
        for (let i = 0; i < 9; i++) {
            const x = -36 + i * 8;
            if ((variant >>> (i % 12)) & 1) continue;
            r(x, -43 + (i % 3) * 2, 6, 2, '#554638');
            r(x + 2, -41 + (i % 3) * 2, 4, 2, ink.soot);
        }
        r(-43, -34, 19, 5, ink.split);
        r(23, -34, 14, 5, ink.split);
        // Supports and fallen timber all lead back to the same collapsed hut.
        r(-39, -33, 4, 28, ink.wood);
        r(-40, -28, 2, 20, ink.plank);
        r(22, -31, 4, 16, ink.cut);
        r(28, -19, 14, 4, ink.wood);
        r(36, -15, 8, 6, ink.split);
        r(-47, -16, 19, 4, ink.wood);
        r(-45, -12, 12, 3, ink.split);
        // Minimal burnt grit: no orange glow pretending to be a live brazier.
        for (const x of [-30, -20, 22, 30])
            r(x, -3, 6, 2, '#3e3830');
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
