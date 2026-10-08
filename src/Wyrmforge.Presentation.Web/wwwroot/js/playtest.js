// Privacy-first, offline-capable playtest evidence. Nothing is sent to a server without an explicit share action.
(() => {
    'use strict';
    const key = 'wyrmforge.playtest.v1';
    const schemaVersion = 1;
    const maximumRuns = 12;
    const allowedMilestones = new Set(['trail_entered', 'wyrm_entered', 'refuge_reached', 'descended', 'extracted']);
    const newId = () => globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const blank = () => ({ schemaVersion, sessionId: newId(), started: 0, ended: 0, interrupted: 0, trails: 0, wyrmGates: 0, runs: [], active: null });
    let state = load();

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
            return saved?.schemaVersion === schemaVersion && Array.isArray(saved.runs) ? saved : blank();
        } catch { return blank(); }
    }
    function persist() {
        try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* Safari private mode and disabled storage remain playable. */ }
    }
    function safeNumber(value) { return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0; }
    function startRun(rite) {
        if (state.active) {
            state.interrupted++;
            state.runs.push({ ...state.active, outcome: 'Interrupted', durationSeconds: safeNumber((Date.now() - state.active.startedAt) / 1000) });
        }
        state.started++;
        state.active = { runId: newId(), startedAt: Date.now(), ascendantRite: !!rite, milestones: [], perf: { samples: 0, slowFrames: 0, maxBridgeMs: 0 } };
        state.runs = state.runs.slice(-maximumRuns);
        persist();
    }
    function milestone(name) {
        if (!allowedMilestones.has(name) || !state.active) return;
        state.active.milestones.push(name);
        if (name === 'trail_entered') state.trails++;
        if (name === 'wyrm_entered') state.wyrmGates++;
        // Do not store a detailed clickstream or player coordinates.
        state.active.milestones = state.active.milestones.slice(-30);
        persist();
    }
    function performanceSample(frameIntervalMs, simulationMs) {
        if (!state.active) return;
        const perf = state.active.perf;
        perf.samples++;
        if (frameIntervalMs > 34) perf.slowFrames++;
        perf.maxBridgeMs = Math.max(perf.maxBridgeMs, Math.min(10000, safeNumber(simulationMs)));
        // In-memory during combat. Persist only at a milestone or when the run ends.
    }
    function finishRun(report) {
        if (!report || typeof report !== 'object') return;
        const active = state.active ?? { runId: newId(), startedAt: Date.now(), ascendantRite: false, milestones: [], perf: { samples: 0, slowFrames: 0, maxBridgeMs: 0 } };
        const allowedOutcome = ['Extracted', 'Defeated', 'Abandoned'].includes(report.outcome) ? report.outcome : 'Unknown';
        state.runs.push({
            ...active, outcome: allowedOutcome, seed: safeNumber(report.seed), score: safeNumber(report.score),
            durationSeconds: safeNumber(report.seconds), depth: safeNumber(report.depth), level: safeNumber(report.level),
            kills: safeNumber(report.kills), trailsCompleted: safeNumber(report.trailsCompleted),
            rareTrails: safeNumber(report.rareTrails), wyrmsDefeated: safeNumber(report.wyrmsDefeated),
            essencesSecured: safeNumber(report.essencesSecured), spellEvolutions: Array.isArray(report.spellEvolutions) ? report.spellEvolutions.slice(0, 12) : [],
            ascendantVictories: safeNumber(report.ascendantVictories)
        });
        state.runs = state.runs.slice(-maximumRuns);
        state.ended++;
        state.active = null;
        persist();
    }
    function context() {
        return {
            kind: matchMedia('(pointer: coarse)').matches ? 'touch' : 'pointer',
            viewport: `${Math.round(innerWidth)}x${Math.round(innerHeight)}`,
            standalone: matchMedia('(display-mode: standalone)').matches
        };
    }
    function buildReport(answers) {
        const ratings = [1, 2, 3, 4, 5];
        const cleanRating = value => ratings.includes(Number(value)) ? Number(value) : null;
        const replay = ['yes', 'maybe', 'no'].includes(answers?.replay) ? answers.replay : null;
        const categories = ['onboarding', 'movement', 'combat', 'rewards', 'forge', 'wyrms', 'performance', 'other'];
        return {
            schema: 'wyrmforge.playtest.report.v1',
            id: newId(),
            createdUtc: new Date().toISOString(),
            gameVersion: document.querySelector('[data-game-version]')?.getAttribute('data-game-version') ?? '0.0.80',
            device: context(),
            feedback: {
                enjoyment: cleanRating(answers?.enjoyment),
                clarity: cleanRating(answers?.clarity),
                replay,
                troubleArea: categories.includes(answers?.troubleArea) ? answers.troubleArea : null,
                bestMoment: String(answers?.bestMoment ?? '').slice(0, 600).trim(),
                improvement: String(answers?.improvement ?? '').slice(0, 1000).trim()
            },
            stats: { starts: state.started, completedRuns: state.ended, interruptedRuns: state.interrupted, trailsEntered: state.trails, wyrmGatesEntered: state.wyrmGates },
            recentRuns: answers?.includeRuns === false ? [] : state.runs.map(({ startedAt, ...run }) => run),
            // No name, email, IP, full user agent, persistent cross-device identifier or raw event logs.
        };
    }
    async function share(answers) {
        const report = buildReport(answers);
        const json = JSON.stringify(report, null, 2);
        const file = new File([json], `wyrmforge-playtest-${report.id}.json`, { type: 'application/json' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ title: 'WyrmForge playtest', text: 'WyrmForge beta playtest feedback and session report', files: [file] });
                return 'shared';
            } catch (error) {
                if (error?.name === 'AbortError') return 'cancelled';
                // Browser support varies; fallback to a real downloadable report.
            }
        }
        const url = URL.createObjectURL(file);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 15000);
        return 'downloaded';
    }
    function clear() {
        state = blank();
        try { localStorage.removeItem(key); } catch { /* No storage available. */ }
    }
    let endpointPromise;
    async function getCollectorEndpoint() {
        endpointPromise ??= (async () => {
            try {
                const response = await fetch(new URL('playtest-collector-config.json', document.baseURI), {
                    cache: 'no-store', credentials: 'omit'
                });
                if (!response.ok) return null;
                const config = await response.json();
                const uri = new URL(config.endpoint);
                if (uri.protocol !== 'https:' || uri.pathname !== '/v1/reports' || uri.search || uri.hash || uri.username || uri.password) return null;
                return uri.href;
            } catch { return null; }
        })();
        return endpointPromise;
    }
    async function collectorReady() { return (await getCollectorEndpoint()) !== null; }
    async function sendDirect(answers) {
        const endpoint = await getCollectorEndpoint();
        if (!endpoint) return 'unavailable';
        const report = buildReport(answers);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(endpoint, {
                method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error',
                referrerPolicy: 'no-referrer', signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consent: true, report })
            });
            if (response.status === 429) return 'rate_limited';
            if (!response.ok) return 'failure';
            const receipt = await response.json();
            return receipt?.accepted === true && receipt.id === report.id ? 'sent' : 'failure';
        } catch { return 'unavailable'; }
        finally { clearTimeout(timer); }
    }

    window.wyrmforgePlaytest = { startRun, milestone, performanceSample, finishRun, buildReport, share, clear, collectorReady, sendDirect };
})();
