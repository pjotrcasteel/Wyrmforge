// Ground telegraphs for committed enemy attacks. C# owns the timing, the locked lane/landing spot and
// every hit test; this module only draws what the snapshot reports, at exactly the reported size, so
// the mark the player reads is the area that can hurt them (Enter the Gungeon / Hades readability rule).

const POUNCE = { edge: 'rgba(214, 64, 48, 0.85)', fill: 'rgba(214, 64, 48, 0.16)', charge: 'rgba(240, 92, 64, 0.34)' };
const LOB = { edge: 'rgba(255, 150, 64, 0.9)', fill: 'rgba(255, 140, 56, 0.12)', charge: 'rgba(255, 170, 80, 0.32)' };
const BASH = { edge: 'rgba(226, 70, 52, 0.9)', fill: 'rgba(226, 70, 52, 0.14)', charge: 'rgba(240, 96, 70, 0.36)' };
// Support casts are not attacks on the hunter, so they use cool/holy hues instead of the red-orange danger family.
const HEAL = { edge: 'rgba(150, 232, 150, 0.85)', charge: 'rgba(190, 255, 170, 0.5)' };
const REVIVE = { edge: 'rgba(196, 146, 255, 0.85)', fill: 'rgba(150, 100, 230, 0.1)', charge: 'rgba(210, 170, 255, 0.4)' };
// Must match PenitentBehaviorState.ShieldHalfAngleRadians: the drawn guard is exactly the blocking arc.
export const SHIELD_HALF_ANGLE = Math.PI / 3;

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function drawEnemyTelegraph(ctx, enemy) {
    const telegraph = enemy?.telegraph;
    if (!telegraph) return;
    if (telegraph.kind === 'pounce') drawPounceLane(ctx, enemy, telegraph);
    else if (telegraph.kind === 'lob') drawLandingMark(ctx, telegraph.targetX, telegraph.targetY, telegraph.radius, telegraph.progress, LOB);
    else if (telegraph.kind === 'bash') drawBashArc(ctx, enemy, telegraph);
    else if (telegraph.kind === 'heal') drawHealTether(ctx, enemy, telegraph);
    else if (telegraph.kind === 'revive') drawReviveCircle(ctx, telegraph);
}

// Frontal wedge: exactly the reach and arc C# tests against when the bash lands.
function drawBashArc(ctx, enemy, telegraph) {
    const angle = Math.atan2(telegraph.targetY - enemy.y, telegraph.targetX - enemy.x);
    const reach = Math.max(8, Number(telegraph.radius) || 0);
    const progress = clamp01(telegraph.progress);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    wedge(ctx, angle, reach);
    ctx.fillStyle = BASH.fill;
    ctx.fill();
    ctx.strokeStyle = BASH.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    wedge(ctx, angle, reach * progress);
    ctx.fillStyle = BASH.charge;
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
    drawLandingMark(ctx, projectile.targetX, projectile.targetY, projectile.radius, projectile.progress, LOB);
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 10, 0.4)';
    ctx.beginPath();
    ctx.ellipse(projectile.x, projectile.y, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Airborne half, drawn above actors: the ember is lifted by the C#-reported arc height.
export function drawHostileProjectileEmber(ctx, projectile) {
    if (!projectile) return;
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
