// Hunt 1.0 field ambush tell. C# marks the exact spots an ambush ring will burst from (`snapshot.fieldAmbush`, Progress 0 to 1 over about a
// second); this only draws them: a jagged split in the ground that opens, an ember ring that closes on the body about to surface, and a
// flare as the tell ends. Drawn unlit over the composite so the warning reads in the dark. Nothing here decides who appears or where.
const ring = (ctx, x, y, radius, color, width) => {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .55, 0, 0, Math.PI * 2); ctx.stroke();
};

/** Deterministic 0..1 value from a mark's position, so each crack star keeps its own shape for the whole tell. */
export function markUnit(x, y, salt) {
    let h = (Math.imul(Math.round(x * 4) + 17, 0x9E3779B1) ^ Math.imul(Math.round(y * 4) + salt, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
}

/** Draws the marks of a running tell; returns how many were drawn (0 when there is none). */
export function drawFieldAmbushTell(ctx, ambush, seconds = 0, reducedMotion = false) {
    if (!ambush?.marks?.length) return 0;
    const progress = Math.max(0, Math.min(1, ambush.progress ?? 0));
    const beat = reducedMotion ? 1 : .75 + .25 * Math.sin(seconds * 22 + progress * 9);
    let drawn = 0;
    ctx.save();
    for (const mark of ambush.marks) {
        const { x, y } = mark, body = Math.max(8, mark.radius || 12);
        const reach = body * (1.7 + progress * 2.8);
        // The split: six to nine jagged arms that lengthen as the ground opens.
        const arms = 6 + Math.floor(markUnit(x, y, 1) * 4), turn = markUnit(x, y, 2) * Math.PI;
        ctx.lineCap = 'square';
        for (let arm = 0; arm < arms; arm++) {
            const angle = turn + arm * Math.PI * 2 / arms + (markUnit(x, y, 10 + arm) - .5) * .5;
            const length = reach * (.55 + markUnit(x, y, 30 + arm) * .6);
            let px = x, py = y;
            ctx.beginPath(); ctx.moveTo(px, py);
            for (let step = 1; step <= 3; step++) {
                const wobble = (markUnit(x, y, 50 + arm * 3 + step) - .5) * .7;
                px = x + Math.cos(angle + wobble) * length * step / 3;
                py = y + Math.sin(angle + wobble) * length * step / 3 * .55;
                ctx.lineTo(px, py);
            }
            ctx.strokeStyle = 'rgba(8,3,3,.9)'; ctx.lineWidth = 4; ctx.stroke();
            ctx.strokeStyle = `rgba(255,${Math.round(70 + 90 * progress)},26,${(.45 + .55 * progress) * beat})`; ctx.lineWidth = 2; ctx.stroke();
            drawn++;
        }
        // The ember ring closes from three bodies out to one.
        ring(ctx, x, y, body * (4.6 - 3.2 * progress), `rgba(255,${Math.round(60 + 80 * progress)},30,${(.4 + .6 * progress) * beat})`, 2.5);
        ring(ctx, x, y, body * (1.15 + .35 * (1 - progress)), `rgba(255,170,70,${.35 + .55 * progress})`, 1.5);
        // A dark pit under the mark, and a white-hot flare in the last tenth of the tell.
        ctx.fillStyle = `rgba(6,2,2,${.35 + .4 * progress})`;
        ctx.beginPath(); ctx.ellipse(x, y, body * .9, body * .5, 0, 0, Math.PI * 2); ctx.fill();
        if (progress > .88) {
            ctx.fillStyle = `rgba(255,214,140,${(progress - .88) / .12 * .8})`;
            ctx.beginPath(); ctx.ellipse(x, y, body * 1.3, body * .7, 0, 0, Math.PI * 2); ctx.fill();
        }
        drawn++;
    }
    ctx.restore();
    return drawn;
}
