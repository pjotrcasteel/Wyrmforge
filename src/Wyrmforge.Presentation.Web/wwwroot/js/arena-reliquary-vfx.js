// The Reliquary's presence (roster step 6). C# owns the reveal timing, the sigil spot, the corruption pools and every hit;
// this module only draws what the snapshot reports, at the reported size: the sigil it rises from, the pools that burn,
// the chains binding its wards, the glow on minions a ward empowers, and its duel bar.
import { drawEnemyPixelArt } from './arena-enemy-art.js';

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const RELIQUARY_KIND = 7;
const WARD_KIND = 8;
const GLASS_KIND = 18;
const SPOKES = 9;

// Frost F4c: the Reliquary of Glass shares the road and this module's sigil, hush and bar, in pale glass instead of gilt and blood.
export const RELIQUARY_THEMES = {
    fire: {
        kind: RELIQUARY_KIND, radius: 22, title: 'THE RELIQUARY', sigilFill: '120, 18, 32', sigilRing: '240, 196, 96', sigilSpoke: '255, 120, 96',
        hush: '20, 4, 8', frame: 'rgba(14, 4, 8, 0.78)', edge: 'rgba(240, 196, 96, 0.55)', name: '#f0d27a',
        health: '#b02a34', deep: '#e0523a', warded: '#8a6a3a', wardedText: 'WARDED • BREAK THE WARDS', notch: 'rgba(240, 210, 122, 0.85)',
    },
    glass: {
        kind: GLASS_KIND, radius: 27, title: 'THE RELIQUARY OF GLASS', sigilFill: '40, 90, 130', sigilRing: '214, 244, 255', sigilSpoke: '255, 214, 140',
        hush: '4, 14, 24', frame: 'rgba(6, 14, 22, 0.8)', edge: 'rgba(190, 232, 252, 0.6)', name: '#d8f2ff',
        health: '#6fb6e0', deep: '#a8e4ff', warded: '#4a6478', wardedText: 'WARDED • BREAK THE CRYSTALS', notch: 'rgba(255, 214, 140, 0.85)',
    },
};

export const reliquaryTheme = reliquary => RELIQUARY_THEMES[reliquary?.variant] ?? RELIQUARY_THEMES.fire;

export function drawReliquaryGround(ctx, snapshot, seconds = 0, reducedMotion = false) {
    if (!snapshot) return;
    for (const field of snapshot.reliquaryFields ?? []) drawCorruptionField(ctx, field, seconds, reducedMotion);
    const reliquary = snapshot.reliquary;
    if (reliquary && (reliquary.stage === 'hush' || reliquary.stage === 'emerging')) drawSigil(ctx, reliquary, seconds, reducedMotion);
    const enemies = snapshot.enemies ?? [];
    const boss = enemies.find(enemy => enemy.kind === RELIQUARY_KIND);
    for (const enemy of enemies) {
        if (enemy.kind === WARD_KIND && boss) drawWardChain(ctx, enemy, boss, seconds, reducedMotion);
        if (enemy.empowered) drawEmpoweredGlow(ctx, enemy, seconds, reducedMotion);
    }
}

// The figure rising out of its sigil: fades in and lifts the last few pixels, so the body appears exactly where it will fight.
export function drawReliquaryEmergence(ctx, reliquary) {
    if (reliquary?.stage !== 'emerging') return;
    const p = clamp01(reliquary.progress);
    const theme = reliquaryTheme(reliquary);
    drawEnemyPixelArt(ctx, { kind: theme.kind, x: reliquary.x, y: reliquary.y + (1 - p) * 10, radius: theme.radius, entityId: -1, healthRatio: 1, opacity: p * 0.9 });
}

// Screen-space hush: the edges darken for the held breath, then lift as it rises. Never covers the centre of play.
export function drawReliquaryHushVeil(ctx, reliquary, width, height) {
    if (!reliquary || (reliquary.stage !== 'hush' && reliquary.stage !== 'emerging')) return;
    const p = clamp01(reliquary.progress);
    const strength = reliquary.stage === 'hush' ? 0.18 + 0.22 * p : 0.4 * (1 - p);
    if (strength <= 0.01 || typeof ctx.createRadialGradient !== 'function') return;
    const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.75);
    const hush = reliquaryTheme(reliquary).hush;
    gradient.addColorStop(0, `rgba(${hush}, 0)`);
    gradient.addColorStop(1, `rgba(${hush}, ${strength})`);
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

export function drawReliquaryBar(ctx, reliquary, width) {
    if (reliquary?.stage !== 'duel') return;
    const outerWidth = Math.min(320, width - 132);
    const x = (width - outerWidth) / 2;
    const y = width <= 520 ? 103 : 9;
    const barY = y + 20;
    const theme = reliquaryTheme(reliquary);
    ctx.save();
    ctx.fillStyle = theme.frame;
    roundRect(ctx, x, y, outerWidth, 36, 10);
    ctx.fill();
    ctx.strokeStyle = theme.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '900 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.name;
    ctx.fillText(`${theme.title}${reliquary.shifted ? (reliquary.variant === 'glass' ? ' • SHATTERED' : ' • DEEPENED') : ''}`, x + 9, y + 12);
    // One instruction at a time, the most urgent first: the open window, then the veil, then the shield.
    const hint = reliquary.exposed ? ['EXPOSED • STRIKE NOW', '#ffd27a']
        : reliquary.veiled ? ['VEILED • FIND THE LIT LANTERNS', '#ffd27a']
            : reliquary.warded ? [theme.wardedText, '#ff8f86'] : null;
    if (hint) {
        ctx.textAlign = 'right';
        ctx.fillStyle = hint[1];
        ctx.font = '800 8px system-ui, sans-serif';
        ctx.fillText(hint[0], x + outerWidth - 9, y + 12);
    }
    const innerX = x + 9;
    const innerWidth = outerWidth - 18;
    ctx.fillStyle = 'rgba(9, 4, 6, 0.9)';
    roundRect(ctx, innerX, barY, innerWidth, 8, 4);
    ctx.fill();
    ctx.fillStyle = reliquary.warded ? theme.warded : reliquary.shifted ? theme.deep : theme.health;
    roundRect(ctx, innerX, barY, innerWidth * clamp01(reliquary.healthRatio), 8, 4);
    ctx.fill();
    // The half-health notch is where the ritual deepens.
    ctx.fillStyle = theme.notch;
    ctx.fillRect(innerX + innerWidth * 0.5 - 0.5, barY - 2, 1.5, 12);
    ctx.restore();
}

function drawSigil(ctx, reliquary, seconds, reducedMotion) {
    const p = clamp01(reliquary.progress);
    const hush = reliquary.stage === 'hush';
    const drawn = hush ? p : 1;
    const r = 40;
    const pulse = reducedMotion ? 0 : Math.sin((Number(seconds) || 0) * 6) * 0.08;
    const theme = reliquaryTheme(reliquary);
    ctx.save();
    ctx.translate(reliquary.x, reliquary.y);
    ctx.fillStyle = `rgba(${theme.sigilFill}, ${0.12 + 0.14 * drawn})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(1, 0.5);
    ctx.strokeStyle = `rgba(${theme.sigilRing}, ${0.6 + 0.3 * drawn + pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * drawn);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * drawn);
    ctx.stroke();
    // Spokes of the crown appear one by one as the hush runs out.
    const shown = Math.floor(SPOKES * drawn + 0.001);
    ctx.strokeStyle = `rgba(${theme.sigilSpoke}, ${0.7 + pulse})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < shown; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / SPOKES;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
        ctx.lineTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
        ctx.stroke();
    }
    ctx.restore();
}

function drawCorruptionField(ctx, field, seconds, reducedMotion) {
    const r = Math.max(8, Number(field.radius) || 0);
    ctx.save();
    if (!field.armed) {
        // Arming: the pool's exact edge, filling inward; it bites only once full.
        const p = clamp01(field.armProgress);
        ctx.setLineDash?.([5, 4]);
        ctx.strokeStyle = 'rgba(226, 84, 74, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(field.x, field.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash?.([]);
        ctx.fillStyle = 'rgba(120, 30, 80, 0.22)';
        ctx.beginPath();
        ctx.arc(field.x, field.y, r * p, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
    }
    const life = clamp01(field.life);
    const alpha = 0.35 + 0.65 * Math.min(1, life * 4);
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = 'rgba(70, 12, 44, 0.42)';
    ctx.beginPath();
    ctx.arc(field.x, field.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 84, 74, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Slow bubbles: a live surface, deterministic from position and time.
    const t = reducedMotion ? 0 : Number(seconds) || 0;
    ctx.fillStyle = 'rgba(214, 110, 170, 0.6)';
    for (let i = 0; i < 6; i++) {
        const a = i * 1.7 + (field.x + field.y) * 0.01;
        const d = r * (0.25 + ((i * 0.37 + t * 0.4) % 0.65));
        const size = 1.5 + ((i + Math.floor(t * 3)) % 3) * 0.6;
        ctx.fillRect(field.x + Math.cos(a) * d - size / 2, field.y + Math.sin(a) * d * 0.8 - size / 2, size, size);
    }
    ctx.restore();
}

// Ward to Reliquary: a taut chain of light. While any ward stands, the Reliquary is warded; follow the chain to break it.
function drawWardChain(ctx, ward, boss, seconds, reducedMotion) {
    const t = reducedMotion ? 0 : Number(seconds) || 0;
    ctx.save();
    ctx.strokeStyle = 'rgba(240, 120, 96, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash?.([3, 4]);
    ctx.lineDashOffset = -t * 18;
    ctx.beginPath();
    ctx.moveTo(ward.x, ward.y - 8);
    ctx.lineTo(boss.x, boss.y - 6);
    ctx.stroke();
    ctx.setLineDash?.([]);
    ctx.restore();
}

// Minions inside a ward's reach: a crimson ember ring at their feet, so the empowered ones read before they hit.
function drawEmpoweredGlow(ctx, enemy, seconds, reducedMotion) {
    const pulse = reducedMotion ? 0 : (Math.sin((Number(seconds) || 0) * 5 + (enemy.entityId || 0)) + 1) * 0.1;
    const r = (Number(enemy.radius) || 10) + 4;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 92, 80, ${0.45 + pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + r * 0.5, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') { ctx.roundRect(x, y, w, h, r); return; }
    ctx.rect(x, y, w, h);
}
