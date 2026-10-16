// Ground telegraphs for committed enemy attacks. C# owns the timing, the locked lane/landing spot and
// every hit test; this module only draws what the snapshot reports, at exactly the reported size, so
// the mark the player reads is the area that can hurt them (Enter the Gungeon / Hades readability rule).

const POUNCE = { edge: 'rgba(214, 64, 48, 0.85)', fill: 'rgba(214, 64, 48, 0.16)', charge: 'rgba(240, 92, 64, 0.34)' };
const LOB = { edge: 'rgba(255, 150, 64, 0.9)', fill: 'rgba(255, 140, 56, 0.12)', charge: 'rgba(255, 170, 80, 0.32)' };

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function drawEnemyTelegraph(ctx, enemy) {
    const telegraph = enemy?.telegraph;
    if (!telegraph) return;
    if (telegraph.kind === 'pounce') drawPounceLane(ctx, enemy, telegraph);
    else if (telegraph.kind === 'lob') drawLandingMark(ctx, telegraph.targetX, telegraph.targetY, telegraph.radius, telegraph.progress, LOB);
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
