import { disposeArena as disposeBaseArena, initializeArena as initializeBaseArena } from './arena.js';

const frameStates = new WeakMap();
const activeSimulationIntervalMilliseconds = 1000 / 60;
const pausedSimulationIntervalMilliseconds = 100;
const statusVisuals = [
    { icon: '❄', color: '#9fe5ff' },
    { icon: '✹', color: '#ff8755' },
    { icon: '◆', color: '#77c9ff' },
    { icon: 'ϟ', color: '#ffe765' },
    { icon: '◇', color: '#c497ff' },
];

export function initializeArena(canvas, dotNetReference) {
    const originalGetBoundingClientRect = canvas.getBoundingClientRect.bind(canvas);
    const state = {
        canvas,
        dotNetReference,
        active: true,
        lastSimulationTimestamp: performance.now() - activeSimulationIntervalMilliseconds,
        latestSnapshot: null,
        originalGetBoundingClientRect,
        canvasRect: originalGetBoundingClientRect(),
        resizeObserver: null,
        onViewportChanged: null,
        pendingTimer: 0,
        pendingResolve: null,
        statusCanvas: createStatusCanvas(),
        combatHud: getCombatHud(canvas),
        lastHudUpdate: 0,
    };
    state.onViewportChanged = () => {
        state.canvasRect = state.originalGetBoundingClientRect();
        syncStatusCanvas(state);
    };
    canvas.getBoundingClientRect = () => state.canvasRect;
    state.resizeObserver = new ResizeObserver(state.onViewportChanged);
    state.resizeObserver.observe(canvas);
    window.addEventListener('resize', state.onViewportChanged);
    window.addEventListener('scroll', state.onViewportChanged, { passive: true });
    document.body.appendChild(state.statusCanvas);
    syncStatusCanvas(state);
    frameStates.set(canvas, state);
    initializeBaseArena(canvas, createThrottledReference(state));
}

export function disposeArena(canvas) {
    const state = frameStates.get(canvas);
    if (state) {
        state.active = false;
        state.resizeObserver?.disconnect();
        window.removeEventListener('resize', state.onViewportChanged);
        window.removeEventListener('scroll', state.onViewportChanged);
        canvas.getBoundingClientRect = state.originalGetBoundingClientRect;
        if (state.pendingTimer) window.clearTimeout(state.pendingTimer);
        state.pendingResolve?.(state.latestSnapshot);
        state.statusCanvas.remove();
        frameStates.delete(canvas);
    }
    disposeBaseArena(canvas);
}

function createThrottledReference(state) {
    return {
        invokeMethodAsync(method, ...args) {
            if (method !== 'Frame') return state.dotNetReference.invokeMethodAsync(method, ...args);
            const now = performance.now();
            const interval = state.latestSnapshot?.paused ? pausedSimulationIntervalMilliseconds : activeSimulationIntervalMilliseconds;
            const wait = Math.max(0, interval - (now - state.lastSimulationTimestamp));
            if (wait <= 0.5) return invokeFrame(state, args);
            return new Promise((resolve, reject) => {
                state.pendingResolve = resolve;
                state.pendingTimer = window.setTimeout(() => {
                    state.pendingTimer = 0;
                    state.pendingResolve = null;
                    if (!state.active) {
                        resolve(state.latestSnapshot);
                        return;
                    }
                    invokeFrame(state, args).then(resolve, reject);
                }, wait);
            });
        },
    };
}

async function invokeFrame(state, args) {
    const now = performance.now();
    const delta = Math.min((now - state.lastSimulationTimestamp) / 1000, 0.05);
    state.lastSimulationTimestamp = now;
    const snapshot = await state.dotNetReference.invokeMethodAsync('Frame', delta, args[1], args[2], args[3], args[4]);
    if (state.active) {
        state.latestSnapshot = snapshot;
        drawStatusOverlay(state, snapshot);
        updateCombatHud(state, snapshot);
    }
    return snapshot;
}

function createStatusCanvas() {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '2',
    });
    return canvas;
}

function syncStatusCanvas(state) {
    const rect = state.canvasRect;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.statusCanvas.style.left = `${rect.left}px`;
    state.statusCanvas.style.top = `${rect.top}px`;
    state.statusCanvas.style.width = `${rect.width}px`;
    state.statusCanvas.style.height = `${rect.height}px`;
    state.statusCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    state.statusCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    state.statusCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.latestSnapshot) drawStatusOverlay(state, state.latestSnapshot);
}

function drawStatusOverlay(state, snapshot) {
    const ctx = state.statusCanvas.getContext('2d');
    const rect = state.canvasRect;
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const enemy of snapshot?.enemies ?? []) drawStatusBadges(ctx, enemy.x, enemy.y, enemy.radius, enemy.statuses, false);
    if (snapshot?.dragon) drawStatusBadges(ctx, snapshot.dragon.x, snapshot.dragon.y, snapshot.dragon.radius, snapshot.dragon.statuses, true);
}

function drawStatusBadges(ctx, x, y, radius, statuses, large) {
    if (!statuses?.length) return;
    const badgeRadius = large ? 10 : 8;
    const spacing = badgeRadius * 2 + (large ? 5 : 3);
    const totalWidth = (statuses.length - 1) * spacing;
    const startX = x - totalWidth / 2;
    const badgeY = y - radius - (large ? 18 : 14);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let index = 0; index < statuses.length; index++) {
        const status = statuses[index];
        const visual = statusVisuals[status.id] ?? statusVisuals[4];
        const badgeX = startX + index * spacing;

        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(9, 7, 13, 0.88)';
        ctx.fill();
        ctx.strokeStyle = visual.color;
        ctx.lineWidth = large ? 2 : 1.5;
        ctx.stroke();

        ctx.fillStyle = visual.color;
        ctx.font = `${large ? 900 : 800} ${large ? 13 : 11}px system-ui, sans-serif`;
        ctx.fillText(visual.icon, badgeX, badgeY + 0.5);

        if (status.stacks <= 1) continue;
        const countX = badgeX + badgeRadius * 0.78;
        const countY = badgeY + badgeRadius * 0.72;
        ctx.beginPath();
        ctx.arc(countX, countY, large ? 6 : 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f5eef9';
        ctx.fill();
        ctx.fillStyle = '#17111d';
        ctx.font = `900 ${large ? 8 : 7}px system-ui, sans-serif`;
        ctx.fillText(String(status.stacks), countX, countY + 0.25);
    }
    ctx.restore();
}

function getCombatHud(canvas) {
    const root = canvas.closest('.game-screen')?.querySelector('.combat-vitals');
    if (!root) return null;
    const get = key => root.querySelector(`[data-hud="${key}"]`);
    return { score:get('score'),time:get('time'),kills:get('kills'),health:get('health'),
        level:get('level'),spells:get('spells'),healthFill:get('health-fill'),xpFill:get('xp-fill') };
}

function updateCombatHud(state, snapshot) {
    if (!state.combatHud || !snapshot?.hud) return;
    const now = performance.now();
    if (now - state.lastHudUpdate < 90) return;
    state.lastHudUpdate = now;
    const hud = snapshot.hud;
    const dom = state.combatHud;
    const updateText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
    updateText(dom.score, `SCORE ${hud.score}`);
    updateText(dom.time, `${hud.seconds}s`);
    updateText(dom.kills, `${hud.kills} KILLS`);
    updateText(dom.health, `HP ${Math.ceil(hud.health)}/${Math.ceil(hud.maxHealth)}`);
    updateText(dom.level, `LV ${hud.level}`);
    const roman = rank => ['0','I','II','III','IV','V'][rank] ?? String(rank);
    updateText(dom.spells, hud.spells.map(spell => `${spell.evolutionIcon ?? spell.icon}${roman(spell.rank)}`).join('  '));
    if (dom.healthFill) dom.healthFill.style.width = `${Math.max(0, Math.min(100, hud.health / Math.max(1, hud.maxHealth) * 100))}%`;
    if (dom.xpFill) dom.xpFill.style.width = `${Math.max(0, Math.min(100, hud.experience / Math.max(1, hud.experienceToNext) * 100))}%`;
}
