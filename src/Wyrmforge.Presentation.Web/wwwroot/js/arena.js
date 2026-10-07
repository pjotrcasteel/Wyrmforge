const arenas = new WeakMap();

export function initializeArena(canvas, dotNetReference) {
    disposeArena(canvas);
    const state = createState(canvas, dotNetReference);
    arenas.set(canvas, state);
    attachInput(state);
    const now = performance.now();
    state.lastSimulationTimestamp = now;
    state.performanceWindowStarted = now;
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
        simulationBusy: false,
        latestSnapshot: null,
        keys: new Set(),
        pointerId: null,
        touchOrigin: { x: 0, y: 0 },
        touchCurrent: { x: 0, y: 0 },
        lastSimulationTimestamp: 0,
        performanceWindowStarted: 0,
        renderFrameCount: 0,
        simulationFrameCount: 0,
        simulationMillisecondsTotal: 0,
        bridgeMillisecondsTotal: 0,
        displayFps: 0,
        displaySimulationHz: 0,
        displaySimulationMilliseconds: 0,
        displayBridgeMilliseconds: 0,
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

function frame(state, timestamp) {
    if (!state.active) return;
    const rect = state.canvas.getBoundingClientRect();
    resizeCanvas(state, rect);
    recordRenderFrame(state, timestamp);

    if (state.latestSnapshot) draw(state, state.latestSnapshot, rect.width, rect.height);
    else drawWaiting(state, rect.width, rect.height);

    startSimulationFrame(state, timestamp, rect);
    if (state.active) state.animationFrame = requestAnimationFrame(next => frame(state, next));
}

function startSimulationFrame(state, timestamp, rect) {
    if (state.simulationBusy) return;
    state.simulationBusy = true;
    const delta = Math.min((timestamp - state.lastSimulationTimestamp) / 1000, 0.05);
    state.lastSimulationTimestamp = timestamp;
    const movement = getMovement(state);
    const bridgeStarted = performance.now();

    state.dotNetReference.invokeMethodAsync('Frame', delta, rect.width, rect.height, movement.x, movement.y)
        .then(snapshot => {
            if (!state.active) return;
            state.latestSnapshot = snapshot;
            state.simulationFrameCount++;
            state.simulationMillisecondsTotal += snapshot.simulationMilliseconds ?? 0;
            state.bridgeMillisecondsTotal += performance.now() - bridgeStarted;
        })
        .catch(error => {
            console.error('Wyrmforge arena frame failed.', error);
            state.active = false;
        })
        .finally(() => state.simulationBusy = false);
}

function recordRenderFrame(state, timestamp) {
    state.renderFrameCount++;
    const seconds = (timestamp - state.performanceWindowStarted) / 1000;
    if (seconds < 0.75) return;

    state.displayFps = Math.round(state.renderFrameCount / seconds);
    state.displaySimulationHz = Math.round(state.simulationFrameCount / seconds);
    state.displaySimulationMilliseconds = state.simulationFrameCount === 0 ? 0 : state.simulationMillisecondsTotal / state.simulationFrameCount;
    state.displayBridgeMilliseconds = state.simulationFrameCount === 0 ? 0 : state.bridgeMillisecondsTotal / state.simulationFrameCount;
    state.renderFrameCount = 0;
    state.simulationFrameCount = 0;
    state.simulationMillisecondsTotal = 0;
    state.bridgeMillisecondsTotal = 0;
    state.performanceWindowStarted = timestamp;
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

function drawWaiting(state, width, height) {
    const ctx = state.context;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#14111b';
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height);
    drawPerformanceCounter(state, ctx, null, width, height);
}

function draw(state, snapshot, width, height) {
    const ctx = state.context;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#14111b';
    ctx.fillRect(0, 0, width, height);
    if (snapshot.hunt) drawHuntArena(ctx, snapshot.hunt, width, height);
    drawGrid(ctx, width, height);

    for (const hazard of snapshot.huntHazards ?? []) drawHuntHazard(ctx, hazard);
    for (const shard of snapshot.experienceShards ?? []) drawExperienceShard(ctx, shard);
    if (snapshot.dragonBreath) drawDragonBreath(ctx, snapshot.dragonBreath, snapshot.dragon?.school ?? snapshot.hunt?.school);
    for (const pulse of snapshot.splashPulses) drawSplashPulse(ctx, pulse, snapshot.dragon?.school);
    for (const enemy of snapshot.enemies) drawEnemy(ctx, enemy);
    if (snapshot.dragon) drawDragon(ctx, snapshot.dragon);
    for (const impact of snapshot.elementalImpacts) drawElementalImpact(ctx, impact);
    for (const death of snapshot.deathBursts) drawDeathBurst(ctx, death);

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

    for (const burst of snapshot.essenceBursts) {
        const alpha = Math.min(1, burst.life / 0.2);
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, burst.radius * (1.08 - alpha * 0.08), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 93, 42, ${alpha * 0.08})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 139, 72, ${alpha * 0.85})`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    for (const bolt of snapshot.essenceBolts) {
        ctx.beginPath();
        ctx.moveTo(bolt.fromX, bolt.fromY);
        ctx.lineTo(bolt.toX, bolt.toY);
        ctx.strokeStyle = `rgba(255, 126, 57, ${Math.min(1, bolt.life / 0.18)})`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    if (snapshot.extraction) drawExtractionRitual(ctx, snapshot.extraction);
    for (const pickup of snapshot.experiencePickups ?? []) drawExperiencePickup(ctx, pickup);

    ctx.beginPath();
    ctx.arc(snapshot.player.x, snapshot.player.y, snapshot.player.radius, 0, Math.PI * 2);
    ctx.fillStyle = snapshot.player.barrier ? '#b6efff' : '#f4e9ff';
    ctx.fill();
    ctx.strokeStyle = '#7f56c2';
    ctx.lineWidth = 3;
    ctx.stroke();

    drawHud(ctx, snapshot.hud, width, Boolean(snapshot.dragon));
    if (snapshot.dragon) drawBossBar(ctx, snapshot.dragon, snapshot.hunt, width);
    if (snapshot.hunt && snapshot.hunt.stage !== 2) drawHuntStageBanner(ctx, snapshot.hunt, snapshot.dragon, width, height);
    drawTouchIndicator(state, ctx);
    drawPerformanceCounter(state, ctx, snapshot, width, height);
}

function drawHuntArena(ctx, hunt, width, height) {
    const palette = schoolPalette(hunt.school);
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.58, 20, width * 0.5, height * 0.58, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, `rgba(${palette.rgb}, 0.08)`);
    gradient.addColorStop(1, 'rgba(10, 8, 15, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (hunt.arena === 1) drawCinderScar(ctx, width, height, palette);
    else if (hunt.arena === 2) drawStormField(ctx, width, height, palette);
    else if (hunt.arena === 3) drawFrozenBasin(ctx, width, height, palette);
    else if (hunt.arena === 4) drawAetherFracture(ctx, width, height, palette);
}

function drawCinderScar(ctx, width, height, palette) {
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.13)`;
    ctx.lineWidth = 2;
    for (let index = 0; index < 7; index++) {
        const x = width * (0.08 + index * 0.14);
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x + 22, height * 0.72);
        ctx.lineTo(x - 8, height * 0.56);
        ctx.stroke();
    }
    ctx.fillStyle = `rgba(${palette.rgb}, 0.035)`;
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.restore();
}

function drawStormField(ctx, width, height, palette) {
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.1)`;
    ctx.lineWidth = 1;
    for (let index = -4; index < 14; index++) {
        ctx.beginPath();
        ctx.moveTo(index * 90, 0);
        ctx.lineTo(index * 90 + height * 0.48, height);
        ctx.stroke();
    }
    ctx.restore();
}

function drawFrozenBasin(ctx, width, height, palette) {
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.12)`;
    ctx.lineWidth = 1.5;
    const centerX = width * 0.5;
    const centerY = height * 0.55;
    for (let ring = 1; ring <= 4; ring++) {
        const radius = Math.min(width, height) * (0.12 * ring);
        drawPolygon(ctx, centerX, centerY, radius, 6, Math.PI / 6);
        ctx.stroke();
    }
    ctx.restore();
}

function drawAetherFracture(ctx, width, height, palette) {
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.13)`;
    ctx.lineWidth = 1.5;
    for (let index = 0; index < 6; index++) {
        const x = width * (0.1 + index * 0.16);
        const y = height * (0.18 + (index % 3) * 0.24);
        ctx.beginPath();
        ctx.moveTo(x - 24, y - 58);
        ctx.lineTo(x + 8, y - 18);
        ctx.lineTo(x - 10, y + 14);
        ctx.lineTo(x + 30, y + 62);
        ctx.stroke();
    }
    ctx.restore();
}

function drawHuntHazard(ctx, hazard) {
    const palette = schoolPalette(hazard.school);
    const progress = Math.min(1, Math.max(0, hazard.progress));
    const radius = hazard.radius * (1.12 - progress * 0.12);
    const armedScale = hazard.armed === false ? 0.28 : 1;
    const alpha = (0.2 + progress * 0.62) * armedScale;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);

    if (hazard.signature === 1) drawCinderSweepTelegraph(ctx, radius, progress, alpha, palette);
    else if (hazard.signature === 2) drawTempestCageTelegraph(ctx, radius, progress, alpha, palette);
    else if (hazard.signature === 3) drawGlacialWallTelegraph(ctx, radius, progress, alpha, palette);
    else if (hazard.signature === 4) drawRiftEchoTelegraph(ctx, radius, progress, alpha, palette);
    else drawGenericHuntTelegraph(ctx, radius, progress, alpha, palette);

    ctx.restore();
}

function drawGenericHuntTelegraph(ctx, radius, progress, alpha, palette) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${palette.rgb}, ${(0.035 + progress * 0.07) * alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${palette.rgb}, ${alpha})`;
    ctx.lineWidth = 2 + progress * 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.35 + progress * 0.5), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${(0.2 + progress * 0.5) * alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawCinderSweepTelegraph(ctx, radius, progress, alpha, palette) {
    drawGenericHuntTelegraph(ctx, radius, progress, alpha, palette);
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${Math.min(1, alpha * 1.12)})`;
    ctx.lineWidth = 2.5;
    const reach = radius * (0.45 + progress * 0.4);
    ctx.beginPath();
    ctx.moveTo(-reach, -reach);
    ctx.lineTo(reach, reach);
    ctx.moveTo(reach, -reach);
    ctx.lineTo(-reach, reach);
    ctx.stroke();
}

function drawTempestCageTelegraph(ctx, radius, progress, alpha, palette) {
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${alpha})`;
    ctx.lineWidth = 2.5 + progress;
    for (let ring = 0; ring < 2; ring++) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.72 + ring * 0.28), ring * 0.55, Math.PI * 1.35 + ring * 0.7);
        ctx.stroke();
    }
    for (let index = 0; index < 4; index++) {
        const angle = index * Math.PI / 2 + progress * 0.35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.35, Math.sin(angle) * radius * 0.35);
        ctx.lineTo(Math.cos(angle + 0.16) * radius, Math.sin(angle + 0.16) * radius);
        ctx.stroke();
    }
}

function drawGlacialWallTelegraph(ctx, radius, progress, alpha, palette) {
    ctx.fillStyle = `rgba(${palette.rgb}, ${0.04 * alpha})`;
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${alpha})`;
    ctx.lineWidth = 2.2 + progress;
    drawPolygon(ctx, 0, 0, radius, 6, Math.PI / 6);
    ctx.fill();
    ctx.stroke();
    drawPolygon(ctx, 0, 0, radius * (0.55 + progress * 0.18), 6, Math.PI / 6);
    ctx.stroke();
}

function drawRiftEchoTelegraph(ctx, radius, progress, alpha, palette) {
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = `rgba(${palette.lightRgb}, ${alpha})`;
    ctx.lineWidth = 2 + progress * 1.5;
    const outer = radius * 0.78;
    ctx.strokeRect(-outer, -outer, outer * 2, outer * 2);
    const inner = radius * (0.3 + progress * 0.24);
    ctx.strokeRect(-inner, -inner, inner * 2, inner * 2);
}

function drawHuntStageBanner(ctx, hunt, dragon, width, height) {
    const palette = schoolPalette(hunt.school);
    const progress = Math.min(1, Math.max(0, hunt.stageProgress));
    const fade = Math.min(1, progress * 5, Math.max(0.25, (1 - progress) * 5));
    const entering = hunt.stage === 1;
    const headline = entering ? 'WYRM HUNT' : 'PHASE BREAK';
    const detail = entering
        ? `${dragon?.name?.toUpperCase() ?? 'UNKNOWN WYRM'} • ${dragon?.title?.toUpperCase() ?? 'THE REALM ANSWERS'}`
        : hunt.phaseTwoCallout ?? `${dragon?.name?.toUpperCase() ?? 'THE WYRM'} UNLEASHES ITS TRUE POWER`;
    const signature = `SIGNATURE • ${hunt.signatureName?.toUpperCase() ?? 'UNKNOWN'}`;

    ctx.save();
    ctx.fillStyle = `rgba(5, 4, 8, ${0.26 * fade})`;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = `rgba(${palette.rgb}, ${0.05 * fade})`;
    ctx.fillRect(0, height * 0.41, width, height * 0.18);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(${palette.lightRgb}, ${0.95 * fade})`;
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.fillText(headline, width / 2, height * 0.47);
    ctx.fillStyle = `rgba(244, 238, 248, ${0.95 * fade})`;
    ctx.font = '900 21px system-ui, sans-serif';
    ctx.fillText(detail, width / 2, height * 0.52);
    if (entering) {
        ctx.fillStyle = `rgba(${palette.lightRgb}, ${0.78 * fade})`;
        ctx.font = '800 10px system-ui, sans-serif';
        ctx.fillText(signature, width / 2, height * 0.555);
    }
    ctx.restore();
}

function drawExperienceShard(ctx, shard) {
    const valueScale = Math.min(1, Math.log2(Math.max(1, shard.value)) / 4);
    const pulse = 0.9 + Math.sin(performance.now() / 130 + shard.x * 0.03 + shard.y * 0.02) * 0.1;
    const size = (5 + valueScale * 5) * pulse;
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = 'rgba(188, 135, 255, 0.55)';
    ctx.shadowBlur = 7 + valueScale * 7;
    ctx.fillStyle = shard.value >= 6 ? '#e7c874' : shard.value >= 3 ? '#c698ff' : '#a878e0';
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = shard.value >= 6 ? '#fff0b8' : '#e4caff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
}

function drawExperiencePickup(ctx, pickup) {
    const progress = Math.min(1, Math.max(0, pickup.progress));
    const alpha = 1 - progress;
    const valueScale = Math.min(1.5, Math.log2(Math.max(1, pickup.value) + 1) * 0.32);
    const radius = 18 + progress * (28 + valueScale * 16);
    ctx.save();
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(201, 153, 255, ${alpha * 0.75})`;
    ctx.lineWidth = 3 - progress * 1.4;
    ctx.stroke();

    ctx.strokeStyle = `rgba(236, 215, 255, ${alpha * 0.72})`;
    ctx.lineWidth = 1.5;
    const rays = 4 + Math.min(4, pickup.value);
    for (let index = 0; index < rays; index++) {
        const angle = index * Math.PI * 2 / rays;
        ctx.beginPath();
        ctx.moveTo(pickup.x + Math.cos(angle) * radius * 0.45, pickup.y + Math.sin(angle) * radius * 0.45);
        ctx.lineTo(pickup.x + Math.cos(angle) * radius, pickup.y + Math.sin(angle) * radius);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPerformanceCounter(state, ctx, snapshot, width, height) {
    const panelWidth = Math.min(218, Math.max(160, width - 24));
    const panelHeight = 68;
    const x = Math.max(12, width - panelWidth - 14);
    const y = Math.max(12, height - panelHeight - 14);
    const enemies = snapshot?.enemies?.length ?? 0;
    const projectiles = snapshot?.projectiles?.length ?? 0;
    const experienceShards = snapshot?.experienceShards?.length ?? 0;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 6, 12, 0.78)';
    roundRect(ctx, x, y, panelWidth, panelHeight, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8e0ef';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillText(`FPS ${state.displayFps}  •  SIM ${state.displaySimulationHz}/s`, x + 10, y + 18);
    ctx.fillStyle = '#a99db3';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillText(`C# ${state.displaySimulationMilliseconds.toFixed(1)} ms  •  BRIDGE ${state.displayBridgeMilliseconds.toFixed(1)} ms`, x + 10, y + 37);
    ctx.fillStyle = '#82768c';
    ctx.fillText(`ENEMIES ${enemies}  •  PROJECTILES ${projectiles}  •  XP ${experienceShards}`, x + 10, y + 55);
    ctx.restore();
}

function drawEnemy(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemyColor(enemy);
    ctx.strokeStyle = enemy.hitFlash ? '#fff7eb' : enemyEdgeColor(enemy.kind);
    ctx.lineWidth = enemy.kind === 3 ? 2.5 : 1.4;

    if (enemy.kind === 1) {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-enemy.radius * 0.78, -enemy.radius * 0.78, enemy.radius * 1.56, enemy.radius * 1.56);
        ctx.strokeRect(-enemy.radius * 0.78, -enemy.radius * 0.78, enemy.radius * 1.56, enemy.radius * 1.56);
    } else if (enemy.kind === 2) {
        drawPolygon(ctx, 0, 0, enemy.radius, 3, -Math.PI / 2);
        ctx.fill();
        ctx.stroke();
    } else if (enemy.kind === 3) {
        drawPolygon(ctx, 0, 0, enemy.radius, 6, Math.PI / 6);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();

    if (enemy.frozen || enemy.hitFlash || enemy.healthRatio >= 0.72) return;
    const damage = 1 - enemy.healthRatio;
    ctx.strokeStyle = `rgba(255, 205, 190, ${0.18 + damage * 0.5})`;
    ctx.lineWidth = 1.2 + damage * 1.4;
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.radius * 0.45, enemy.y - enemy.radius * 0.18);
    ctx.lineTo(enemy.x - enemy.radius * 0.06, enemy.y + enemy.radius * 0.08);
    ctx.lineTo(enemy.x + enemy.radius * 0.25, enemy.y - enemy.radius * 0.34);
    ctx.stroke();
    if (enemy.healthRatio > 0.35) return;
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.radius * 0.04, enemy.y + enemy.radius * 0.18);
    ctx.lineTo(enemy.x + enemy.radius * 0.4, enemy.y + enemy.radius * 0.44);
    ctx.stroke();
}

function enemyColor(enemy) {
    if (enemy.hitFlash) return '#fff1df';
    if (enemy.frozen) return '#9fdfff';
    if (enemy.healthRatio <= 0.25) return '#5f2731';
    if (enemy.kind === 1) return enemy.healthRatio <= 0.55 ? '#67356f' : '#9855a4';
    if (enemy.kind === 2) return enemy.healthRatio <= 0.55 ? '#9a472f' : '#df744c';
    if (enemy.kind === 3) return enemy.healthRatio <= 0.55 ? '#6d2a32' : '#9d3c47';
    return enemy.healthRatio <= 0.55 ? '#913640' : '#c14b54';
}

function enemyEdgeColor(kind) {
    if (kind === 1) return '#d393e4';
    if (kind === 2) return '#ffb07a';
    if (kind === 3) return '#d56b75';
    return '#e57b82';
}

function drawSplashPulse(ctx, pulse, school) {
    const palette = school === undefined || school === null ? schoolPalette(1) : schoolPalette(school);
    const progress = Math.min(1, Math.max(0, pulse.progress));
    const radius = pulse.radius * (0.35 + progress * 0.65);
    const alpha = (1 - progress) * 0.72;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${palette.rgb}, ${alpha * 0.08})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${palette.rgb}, ${alpha})`;
    ctx.lineWidth = 4 - progress * 2;
    ctx.stroke();
}

function drawElementalImpact(ctx, impact) {
    const progress = Math.min(1, Math.max(0, impact.progress));
    const alpha = 1 - progress;
    if (impact.spell === 1) {
        drawImpactBurst(ctx, impact.x, impact.y, 7 + progress * 12, `rgba(255, 116, 54, ${alpha})`, 6);
        return;
    }
    if (impact.spell === 2) {
        drawImpactCross(ctx, impact.x, impact.y, 5 + progress * 10, `rgba(151, 224, 255, ${alpha})`, Math.PI / 4);
        return;
    }
    if (impact.spell === 3) {
        drawImpactCross(ctx, impact.x, impact.y, 6 + progress * 11, `rgba(255, 232, 101, ${alpha})`, 0);
        return;
    }

    const radius = 5 + progress * 14;
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(190, 132, 255, ${alpha})`;
    ctx.lineWidth = 2.5 - progress;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, Math.max(1, 4 * alpha), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(224, 195, 255, ${alpha})`;
    ctx.fill();
}

function drawDeathBurst(ctx, death) {
    const progress = Math.min(1, Math.max(0, death.progress));
    const alpha = 1 - progress;
    const intensity = Math.max(1, death.intensity ?? 1);
    const ringRadius = death.radius * (0.65 + progress * (1.15 + intensity * 0.18));
    ctx.beginPath();
    ctx.arc(death.x, death.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 218, 211, ${Math.min(1, alpha * (0.68 + intensity * 0.08))})`;
    ctx.lineWidth = 2.4 + intensity * 0.45 - progress * 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(death.x, death.y, Math.max(1, death.radius * (0.66 + intensity * 0.05) * alpha), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 242, 235, ${alpha * 0.5})`;
    ctx.fill();

    const distance = death.radius * (0.3 + progress * (1.6 + intensity * 0.18));
    const size = Math.max(1, death.radius * (0.2 + intensity * 0.04) * alpha);
    const particles = 4 + intensity * 2;
    ctx.fillStyle = `rgba(210, 91, 101, ${alpha})`;
    for (let index = 0; index < particles; index++) {
        const angle = Math.PI / 4 + index * Math.PI * 2 / particles;
        const x = death.x + Math.cos(angle) * distance;
        const y = death.y + Math.sin(angle) * distance;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
}

function drawExtractionRitual(ctx, extraction) {
    const progress = Math.min(1, Math.max(0, extraction.progress));
    const alpha = extraction.isProgressing ? 1 : 0.48;
    ctx.save();

    ctx.beginPath();
    ctx.arc(extraction.x, extraction.y, extraction.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(157, 94, 226, ${0.06 * alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(198, 154, 255, ${0.35 * alpha})`;
    ctx.lineWidth = 3;
    if (!extraction.isProgressing) ctx.setLineDash([7, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(extraction.x, extraction.y, extraction.radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = `rgba(217, 183, 255, ${alpha})`;
    ctx.lineWidth = 6;
    ctx.stroke();

    if (extraction.isProgressing) {
        const pulseRadius = extraction.radius + 7 + Math.sin(progress * Math.PI * 10) * 2;
        ctx.beginPath();
        ctx.arc(extraction.x, extraction.y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(184, 135, 255, 0.28)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.fillStyle = extraction.isProgressing ? '#e8d7ff' : '#b8a6c9';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = extraction.isProgressing ? 'EXTRACTING' : 'RETURN TO RITUAL';
    ctx.fillText(`${label} ${Math.max(0, extraction.remainingSeconds).toFixed(1)}s`, extraction.x, extraction.y - extraction.radius - 12);
    ctx.restore();
}

function drawImpactBurst(ctx, x, y, radius, color, rays) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let index = 0; index < rays; index++) {
        const angle = index * Math.PI * 2 / rays;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * radius * 0.35, y + Math.sin(angle) * radius * 0.35);
        ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        ctx.stroke();
    }
}

function drawImpactCross(ctx, x, y, radius, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.stroke();
    ctx.restore();
}

function drawDragonBreath(ctx, breath, school) {
    const palette = schoolPalette(school ?? 1);
    const angle = Math.atan2(breath.directionY, breath.directionX);
    ctx.beginPath();
    ctx.moveTo(breath.x, breath.y);
    ctx.arc(breath.x, breath.y, breath.range, angle - breath.halfAngle, angle + breath.halfAngle);
    ctx.closePath();
    ctx.fillStyle = `rgba(${palette.rgb}, 0.16)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${palette.rgb}, 0.65)`;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawDragon(ctx, dragon) {
    const palette = schoolPalette(dragon.school);
    ctx.save();
    ctx.translate(dragon.x, dragon.y);

    if (dragon.phase === 2) {
        ctx.beginPath();
        ctx.arc(0, 0, dragon.radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${palette.rgb}, 0.5)`;
        ctx.lineWidth = 5;
        ctx.stroke();
    }

    if (dragon.school === 0) drawArcaneWyrm(ctx, dragon, palette);
    else if (dragon.school === 1) drawFireWyrm(ctx, dragon, palette);
    else if (dragon.school === 2) drawFrostWyrm(ctx, dragon, palette);
    else drawStormWyrm(ctx, dragon, palette);

    ctx.restore();
}

function drawFireWyrm(ctx, dragon, palette) {
    const radius = dragon.radius;
    drawDragonCore(ctx, dragon, palette, 1, 1);
    ctx.fillStyle = palette.edge;
    drawTriangle(ctx, -radius * 0.66, -radius * 0.55, -radius * 0.28, -radius * 1.38, -radius * 0.08, -radius * 0.62);
    drawTriangle(ctx, radius * 0.66, -radius * 0.55, radius * 0.28, -radius * 1.38, radius * 0.08, -radius * 0.62);
    ctx.fillStyle = palette.phase;
    for (let index = -1; index <= 1; index++) {
        drawTriangle(ctx, index * radius * 0.38 - 5, radius * 0.72, index * radius * 0.38, radius * 1.25, index * radius * 0.38 + 5, radius * 0.72);
    }
    drawDragonEyes(ctx, radius, palette);
}

function drawStormWyrm(ctx, dragon, palette) {
    const radius = dragon.radius;
    drawDragonCore(ctx, dragon, palette, 1.12, 0.78);
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.85, -radius * 0.1);
    ctx.lineTo(-radius * 1.45, -radius * 0.65);
    ctx.lineTo(-radius * 1.1, radius * 0.15);
    ctx.moveTo(radius * 0.85, -radius * 0.1);
    ctx.lineTo(radius * 1.45, -radius * 0.65);
    ctx.lineTo(radius * 1.1, radius * 0.15);
    ctx.stroke();
    ctx.fillStyle = palette.edge;
    drawTriangle(ctx, -radius * 0.42, -radius * 0.55, -radius * 0.12, -radius * 1.22, -radius * 0.02, -radius * 0.52);
    drawTriangle(ctx, radius * 0.42, -radius * 0.55, radius * 0.12, -radius * 1.22, radius * 0.02, -radius * 0.52);
    drawDragonEyes(ctx, radius, palette);
}

function drawFrostWyrm(ctx, dragon, palette) {
    const radius = dragon.radius;
    ctx.beginPath();
    for (let index = 0; index < 8; index++) {
        const angle = -Math.PI / 2 + index * Math.PI / 4;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = dragon.frozen ? '#d8f5ff' : dragon.phase === 2 ? palette.phase : palette.body;
    ctx.fill();
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = palette.edge;
    drawTriangle(ctx, -radius * 0.68, -radius * 0.42, -radius * 0.3, -radius * 1.55, -radius * 0.08, -radius * 0.6);
    drawTriangle(ctx, radius * 0.68, -radius * 0.42, radius * 0.3, -radius * 1.55, radius * 0.08, -radius * 0.6);
    drawDragonEyes(ctx, radius, palette);
}

function drawArcaneWyrm(ctx, dragon, palette) {
    const radius = dragon.radius;
    ctx.strokeStyle = `rgba(${palette.lightRgb}, 0.45)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.55, radius * 0.72, Math.PI / 5, 0, Math.PI * 2);
    ctx.stroke();
    drawDragonCore(ctx, dragon, palette, 0.9, 0.9);
    ctx.fillStyle = palette.edge;
    for (let index = 0; index < 3; index++) {
        const angle = index * Math.PI * 2 / 3 + 0.35;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radius * 1.35, Math.sin(angle) * radius * 0.72, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    drawDragonEyes(ctx, radius, palette);
}

function drawDragonCore(ctx, dragon, palette, scaleX, scaleY) {
    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.beginPath();
    ctx.arc(0, 0, dragon.radius, 0, Math.PI * 2);
    ctx.fillStyle = dragon.frozen ? '#bdeeff' : dragon.phase === 2 ? palette.phase : palette.body;
    ctx.fill();
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
}

function drawDragonEyes(ctx, radius, palette) {
    ctx.fillStyle = palette.eye;
    ctx.beginPath();
    ctx.arc(-radius * 0.32, -radius * 0.12, 3, 0, Math.PI * 2);
    ctx.arc(radius * 0.32, -radius * 0.12, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawBossBar(ctx, dragon, hunt, width) {
    const palette = schoolPalette(dragon.school);
    const outerWidth = Math.min(430, width - 36);
    const x = (width - outerWidth) / 2;
    const y = 16;
    const panelHeight = hunt?.signatureName ? 58 : 48;
    ctx.fillStyle = palette.dark;
    roundRect(ctx, x, y, outerWidth, panelHeight, 12);
    ctx.fill();

    ctx.fillStyle = palette.text;
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${dragon.name.toUpperCase()} • ${dragon.title.toUpperCase()} • PHASE ${dragon.phase}`, width / 2, y + 17);
    if (hunt?.signatureName) {
        ctx.fillStyle = palette.edge;
        ctx.font = '800 9px system-ui, sans-serif';
        ctx.fillText(`SIGNATURE • ${hunt.signatureName.toUpperCase()}`, width / 2, y + 31);
    }

    const innerX = x + 12;
    const innerWidth = outerWidth - 24;
    ctx.fillStyle = 'rgba(9, 7, 12, 0.72)';
    const healthY = hunt?.signatureName ? y + 39 : y + 27;
    roundRect(ctx, innerX, healthY, innerWidth, 10, 5);
    ctx.fill();
    ctx.fillStyle = dragon.phase === 2 ? palette.phase : palette.body;
    roundRect(ctx, innerX, healthY, innerWidth * Math.max(0, dragon.health / dragon.maxHealth), 10, 5);
    ctx.fill();
    ctx.textAlign = 'start';
}

function drawHud(ctx, hud, width, dragonActive) {
    const x = 18;
    const y = dragonActive ? 76 : 18;
    const barWidth = Math.min(300, width - x * 2);
    const hasSynergies = hud.synergies.length > 0;
    const panelHeight = hasSynergies ? 178 : 158;
    ctx.fillStyle = 'rgba(8, 6, 12, 0.76)';
    roundRect(ctx, x, y, barWidth + 24, panelHeight, 12);
    ctx.fill();

    ctx.fillStyle = '#ede8f5';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(`Score ${hud.score}`, x + 12, y + 22);
    ctx.fillText(`${hud.seconds}s  •  ${hud.kills} kills`, x + 12, y + 43);

    ctx.fillStyle = '#332a3e';
    roundRect(ctx, x + 12, y + 55, barWidth, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#9ed6a2';
    roundRect(ctx, x + 12, y + 55, barWidth * Math.max(0, hud.health / hud.maxHealth), 10, 5);
    ctx.fill();

    ctx.fillStyle = '#bdb3c7';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`Level ${hud.level}  •  XP ${hud.experience}/${hud.experienceToNext}`, x + 12, y + 88);
    ctx.fillStyle = '#332a3e';
    roundRect(ctx, x + 12, y + 97, barWidth, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#b887ff';
    roundRect(ctx, x + 12, y + 97, barWidth * Math.min(1, hud.experience / hud.experienceToNext), 8, 4);
    ctx.fill();

    ctx.fillStyle = '#796f83';
    ctx.font = '800 9px system-ui, sans-serif';
    ctx.fillText('SPELLS', x + 12, y + 124);
    ctx.fillStyle = '#c9bfd3';
    ctx.font = '600 11px system-ui, sans-serif';
    const spells = hud.spells.map(spell => `${spell.icon}${roman(spell.rank)}`).join('   ');
    ctx.fillText(spells, x + 58, y + 124);

    if (hasSynergies) {
        ctx.fillStyle = '#b28c4f';
        ctx.font = '800 9px system-ui, sans-serif';
        ctx.fillText('SYNERGIES', x + 12, y + 148);
        ctx.fillStyle = '#e0c17b';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText(hud.synergies.map(synergy => `${synergy.icon} ${synergy.name}`).join('   '), x + 78, y + 148);
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
    ctx.beginPath();
    for (let x = 0; x < width; x += 44) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 44) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();
}

function schoolPalette(school) {
    if (school === 1) return { body: '#a44031', phase: '#ef5f35', edge: '#efaa63', eye: '#fff0b0', text: '#f4d6bb', dark: 'rgba(29, 10, 7, 0.92)', rgb: '238, 91, 48', lightRgb: '255, 188, 112' };
    if (school === 2) return { body: '#5a8ea3', phase: '#88d8ec', edge: '#b9eff8', eye: '#f2fdff', text: '#d8f6fb', dark: 'rgba(7, 20, 28, 0.92)', rgb: '128, 216, 238', lightRgb: '208, 248, 255' };
    if (school === 3) return { body: '#6f6d38', phase: '#d4c83e', edge: '#fff18a', eye: '#fffbd2', text: '#f3edbd', dark: 'rgba(20, 19, 6, 0.92)', rgb: '236, 220, 75', lightRgb: '255, 246, 164' };
    return { body: '#68458f', phase: '#a35de0', edge: '#d9b5ff', eye: '#f7edff', text: '#ead8f8', dark: 'rgba(18, 8, 27, 0.92)', rgb: '176, 103, 232', lightRgb: '226, 190, 255' };
}

function projectileColor(spell) {
    if (spell === 1) return '#ff7a45';
    if (spell === 2) return '#8fdcff';
    if (spell === 3) return '#ffe765';
    return '#b887ff';
}

function roman(value) {
    return ['0', 'I', 'II', 'III', 'IV', 'V'][value] ?? String(value);
}

function drawTriangle(ctx, x1, y1, x2, y2, x3, y3) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
}

function drawPolygon(ctx, x, y, radius, sides, rotation) {
    ctx.beginPath();
    for (let index = 0; index < sides; index++) {
        const angle = rotation + index * Math.PI * 2 / sides;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
}