import { createSpellBadge } from './spell-hud.js';
import { clampHudFraction, cooldownPresentation, selectCombatSlots } from './combat-hud-state.js';
import { createSoundEventTracker, collectSoundEvents } from './sound-events.js';
import { disposeArena as disposeBaseArena, initializeArena as initializeBaseArena, readArenaDiagnostics as readBaseArenaDiagnostics, renderArenaMapOverview as renderBaseMapOverview, inspectTerrainCacheRebuild as inspectBaseTerrainCacheRebuild, beginHuntEntry as beginBaseHuntEntry, cancelHuntEntry as cancelBaseHuntEntry } from './arena.js?v=20261108-hunt-entry-early-v2';
import { resolveArenaCamera } from './arena-camera.js';

const frameStates = new WeakMap();
// Diagnostics must read the same module instance that owns the actual Hunt canvas.
export const readArenaDiagnostics = canvas => readBaseArenaDiagnostics(canvas);
export const renderArenaMapOverview = canvas => renderBaseMapOverview(canvas);
export const inspectTerrainCacheRebuild = canvas => inspectBaseTerrainCacheRebuild(canvas);
export const beginHuntEntry = canvas => beginBaseHuntEntry(canvas);
export const cancelHuntEntry = canvas => cancelBaseHuntEntry(canvas);
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
        lastPlaytestSample: 0,
        lastSampleFrame: 0,
        soundEvents: createSoundEventTracker(),
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
    canvas.parentElement.appendChild(state.statusCanvas);
    syncStatusCanvas(state);
    frameStates.set(canvas, state);
    initializeBaseArena(canvas, createThrottledReference(state), { huntEntryLoading: true });
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
    const snapshot = await state.dotNetReference.invokeMethodAsync('Frame', delta, ...args.slice(1));
    if (state.active) {
        state.latestSnapshot = snapshot;
        for (const cue of collectSoundEvents(state.soundEvents, snapshot, now)) window.wyrmforgeAudio?.play(cue);
        drawStatusOverlay(state, snapshot);
        updateCombatHud(state, snapshot);
        if (!snapshot.paused && now - state.lastPlaytestSample > 5000) {
            const previousFrame = state.lastSampleFrame || now;
            window.wyrmforgePlaytest?.performanceSample(now - previousFrame, snapshot.simulationMilliseconds ?? 0);
            state.lastPlaytestSample = now;
        }
        state.lastSampleFrame = now;
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
    if (snapshot?.paused || snapshot?.ended) return;
    const camera = resolveArenaCamera(snapshot?.world, snapshot?.player, rect.width, rect.height);
    for (const enemy of snapshot?.enemies ?? [])
        drawStatusBadges(ctx, enemy.x - camera.x, enemy.y - camera.y, enemy.radius, enemy.statuses, false);
    if (snapshot?.dragon)
        drawStatusBadges(ctx, snapshot.dragon.x - camera.x, snapshot.dragon.y - camera.y, snapshot.dragon.radius, snapshot.dragon.statuses, true);
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
    const root = canvas.closest('.game-screen')?.querySelector('.arcane-hunt-hud');
    if (!root) return null;
    const get = key => root.querySelector(`[data-hud="${key}"]`);
    return {
        root,
        health: get('health'), healthFill: get('health-fill'),
        level: get('level'), xpFill: get('xp-fill'), xpValue: get('xp-value'),
        spells: get('spells'), defensiveSpell: get('defensive-spell'),
        primaryCooldown: get('primary-cooldown'), defensiveCooldown: get('defensive-cooldown'),
        primarySlot: root.querySelector('[data-hud-slot="primary"]'),
        defensiveSlot: root.querySelector('[data-hud-slot="defensive"]'),
    };
}

function setSpellCooldown(slot, label, remaining, duration) {
    if (!slot) return;
    const display = cooldownPresentation(remaining, duration);
    slot.style.setProperty('--ready-angle', `${display.readyDegrees}deg`);
    slot.style.setProperty('--shade-angle', `${display.shadeDegrees}deg`);
    slot.classList.toggle('is-recovering', display.recovering);
    if (label && label.textContent !== display.text) label.textContent = display.text;
}

function updateCombatHud(state, snapshot) {
    if (!state.combatHud || !snapshot?.hud) return;
    const now = performance.now();
    if (now - state.lastHudUpdate < 90) return;
    state.lastHudUpdate = now;
    const hud = snapshot.hud;
    const dom = state.combatHud;
    const encounter = state.canvas.closest('.game-screen')?.querySelector('.encounter-objective');
    if (encounter && snapshot.trail) {
        const trail = snapshot.trail;
        const percent = Math.round(clampHudFraction(trail.progress) * 100);
        const fill = encounter.querySelector('[data-trail="progress"]');
        if (fill) {
            fill.style.width = `${percent}%`;
            fill.parentElement.setAttribute('aria-valuenow', String(percent));
        }
        const clock = encounter.querySelector('[data-trail="phase-time"]');
        const objective = encounter.querySelector('[data-trail="objective"]');
        if (clock) clock.textContent = trail.phaseStatus;
        if (objective) objective.textContent = trail.objective;
    }
    const updateText = (node, value) => {
        if (node && node.textContent !== value) node.textContent = value;
    };

    // Left crystal orb is the real health meter; the right orb has no invented resource.
    const healthFraction = clampHudFraction(hud.health / Math.max(1, hud.maxHealth));
    const healthState = healthFraction <= .25 ? 'critical' : healthFraction <= .55 ? 'wounded' : 'healthy';
    const healthTrack = dom.healthFill?.closest('.combat-health-track');
    if (healthTrack) {
        healthTrack.dataset.healthState = healthState;
        healthTrack.setAttribute('aria-valuenow', String(Math.round(healthFraction * 100)));
        healthTrack.setAttribute('aria-valuetext', `${Math.ceil(hud.health)} of ${Math.ceil(hud.maxHealth)} health`);
    }
    dom.root.dataset.healthState = healthState;
    if (dom.healthFill) dom.healthFill.style.height = `${healthFraction * 100}%`;
    updateText(dom.health, `${Math.ceil(hud.health)}/${Math.ceil(hud.maxHealth)}`);

    updateText(dom.level, `LV ${hud.level}`);
    updateText(dom.xpValue, `EXP ${hud.experience}/${hud.experienceToNext}`);
    const experienceFraction = clampHudFraction(hud.experience / Math.max(1, hud.experienceToNext));
    if (dom.xpFill) {
        dom.xpFill.style.width = `${experienceFraction * 100}%`;
        dom.xpFill.parentElement?.setAttribute('aria-valuenow', String(Math.round(experienceFraction * 100)));
    }

    // Spell visuals are the actual selected primary and prepared contextual auto-cast.
    const { primary, defensive } = selectCombatSlots(hud.spells);
    const primarySignature = primary ? JSON.stringify(primary) : '';
    if (dom.spells && dom.spells.dataset.loadout !== primarySignature) {
        dom.spells.dataset.loadout = primarySignature;
        dom.spells.replaceChildren(...(primary ? [createSpellBadge(primary)] : []));
    }
    if (dom.primarySlot) {
        dom.primarySlot.setAttribute('aria-label', primary ? `Primary automatic spell: ${primary.name}` : 'Primary automatic spell');
    }
    setSpellCooldown(dom.primarySlot, dom.primaryCooldown, hud.primaryCooldownRemaining, hud.primaryCooldownDuration);

    const defensiveSignature = defensive ? JSON.stringify(defensive) : 'locked';
    if (dom.defensiveSpell && dom.defensiveSpell.dataset.loadout !== defensiveSignature) {
        dom.defensiveSpell.dataset.loadout = defensiveSignature;
        if (defensive) dom.defensiveSpell.replaceChildren(createSpellBadge(defensive));
        // Before Hunter level 3, preserve the inactive shield art and do not show a fictional ability.
    }
    if (dom.defensiveSlot) {
        dom.defensiveSlot.classList.toggle('is-locked', !defensive);
        dom.defensiveSlot.setAttribute('aria-label', defensive
            ? `Automatic defensive spell: ${defensive.name}` : 'Automatic defence not yet unlocked');
    }
    if (defensive) setSpellCooldown(dom.defensiveSlot, dom.defensiveCooldown,
        hud.defensiveCooldownRemaining, hud.defensiveCooldownDuration);
    else {
        dom.defensiveSlot?.classList.remove('is-recovering');
        dom.defensiveSlot?.style.setProperty('--ready-angle', '0deg');
        dom.defensiveSlot?.style.setProperty('--shade-angle', '0deg');
        updateText(dom.defensiveCooldown, 'LOCKED');
    }
}
