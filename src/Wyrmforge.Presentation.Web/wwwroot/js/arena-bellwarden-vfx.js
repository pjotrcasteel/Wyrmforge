// The Bell Warden set piece (roster step 7). C# owns the toll timing, the marked spot, every shockwave radius and every hit;
// this module only draws what the snapshot reports: the bell sigil it steps out of, the rolling shockwave rings, and its bar.
import { drawEnemyPixelArt } from './arena-enemy-art.js';

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const BELL_WARDEN_KIND = 9;
const BELL_OF_WINTER_KIND = 17;
// The road's set piece is chosen by region (C# snapshot `variant`); everything here shares one layout, only the voice changes.
const VARIANTS = {
    fire: { kind: BELL_WARDEN_KIND, name: 'THE BELL WARDEN', cracked: 'CRACKED', warning: 'THE TOLL SPLITS', frame: 'rgba(214, 160, 72, 0.6)',
        title: '#e8c27a', bar: '#b08a3c', barCracked: '#d9783a', notch: 'rgba(240, 210, 122, 0.85)',
        markFill: [90, 64, 24], markEdge: [232, 194, 122], echo: [255, 214, 140] },
    winter: { kind: BELL_OF_WINTER_KIND, name: 'THE BELL OF WINTER', cracked: 'DEEP WINTER', warning: 'MORE RINGS • MORE SCARS', frame: 'rgba(160, 214, 240, 0.6)',
        title: '#cfeaf8', bar: '#6fa8c8', barCracked: '#a8dcf4', notch: 'rgba(225, 245, 255, 0.85)',
        markFill: [24, 48, 70], markEdge: [180, 226, 248], echo: [225, 245, 255] },
};
export const bellVariant = bellWarden => VARIANTS[bellWarden?.variant] ?? VARIANTS.fire;
// Must match RunSimulation.BellShockwaveThickness: the drawn band is the band that can hurt.
export const BELL_SHOCKWAVE_THICKNESS = 26;

export function drawBellWardenGround(ctx, snapshot, seconds = 0, reducedMotion = false) {
    if (!snapshot) return;
    if (snapshot.bellWarden?.stage === 'tolling') drawTollingMark(ctx, snapshot.bellWarden, seconds, reducedMotion);
    for (const wave of snapshot.bellShockwaves ?? []) drawShockwave(ctx, wave);
}

// The Warden steps out of the tolling mark: fades in while the bell rings, so the body appears exactly where it will fight.
export function drawBellWardenEntrance(ctx, bellWarden) {
    if (bellWarden?.stage !== 'tolling') return;
    const p = clamp01(bellWarden.progress);
    if (p < 0.35) return;
    const fade = (p - 0.35) / 0.65;
    drawEnemyPixelArt(ctx, { kind: bellVariant(bellWarden).kind, x: bellWarden.x, y: bellWarden.y + (1 - fade) * 8, radius: 30, entityId: -1, healthRatio: 1, opacity: fade * 0.9 });
}

export function drawBellWardenBar(ctx, bellWarden, width) {
    if (bellWarden?.stage !== 'fight') return;
    const outerWidth = Math.min(320, width - 132);
    const x = (width - outerWidth) / 2;
    const y = width <= 520 ? 103 : 9;
    const barY = y + 20;
    const look = bellVariant(bellWarden);
    ctx.save();
    ctx.fillStyle = 'rgba(10, 8, 6, 0.8)';
    roundRect(ctx, x, y, outerWidth, 36, 10);
    ctx.fill();
    ctx.strokeStyle = look.frame;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '900 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = look.title;
    ctx.fillText(`${look.name}${bellWarden.cracked ? ` • ${look.cracked}` : ''}`, x + 9, y + 12);
    if (bellWarden.cracked) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ff8f86';
        ctx.font = '800 8px system-ui, sans-serif';
        ctx.fillText(look.warning, x + outerWidth - 9, y + 12);
    }
    const innerX = x + 9;
    const innerWidth = outerWidth - 18;
    ctx.fillStyle = 'rgba(8, 6, 4, 0.9)';
    roundRect(ctx, innerX, barY, innerWidth, 8, 4);
    ctx.fill();
    ctx.fillStyle = bellWarden.cracked ? look.barCracked : look.bar;
    roundRect(ctx, innerX, barY, innerWidth * clamp01(bellWarden.healthRatio), 8, 4);
    ctx.fill();
    // The half-health notch is where the bell cracks (or rimes) and its next phase begins.
    ctx.fillStyle = look.notch;
    ctx.fillRect(innerX + innerWidth * 0.5 - 0.5, barY - 2, 1.5, 12);
    ctx.restore();
}

// A bronze bell sigil swelling with each ring: the Warden's exact spot, shown before it can act (Monster Hunter's entrance beat).
function drawTollingMark(ctx, bellWarden, seconds, reducedMotion) {
    const p = clamp01(bellWarden.progress);
    const r = 46;
    const ring = reducedMotion ? 0 : ((Number(seconds) || 0) * 1.6) % 1;
    const { markFill, markEdge, echo } = bellVariant(bellWarden);
    ctx.save();
    ctx.translate(bellWarden.x, bellWarden.y);
    ctx.fillStyle = `rgba(${markFill.join(', ')}, ${0.14 + 0.16 * p})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(1, 0.5);
    ctx.strokeStyle = `rgba(${markEdge.join(', ')}, ${0.55 + 0.35 * p})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.stroke();
    // A ringing echo travels outward from the mark; frozen under reduced motion.
    if (!reducedMotion) {
        ctx.strokeStyle = `rgba(${echo.join(', ')}, ${0.45 * (1 - ring)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.4 + ring * 0.9), 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
    // Bell glyph in the centre.
    ctx.save();
    ctx.translate(bellWarden.x, bellWarden.y);
    ctx.fillStyle = `rgba(${markEdge.join(', ')}, ${0.5 + 0.4 * p})`;
    ctx.beginPath();
    ctx.moveTo(-7, 4);
    ctx.quadraticCurveTo(-7, -9, 0, -10);
    ctx.quadraticCurveTo(7, -9, 7, 4);
    ctx.lineTo(9, 6);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-1.5, 6, 3, 3);
    ctx.restore();
}

// Smash aftermath. Charging: the crater plus a dashed ring at the farthest reach, and a charge sweep. Expanding: only the
// rolling band hurts, so it is drawn at its exact thickness; inside the crater and beyond the dashed ring are safe.
function drawShockwave(ctx, wave) {
    const impact = Math.max(8, Number(wave.impactRadius) || 0);
    const max = Math.max(impact, Number(wave.maxRadius) || 0);
    ctx.save();
    ctx.fillStyle = 'rgba(40, 28, 16, 0.32)';
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, impact * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash?.([6, 6]);
    ctx.strokeStyle = 'rgba(226, 84, 74, 0.45)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, max, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash?.([]);
    if (!wave.expanding) {
        ctx.strokeStyle = 'rgba(255, 196, 96, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, impact, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01(wave.charge));
        ctx.stroke();
    } else {
        const radius = Math.max(impact, Number(wave.radius) || 0);
        ctx.strokeStyle = 'rgba(214, 160, 72, 0.4)';
        ctx.lineWidth = BELL_SHOCKWAVE_THICKNESS;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(226, 84, 74, 0.9)';
        ctx.lineWidth = 1.5;
        for (const edge of [-BELL_SHOCKWAVE_THICKNESS / 2, BELL_SHOCKWAVE_THICKNESS / 2]) {
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, Math.max(1, radius + edge), 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') { ctx.roundRect(x, y, w, h, r); return; }
    ctx.rect(x, y, w, h);
}
