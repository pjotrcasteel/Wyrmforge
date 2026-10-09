export function createPlayerDangerState() {
    return { health: null, maxHealth: null, hitUntil: 0, nextHitFlash: 0, ringUntil: 0 };
}

export function updatePlayerDanger(state, snapshot, now) {
    const { health, maxHealth } = snapshot.hud;
    if (!snapshot.paused && !snapshot.ended && state.health !== null && state.maxHealth === maxHealth && health < state.health) {
        state.ringUntil = now + 900;
        // Sustained contact must not produce a rapid strobe.
        if (now >= state.nextHitFlash) {
            state.hitUntil = now + 140;
            state.nextHitFlash = now + 650;
        }
    }
    if (snapshot.paused || snapshot.ended) state.hitUntil = state.ringUntil = 0;
    state.health = health;
    state.maxHealth = maxHealth;
}

export function playerDangerPresentation(state, snapshot, now, reducedMotion = false) {
    const ratio = Math.max(0, Math.min(1, snapshot.hud.health / Math.max(1, snapshot.hud.maxHealth)));
    if (snapshot.paused || snapshot.ended || ratio <= 0) return { ratio, level: 0, hit: false, ring: false, edgeAlpha: 0, pulse: 1 };
    const level = ratio <= 0.15 ? 2 : ratio <= 0.35 ? 1 : 0;
    const hit = now < state.hitUntil;
    const pulse = reducedMotion ? 1 : 0.9 + Math.sin(now / 1000 * Math.PI * 1.6) * 0.1;
    return { ratio, level, hit, ring: level > 0 || now < state.ringUntil,
        edgeAlpha: level === 2 ? 0.24 * pulse : level === 1 ? 0.1 : hit ? 0.12 : 0, pulse };
}

export function drawPlayerDanger(ctx, player, danger, width, height) {
    ctx.save();
    if (danger.edgeAlpha > 0) {
        const depth = Math.min(40, width * 0.08, height * 0.08);
        const edges = [[0, 0, depth, 0, 0, 0, depth, height],
            [width, 0, width - depth, 0, width - depth, 0, depth, height],
            [0, 0, 0, depth, 0, 0, width, depth],
            [0, height, 0, height - depth, 0, height - depth, width, depth]];
        for (const [x1, y1, x2, y2, x, y, w, h] of edges) {
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, `rgba(225, 54, 69, ${danger.edgeAlpha})`);
            gradient.addColorStop(1, 'rgba(225, 54, 69, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, w, h);
        }
    }
    if (danger.ring) {
        const radius = player.radius + 9;
        ctx.lineWidth = danger.level === 2 ? 4 : 3;
        ctx.strokeStyle = 'rgba(12, 8, 18, .8)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = danger.level === 2 ? `rgba(255, 92, 106, ${danger.pulse})` : '#ffc270';
        ctx.beginPath();
        ctx.arc(player.x, player.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * danger.ratio);
        ctx.stroke();
        if (danger.level === 2) {
            // A static broken outer ring remains legible even at almost zero health.
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(player.x, player.y, radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}
