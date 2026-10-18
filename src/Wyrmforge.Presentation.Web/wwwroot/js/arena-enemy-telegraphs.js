// Ground telegraphs for committed enemy attacks. C# owns the timing, the locked lane/landing spot and
// every hit test; this module only draws what the snapshot reports, at exactly the reported size, so
// the mark the player reads is the area that can hurt them (Enter the Gungeon / Hades readability rule).
import { isFrostTelegraph, drawFrostTelegraph } from './arena-frost-vfx.js';
import { isWinterBellTelegraph, drawWinterBellTelegraph } from './arena-winterbell-vfx.js';

const POUNCE = { edge: 'rgba(214, 64, 48, 0.85)', fill: 'rgba(214, 64, 48, 0.16)', charge: 'rgba(240, 92, 64, 0.34)' };
const LOB = { edge: 'rgba(255, 150, 64, 0.9)', fill: 'rgba(255, 140, 56, 0.12)', charge: 'rgba(255, 170, 80, 0.32)' };
const BASH = { edge: 'rgba(226, 70, 52, 0.9)', fill: 'rgba(226, 70, 52, 0.14)', charge: 'rgba(240, 96, 70, 0.36)' };
// The wraith's claw is still an attack, so it keeps the red danger edge, with a cold drowned fill to name the attacker.
const CLAW = { edge: 'rgba(226, 84, 74, 0.9)', fill: 'rgba(120, 190, 230, 0.14)', charge: 'rgba(170, 220, 250, 0.38)' };
// Support casts are not attacks on the hunter, so they use cool/holy hues instead of the red-orange danger family.
const HEAL = { edge: 'rgba(150, 232, 150, 0.85)', charge: 'rgba(190, 255, 170, 0.5)' };
// Elite death blasts are attacks too (red edge), filled with the elite's own hue: grave violet, drowned blue.
const GRAVE = { edge: 'rgba(226, 84, 74, 0.9)', fill: 'rgba(150, 120, 255, 0.14)', charge: 'rgba(178, 156, 255, 0.36)' };
const ECHO = { edge: 'rgba(226, 84, 74, 0.85)', fill: 'rgba(110, 190, 240, 0.12)', charge: 'rgba(127, 214, 255, 0.34)' };
// The Reliquary's rites keep the red danger edge; gilt names the seal, crimson the ward burst, bruised violet the corruption.
const SEAL = { edge: 'rgba(226, 84, 74, 0.95)', fill: 'rgba(240, 196, 96, 0.13)', charge: 'rgba(255, 214, 120, 0.36)' };
const WARD = { edge: 'rgba(226, 84, 74, 0.9)', fill: 'rgba(176, 42, 52, 0.16)', charge: 'rgba(255, 96, 90, 0.36)' };
const CORRUPTION = { edge: 'rgba(226, 84, 74, 0.75)', fill: 'rgba(110, 30, 70, 0.14)', charge: 'rgba(160, 60, 120, 0.3)' };
const RITE = { edge: 'rgba(240, 196, 96, 0.8)', charge: 'rgba(255, 224, 150, 0.55)' };
const REVIVE = { edge: 'rgba(196, 146, 255, 0.85)', fill: 'rgba(150, 100, 230, 0.1)', charge: 'rgba(210, 170, 255, 0.4)' };
// The Bell Warden's blows keep the red danger edge with a bronze fill; its rally and crack are tells, not attacks.
const BELL = { edge: 'rgba(226, 84, 74, 0.95)', fill: 'rgba(214, 160, 72, 0.15)', charge: 'rgba(255, 196, 96, 0.38)' };
const TOLL = { edge: 'rgba(226, 84, 74, 0.85)', fill: 'rgba(214, 160, 72, 0.1)', charge: 'rgba(255, 210, 120, 0.34)' };
const RALLY = { edge: 'rgba(240, 196, 96, 0.75)', charge: 'rgba(255, 224, 150, 0.5)' };
const CRACK = { edge: 'rgba(230, 236, 240, 0.8)', charge: 'rgba(255, 255, 255, 0.55)' };
// Must match RunSimulation.BellToll* and BellWardenBehaviorState.CrackedTollSpreadRadians: the previewed pulses are the pulses.
export const BELL_TOLL = { pulses: 6, firstOffset: 70, spacing: 74, fanRadians: 25 * Math.PI / 180 };
// Must match PenitentBehaviorState.ShieldHalfAngleRadians: the drawn guard is exactly the blocking arc.
export const SHIELD_HALF_ANGLE = Math.PI / 3;

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function drawEnemyTelegraph(ctx, enemy) {
    const telegraph = enemy?.telegraph;
    if (!telegraph) return;
    if (telegraph.kind === 'pounce') drawPounceLane(ctx, enemy, telegraph);
    else if (telegraph.kind === 'lob') drawLandingMark(ctx, telegraph.targetX, telegraph.targetY, telegraph.radius, telegraph.progress, LOB);
    else if (telegraph.kind === 'bash') drawBashArc(ctx, enemy, telegraph, BASH);
    else if (telegraph.kind === 'claw') drawBashArc(ctx, enemy, telegraph, CLAW);
    else if (telegraph.kind === 'heal') drawHealTether(ctx, enemy, telegraph);
    else if (telegraph.kind === 'revive') drawReviveCircle(ctx, telegraph);
    else if (telegraph.kind === 'rite-seal') drawRitePreview(ctx, telegraph, SEAL);
    else if (telegraph.kind === 'rite-corruption') drawRitePreview(ctx, telegraph, CORRUPTION);
    else if (telegraph.kind === 'rite-ward' || telegraph.kind === 'rite-shift') drawRiteRing(ctx, enemy, telegraph);
    else if (telegraph.kind === 'ward-fuse') drawLandingMark(ctx, telegraph.targetX, telegraph.targetY, telegraph.radius, telegraph.progress, WARD);
    else if (telegraph.kind === 'bell-smash') drawLandingMark(ctx, telegraph.targetX, telegraph.targetY, telegraph.radius, telegraph.progress, BELL);
    else if (telegraph.kind === 'bell-toll') drawTollLanes(ctx, enemy, telegraph, [0]);
    else if (telegraph.kind === 'bell-toll-fan') drawTollLanes(ctx, enemy, telegraph, [-BELL_TOLL.fanRadians, 0, BELL_TOLL.fanRadians]);
    else if (telegraph.kind === 'bell-rally') drawRiteRing(ctx, enemy, telegraph, RALLY);
    else if (telegraph.kind === 'bell-crack') drawRiteRing(ctx, enemy, telegraph, CRACK);
    else if (isFrostTelegraph(telegraph.kind)) drawFrostTelegraph(ctx, enemy, telegraph);
    else if (isWinterBellTelegraph(telegraph.kind)) drawWinterBellTelegraph(ctx, enemy, telegraph);
}

// Every pulse of the coming toll, already in place: hollow rings along each lane that fill as the bell swings back
// (Hades' Asterius lines / Gungeon's lane tells). The live pulses then ripple outward over the same rings.
export function tollPulsePoints(enemy, telegraph, offsets = [0]) {
    const base = Math.atan2(telegraph.targetY - enemy.y, telegraph.targetX - enemy.x);
    const points = [];
    for (const offset of offsets) {
        const angle = base + offset;
        for (let i = 0; i < BELL_TOLL.pulses; i++) {
            const d = BELL_TOLL.firstOffset + i * BELL_TOLL.spacing;
            points.push({ x: enemy.x + Math.cos(angle) * d, y: enemy.y + Math.sin(angle) * d });
        }
    }
    return points;
}

function drawTollLanes(ctx, enemy, telegraph, offsets) {
    const r = Math.max(8, Number(telegraph.radius) || 0);
    const p = clamp01(telegraph.progress);
    ctx.save();
    for (const point of tollPulsePoints(enemy, telegraph, offsets)) {
        ctx.setLineDash?.([5, 4]);
        ctx.strokeStyle = TOLL.edge;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash?.([]);
        ctx.fillStyle = TOLL.charge;
        ctx.beginPath();
        ctx.arc(point.x, point.y, r * p, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// A rite being cast: a dashed outline exactly where it will land, its sweep closing as the censers rise. The live blast or
// pool then takes over with its own mark, so the warning never shrinks or moves.
function drawRitePreview(ctx, telegraph, colors) {
    const r = Math.max(8, Number(telegraph.radius) || 0);
    const p = clamp01(telegraph.progress);
    ctx.save();
    ctx.setLineDash?.([6, 5]);
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash?.([]);
    ctx.strokeStyle = colors.charge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.stroke();
    ctx.restore();
}

// Planting a ward or deepening the ritual: a gilt ring around the Reliquary itself; no damage, only a tell.
function drawRiteRing(ctx, enemy, telegraph, colors = RITE) {
    const r = Math.max(10, Number(telegraph.radius) || 0);
    const p = clamp01(telegraph.progress);
    ctx.save();
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = colors.charge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.stroke();
    ctx.restore();
}

// Frontal wedge: exactly the reach and arc C# tests against when the bash lands.
function drawBashArc(ctx, enemy, telegraph, colors) {
    const angle = Math.atan2(telegraph.targetY - enemy.y, telegraph.targetX - enemy.x);
    const reach = Math.max(8, Number(telegraph.radius) || 0);
    const progress = clamp01(telegraph.progress);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    wedge(ctx, angle, reach);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    wedge(ctx, angle, reach * progress);
    ctx.fillStyle = colors.charge;
    ctx.fill();
    ctx.restore();
}

function wedge(ctx, angle, radius) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, angle - SHIELD_HALF_ANGLE, angle + SHIELD_HALF_ANGLE);
    ctx.closePath();
}

// A tether from priest to its locked ally; the ring closes on the ally as the cast completes. Break it with burst damage.
function drawHealTether(ctx, enemy, telegraph) {
    const progress = clamp01(telegraph.progress);
    const r = Math.max(6, (Number(telegraph.radius) || 0) + 5);
    ctx.save();
    ctx.strokeStyle = HEAL.edge;
    ctx.lineWidth = 1.5;
    ctx.setLineDash?.([4, 4]);
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(telegraph.targetX, telegraph.targetY);
    ctx.stroke();
    ctx.setLineDash?.([]);
    ctx.strokeStyle = HEAL.charge;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
}

// Ritual circle over the remains; its sweep completing is the moment the Ashlings rise.
function drawReviveCircle(ctx, telegraph) {
    const r = Math.max(8, Number(telegraph.radius) || 0);
    const progress = clamp01(telegraph.progress);
    ctx.save();
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r, 0, Math.PI * 2);
    ctx.fillStyle = REVIVE.fill;
    ctx.fill();
    ctx.strokeStyle = REVIVE.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = REVIVE.charge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
}

// Penitent guard: a thin arc on the ground marking the blocking front, so flanks read at a glance (Monster Hunter shields).
export function drawShieldGuard(ctx, enemy) {
    const facing = Number(enemy?.shieldFacing);
    if (enemy?.shieldFacing == null || !Number.isFinite(facing)) return;
    const r = (Number(enemy.radius) || 12) + 7;
    ctx.save();
    ctx.strokeStyle = 'rgba(214, 196, 150, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r, facing - SHIELD_HALF_ANGLE, facing + SHIELD_HALF_ANGLE);
    ctx.stroke();
    ctx.restore();
}

// Fallen Ashling remains a priest can still raise; they fade as their window closes.
export function drawAshRemains(ctx, remains) {
    if (!remains) return;
    const life = clamp01(remains.life);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.5 * life;
    ctx.fillStyle = 'rgba(40, 30, 28, 0.85)';
    ctx.beginPath();
    ctx.ellipse(remains.x, remains.y + 2, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 140, 60, 0.75)';
    ctx.fillRect(remains.x - 4, remains.y, 2, 2);
    ctx.fillRect(remains.x + 2, remains.y + 1, 2, 2);
    ctx.fillStyle = 'rgba(190, 170, 150, 0.8)';
    ctx.fillRect(remains.x - 1, remains.y - 1, 3, 2);
    ctx.restore();
}

// A Drowned Wraith under the water. Drifting: a faint pair of ripples, readable if you look for it (Hades' burrowing
// enemies). Emerging: a bright ring that closes onto the exact body it will surface with - the 0.8s ambush tell.
export function drawWraithRipple(ctx, ripple, seconds = 0) {
    if (!ripple) return;
    const body = Math.max(6, Number(ripple.radius) || 12);
    ctx.save();
    if (ripple.emerging) {
        const p = clamp01(ripple.progress);
        ctx.fillStyle = `rgba(120, 190, 230, ${0.1 + 0.18 * p})`;
        ctx.beginPath();
        ctx.ellipse(ripple.x, ripple.y, body * 1.6, body * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(200, 236, 255, ${0.55 + 0.4 * p})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ripple.x, ripple.y, body * (2.6 - 1.2 * p), body * (1.3 - 0.6 * p), 0, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        const t = (Number(seconds) || 0) * 1.4;
        for (let i = 0; i < 2; i++) {
            const phase = (t + i * 0.5) % 1;
            ctx.strokeStyle = `rgba(170, 215, 240, ${0.32 * (1 - phase)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(ripple.x, ripple.y, body * (0.5 + phase), body * (0.25 + phase * 0.5), 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawPounceLane(ctx, enemy, telegraph) {
    const dx = telegraph.targetX - enemy.x;
    const dy = telegraph.targetY - enemy.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;
    const half = Math.max(4, Number(telegraph.radius) || 0);
    const progress = clamp01(telegraph.progress);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = POUNCE.fill;
    ctx.fillRect(0, -half, length, half * 2);
    // The fill races down the lane; when it reaches the tip the hound leaves the ground.
    ctx.fillStyle = POUNCE.charge;
    ctx.fillRect(0, -half, length * progress, half * 2);
    ctx.strokeStyle = POUNCE.edge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, -half, length, half * 2);
    ctx.beginPath();
    ctx.moveTo(length + half * .9, 0);
    ctx.lineTo(length - half * .4, -half * 1.1);
    ctx.lineTo(length - half * .4, half * 1.1);
    ctx.closePath();
    ctx.fillStyle = POUNCE.edge;
    ctx.fill();
    ctx.restore();
}

function drawLandingMark(ctx, x, y, radius, progress, colors) {
    const r = Math.max(4, Number(radius) || 0);
    const p = clamp01(progress);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner disc grows to the full ring at impact: a countdown with no numbers.
    ctx.beginPath();
    ctx.arc(x, y, r * p, 0, Math.PI * 2);
    ctx.fillStyle = colors.charge;
    ctx.fill();
    ctx.restore();
}

// Ground half of an ember in flight: the landing mark plus a shadow under the ball.
export function drawHostileProjectileGround(ctx, projectile) {
    if (!projectile) return;
    const style = projectile.style ?? 'ember';
    drawLandingMark(ctx, projectile.targetX, projectile.targetY, projectile.radius, projectile.progress,
        style === 'grave' ? GRAVE : style === 'echo' ? ECHO : style === 'seal' ? SEAL : style === 'ward' ? WARD : style === 'toll' ? TOLL : LOB);
    // Grave, echo, seal, ward and toll blasts never travel: the mark is the whole telegraph, so there is no ball or shadow.
    if (style !== 'ember') return;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 10, 0.4)';
    ctx.beginPath();
    ctx.ellipse(projectile.x, projectile.y, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Airborne half, drawn above actors: the ember is lifted by the C#-reported arc height.
export function drawHostileProjectileEmber(ctx, projectile) {
    if (!projectile || (projectile.style ?? 'ember') !== 'ember') return;
    const y = projectile.y - (Number(projectile.height) || 0);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 120, 40, 0.35)';
    ctx.beginPath();
    ctx.arc(projectile.x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(projectile.x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3b8';
    ctx.fillRect(projectile.x - 1.5, y - 1.5, 2, 2);
    ctx.restore();
}
