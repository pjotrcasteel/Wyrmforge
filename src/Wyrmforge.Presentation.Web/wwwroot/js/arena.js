const arenas = new WeakMap();

export function initializeArena(canvas, dotNetReference) {
    disposeArena(canvas);
    const state = createState(canvas, dotNetReference);
    arenas.set(canvas, state);
    attachInput(state);
    state.lastFrame = performance.now();
    state.animationFrame = requestAnimationFrame(timestamp => frame(state, timestamp));
}

export function disposeArena(canvas) {
    const state = arenas.get(canvas);
    if (!state) return;
    state.active = false;
    cancelAnimationFrame(state.animationFrame);
    window.removeEventListener('keydown', state.onKeyDown);
    window.removeEventListener('keyup', state.onKeyUp);
    canvas.removeEventListener('pointerdown', state.onPointerDown);
    canvas.removeEventListener('pointermove', state.onPointerMove);
    canvas.removeEventListener('pointerup', state.onPointerUp);
    canvas.removeEventListener('pointercancel', state.onPointerUp);
    arenas.delete(canvas);
}

function createState(canvas, dotNetReference) {
    return {
        canvas,
        context: canvas.getContext('2d'),
        dotNetReference,
        active: true,
        busy: false,
        keys: new Set(),
        pointerId: null,
        touchOrigin: { x: 0, y: 0 },
        touchCurrent: { x: 0, y: 0 },
        lastFrame: 0,
        animationFrame: 0,
    };
}

function attachInput(state) {
    state.onKeyDown = event => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
        state.keys.add(event.key.toLowerCase());
    };
    state.onKeyUp = event => state.keys.delete(event.key.toLowerCase());
    state.onPointerDown = event => {
        if (state.pointerId !== null) return;
        state.pointerId = event.pointerId;
        state.touchOrigin = { x: event.clientX, y: event.clientY };
        state.touchCurrent = { ...state.touchOrigin };
        state.canvas.setPointerCapture(event.pointerId);
    };
    state.onPointerMove = event => {
        if (event.pointerId !== state.pointerId) return;
        state.touchCurrent = { x: event.clientX, y: event.clientY };
    };
    state.onPointerUp = event => {
        if (event.pointerId !== state.pointerId) return;
        state.pointerId = null;
    };

    window.addEventListener('keydown', state.onKeyDown, { passive: false });
    window.addEventListener('keyup', state.onKeyUp);
    state.canvas.addEventListener('pointerdown', state.onPointerDown);
    state.canvas.addEventListener('pointermove', state.onPointerMove);
    state.canvas.addEventListener('pointerup', state.onPointerUp);
    state.canvas.addEventListener('pointercancel', state.onPointerUp);
}

async function frame(state, timestamp) {
    if (!state.active) return;
    if (!state.busy) {
        state.busy = true;
        const delta = Math.min((timestamp - state.lastFrame) / 1000, 0.05);
        state.lastFrame = timestamp;
        const rect = state.canvas.getBoundingClientRect();
        const movement = getMovement(state);
        try {
            const snapshot = await state.dotNetReference.invokeMethodAsync('Frame', delta, rect.width, rect.height, movement.x, movement.y);
            resizeCanvas(state, rect);
            draw(state, snapshot, rect.width, rect.height);
        } catch (error) {
            console.error('Wyrmforge arena frame failed.', error);
            state.active = false;
        } finally {
            state.busy = false;
        }
    }
    if (state.active) state.animationFrame = requestAnimationFrame(next => frame(state, next));
}

function getMovement(state) {
    let x = 0;
    let y = 0;
    if (state.keys.has('arrowleft') || state.keys.has('a')) x -= 1;
    if (state.keys.has('arrowright') || state.keys.has('d')) x += 1;
    if (state.keys.has('arrowup') || state.keys.has('w')) y -= 1;
    if (state.keys.has('arrowdown') || state.keys.has('s')) y += 1;
    if (x !== 0 || y !== 0) return normalize(x, y);
    if (state.pointerId === null) return { x: 0, y: 0 };

    const dx = state.touchCurrent.x - state.touchOrigin.x;
    const dy = state.touchCurrent.y - state.touchOrigin.y;
    if (Math.hypot(dx, dy) < 8) return { x: 0, y: 0 };
    return normalize(dx, dy);
}

function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
}

function resizeCanvas(state, rect) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);
    if (state.canvas.width !== width || state.canvas.height !== height) {
        state.canvas.width = width;
        state.canvas.height = height;
    }
    state.context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw(state, snapshot, width, height) {
    const ctx = state.context;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#14111b';
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height);

    for (const enemy of snapshot.enemies) {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.frozen ? '#9fdfff' : '#c14b54';
        ctx.fill();
    }

    for (const projectile of snapshot.projectiles) {
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fillStyle = projectile.inferno ? '#ffb04a' : projectileColor(projectile.spell);
        ctx.fill();
    }

    for (const trace of snapshot.lightning) {
        ctx.beginPath();
        ctx.moveTo(trace.fromX, trace.fromY);
        ctx.lineTo(trace.toX, trace.toY);
        ctx.strokeStyle = `rgba(255, 229, 105, ${Math.min(1, trace.life / 0.12)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(snapshot.player.x, snapshot.player.y, snapshot.player.radius, 0, Math.PI * 2);
    ctx.fillStyle = snapshot.player.barrier ? '#b6efff' : '#f4e9ff';
    ctx.fill();
    ctx.strokeStyle = '#7f56c2';
    ctx.lineWidth = 3;
    ctx.stroke();

    drawHud(ctx, snapshot.hud, width);
    drawTouchIndicator(state, ctx);
}

function drawHud(ctx, hud, width) {
    const pad = 18;
    const barWidth = Math.min(300, width - pad * 2);
    const hasSynergies = hud.synergies.length > 0;
    const panelHeight = hasSynergies ? 178 : 158;
    ctx.fillStyle = 'rgba(8, 6, 12, 0.76)';
    roundRect(ctx, pad, pad, barWidth + 24, panelHeight, 12);
    ctx.fill();

    ctx.fillStyle = '#ede8f5';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(`Score ${hud.score}`, pad + 12, pad + 22);
    ctx.fillText(`${hud.seconds}s  •  ${hud.kills} kills`, pad + 12, pad + 43);

    ctx.fillStyle = '#332a3e';
    roundRect(ctx, pad + 12, pad + 55, barWidth, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#9ed6a2';
    roundRect(ctx, pad + 12, pad + 55, barWidth * Math.max(0, hud.health / hud.maxHealth), 10, 5);
    ctx.fill();

    ctx.fillStyle = '#bdb3c7';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`Level ${hud.level}  •  XP ${hud.experience}/${hud.experienceToNext}`, pad + 12, pad + 88);
    ctx.fillStyle = '#332a3e';
    roundRect(ctx, pad + 12, pad + 97, barWidth, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#b887ff';
    roundRect(ctx, pad + 12, pad + 97, barWidth * Math.min(1, hud.experience / hud.experienceToNext), 8, 4);
    ctx.fill();

    ctx.fillStyle = '#796f83';
    ctx.font = '800 9px system-ui, sans-serif';
    ctx.fillText('SPELLS', pad + 12, pad + 124);
    ctx.fillStyle = '#c9bfD3';
    ctx.font = '600 11px system-ui, sans-serif';
    const spells = hud.spells.map(spell => `${spell.icon}${roman(spell.rank)}`).join('   ');
    ctx.fillText(spells, pad + 58, pad + 124);

    if (hasSynergies) {
        ctx.fillStyle = '#b28c4f';
        ctx.font = '800 9px system-ui, sans-serif';
        ctx.fillText('SYNERGIES', pad + 12, pad + 148);
        ctx.fillStyle = '#e0c17b';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText(hud.synergies.map(synergy => `${synergy.icon} ${synergy.name}`).join('   '), pad + 78, pad + 148);
    }
}

function drawTouchIndicator(state, ctx) {
    if (state.pointerId === null) return;
    const rect = state.canvas.getBoundingClientRect();
    const originX = state.touchOrigin.x - rect.left;
    const originY = state.touchOrigin.y - rect.top;
    const currentX = state.touchCurrent.x - rect.left;
    const currentY = state.touchCurrent.y - rect.top;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(originX, originY, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(currentX, currentY, 16, 0, Math.PI * 2);
    ctx.stroke();
}

function drawGrid(ctx, width, height) {
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += 44) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function projectileColor(spell) {
    if (spell === 'FireBolt') return '#ff7a45';
    if (spell === 'FrostShard') return '#8fdcff';
    return '#b887ff';
}

function roman(value) {
    return ['0', 'I', 'II', 'III', 'IV', 'V'][value] ?? String(value);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
}
