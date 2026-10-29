// G4 evidence is local-first: death/navigation must never destroy a finished run.
export const G4_LAST_RECORD_KEY = 'wyrmforge.g4.lastRecord.v1';
const G4_PENDING_KEY = 'wyrmforge.g4.pendingRecord.v1';
const G4_RECEIPT_KEY = 'wyrmforge.g4.lastReceipt.v1';
const G4_CONSENT_KEY = 'wyrmforge.g4.autoSendConsent.v1';
const minimumIntervals = 10;
const readJson = key => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
};
const writeJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};
export const hasG4Evidence = value => value?.frameIntervals >= minimumIntervals &&
    Number.isFinite(value?.observedFps) && Number.isFinite(value?.frameMsP95);
const consented = () => {
    try { return localStorage.getItem(G4_CONSENT_KEY) === 'yes'; } catch { return false; }
};

/** Only bounded numeric aggregation is sent. No full UA, coordinates, DPR, or individual frame samples. */
export function buildG4CollectorReport(record) {
    if (!hasG4Evidence(record)) return null;
    const keys = ['frameIntervals', 'elapsedSeconds', 'measuredPlayingSeconds', 'observedFps',
        'frameMsP50', 'frameMsP95', 'frameMsP99', 'over33msPercent',
        'renderingFailures', 'missingGpuFrames', 'gpuSamples', 'sampledDynamicPixelsMean'];
    const g4 = Object.fromEntries(keys.map(key => [key, record[key] ?? null]));
    g4.mode = record.mode;
    g4.quality = record.quality;
    return {
        schema: 'wyrmforge.playtest.report.v1',
        id: record.id,
        gameVersion: document.querySelector('[data-game-version]')?.getAttribute('data-game-version') ?? '0.0.180',
        device: { kind: 'touch', standalone: matchMedia('(display-mode: standalone)').matches },
        feedback: { enjoyment: null, clarity: null, replay: null, troubleArea: null, bestMoment: '', improvement: '' },
        stats: { starts: 0, completedRuns: 0, interruptedRuns: 0, trailsEntered: 0, wyrmGatesEntered: 0 },
        recentRuns: [{ runId: record.id, outcome: record.outcome === 'Defeated' ? 'Defeated' :
            record.outcome === 'Abandoned' ? 'Abandoned' : 'Interrupted',
            perf: { samples: record.frameIntervals, slowFrames: Math.round(record.frameIntervals *
                record.over33msPercent / 100), maxBridgeMs: 0 }, g4 }]
    };
}

async function sendPendingG4Evidence(setStatus = () => {}) {
    if (!consented()) return;
    const record = readJson(G4_PENDING_KEY);
    if (!record || !hasG4Evidence(record)) return;
    const report = buildG4CollectorReport(record);
    if (!report) return;
    try {
        const configuration = await fetch(new URL('playtest-collector-config.json', document.baseURI),
            { cache: 'no-store', credentials: 'omit' });
        if (!configuration.ok || !consented()) { setStatus('G4 saved locally · collector offline'); return; }
        const { endpoint } = await configuration.json();
        const uri = new URL(endpoint);
        if (uri.protocol !== 'https:' || uri.pathname !== '/v1/reports' || uri.search || uri.hash ||
            uri.username || uri.password) return;
        const response = await fetch(uri.href, {
            method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
            redirect: 'error', referrerPolicy: 'no-referrer', keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consent: true, report })
        });
        const receipt = response.ok ? await response.json() : null;
        if (receipt?.accepted && receipt.id === record.id) {
            const active = readJson(G4_PENDING_KEY);
            if (active?.id === record.id) {
                writeJson(G4_RECEIPT_KEY, { id: record.id, status: 'received' });
                try { localStorage.removeItem(G4_PENDING_KEY); } catch { /* Read-only private browsing. */ }
            }
            setStatus('G4 saved and privately received');
        } else {
            setStatus('G4 saved locally · sending unavailable');
        }
    } catch {
        setStatus('G4 saved locally · sending unavailable');
    }
}

// Opt-in physical-device evidence recorder for the existing Hunt renderer.
// Measures browser requestAnimationFrame pacing; never claims GPU time, VRAM,
// battery draw, thermal state or a gameplay simulation result.
const MAX_INTERVALS = 72000;
const MAX_DURATION_MS = 10 * 60 * 1000;
const percentile = (sorted, percentage) => sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)] : null;
const round = value => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;

/** Bounded on-device measurements; independent of Canvas/WebGL implementation. */
export class G4DeviceReviewSession {
    constructor(mode = 'canvas', quality = null) {
        if (!['canvas', 'gpu'].includes(mode)) throw new RangeError('Invalid review renderer');
        this.mode = mode;
        this.quality = mode === 'gpu' ? quality : null;
        this.reset();
    }
    reset() {
        this.recording = false;
        this.startedAt = null;
        this.stoppedAt = null;
        this.lastFrameAt = null;
        this.intervals = [];
        this.minuteIntervals = [];
        this.playedMs = 0;
        this.pausedFrames = 0;
        this.renderFailures = 0;
        this.missingGpuFrames = 0;
        this.gpuSamples = [];
        this.nextGpuSample = 0;
    }
    start(now) {
        if (!Number.isFinite(now)) throw new TypeError('Invalid session start time');
        this.reset();
        this.recording = true;
        this.startedAt = now;
        this.nextGpuSample = now;
    }
    stop(now) {
        if (!this.recording) return;
        if (!Number.isFinite(now) || now < this.startedAt) throw new TypeError('Invalid session end time');
        this.recording = false;
        this.stoppedAt = now;
        this.lastFrameAt = null;
    }
    /** getGpu is invoked at most once per second, never on every frame. */
    record(now, { playing = true, renderingFailed = false, gpuAvailable = false, getGpu = null } = {}) {
        if (!this.recording) return;
        if (!Number.isFinite(now)) throw new TypeError('Invalid animation frame time');
        if (now - this.startedAt >= MAX_DURATION_MS || this.intervals.length >= MAX_INTERVALS) {
            this.stop(now);
            return;
        }
        if (renderingFailed) this.renderFailures++;
        if (this.mode === 'gpu' && !gpuAvailable) this.missingGpuFrames++;
        if (!playing) {
            this.pausedFrames++;
            this.lastFrameAt = null;
            return;
        }
        if (this.lastFrameAt !== null) {
            const delta = now - this.lastFrameAt;
            if (delta > 0 && delta <= 1000) {
                this.intervals.push(delta);
                const minute = Math.min(9, Math.floor((now - this.startedAt) / 60000));
                (this.minuteIntervals[minute] ??= []).push(delta);
                this.playedMs += delta;
            }
        }
        this.lastFrameAt = now;
        if (this.mode === 'gpu' && gpuAvailable && now >= this.nextGpuSample) {
            const diagnostic = getGpu?.();
            if (diagnostic) {
                this.gpuSamples.push({
                    atMs: round(now - this.startedAt),
                    cpuSubmissionMeanMs: round(diagnostic.submissionCpu?.meanMs),
                    dynamicPixels: diagnostic.textureUploads?.dynamicPixels ?? null,
                    dynamicTextures: diagnostic.textureUploads?.dynamicTextures ?? null,
                    gpuLights: diagnostic.lights?.length ?? null,
                    shadowMapSize: diagnostic.budgets?.shadowMapSize ?? null,
                });
            }
            this.nextGpuSample = now + 1000;
        }
    }
    summary(now = this.stoppedAt) {
        const ordered = [...this.intervals].sort((a, b) => a - b);
        const slow = this.intervals.filter(ms => ms > 1000 / 30).length;
        const gpuPixels = this.gpuSamples.map(sample => sample.dynamicPixels).filter(Number.isFinite);
        const time = this.recording ? (now ?? this.startedAt) : (this.stoppedAt ?? this.startedAt);
        return {
            mode: this.mode, quality: this.quality, recording: this.recording,
            elapsedSeconds: round(this.startedAt === null ? 0 : Math.max(0, time - this.startedAt) / 1000),
            measuredPlayingSeconds: round(this.playedMs / 1000),
            frameIntervals: this.intervals.length,
            observedFps: round(this.playedMs ? this.intervals.length * 1000 / this.playedMs : 0),
            frameMsP50: round(percentile(ordered, .5)),
            frameMsP95: round(percentile(ordered, .95)),
            frameMsP99: round(percentile(ordered, .99)),
            over33msPercent: round(ordered.length ? slow / ordered.length * 100 : 0),
            pausedFrames: this.pausedFrames,
            renderingFailures: this.renderFailures,
            missingGpuFrames: this.missingGpuFrames,
            sampledDynamicPixelsMean: gpuPixels.length
                ? Math.round(gpuPixels.reduce((a, b) => a + b, 0) / gpuPixels.length) : null,
            gpuSamples: this.gpuSamples.length,
        };
    }
    report(now = this.stoppedAt, device = {}) {
        return {
            schema: 'g4-device-review.v1',
            generatedAtUtc: new Date().toISOString(),
            device,
            ...this.summary(now),
            // Per-minute browser frame-pacing distribution permits warm-up comparisons
            // without claiming to read a physical device's temperature sensors.
            framePacingByMinute: this.minuteIntervals.map((intervals, index) => {
                const sorted = [...intervals].sort((a, b) => a - b);
                const played = intervals.reduce((sum, ms) => sum + ms, 0);
                return { minute: index + 1, intervals: intervals.length,
                    observedFps: round(played ? intervals.length * 1000 / played : 0),
                    frameMsP95: round(percentile(sorted, .95)) };
            }).filter(Boolean),
            // Subsampled once a second; do not assume these are sustained per-frame uploads.
            samples: this.gpuSamples.map(sample => ({ ...sample })),
            limitations: [
                'requestAnimationFrame cadence is browser frame pacing, not GPU execution time',
                'CPU submission includes JS, rendering and Canvas composition, not an isolated GPU timer',
                'Dynamic pixels count reported uploads, not resident VRAM or overdraw',
                'Battery percentage and thermal throttling require separate human/device measurements',
                'Canvas versus GPU sessions are not a controlled comparison unless the same scene and actions are reproduced',
            ],
        };
    }
}

/** Persistent, opt-in G4 control: Hunt death must not delete the last result. */
export function mountG4DeviceReview(canvas, getGpu, mode = 'canvas', quality = null) {
    // The real-Hunt Blazor screen is destroyed on death. The control is therefore
    // attached to document.body, not to the transient screen it is measuring.
    document.querySelector('[data-g4-device-review]')?.remove();
    const session = new G4DeviceReviewSession(mode, quality);
    const getNow = () => performance.now();
    let recordId = crypto.randomUUID();
    let completed = false;
    let lastCheckpointAt = -Infinity;
    const panel = document.createElement('details');
    panel.setAttribute('data-g4-device-review', '');
    Object.assign(panel.style, {
        position: 'fixed', right: '8px', bottom: 'max(112px, env(safe-area-inset-bottom))',
        zIndex: '10000', width: 'max-content', maxWidth: 'min(270px, 82vw)',
        maxHeight: '48vh', overflow: 'auto', background: 'rgba(16,21,26,.94)',
        color: '#f3eee8', border: '1px solid #ad976e', borderRadius: '6px',
        padding: '8px', font: '12px/1.5 system-ui,sans-serif', boxSizing: 'border-box'
    });
    const header = document.createElement('summary');
    header.style.cursor = 'pointer';
    panel.appendChild(header);
    const help = document.createElement('p');
    help.textContent = 'G4 records automatically during gameplay. Death and navigation save the result. No export needed.';
    panel.appendChild(help);
    const status = document.createElement('p');
    status.setAttribute('data-g4-status', '');
    panel.appendChild(status);
    const previous = document.createElement('p');
    previous.setAttribute('data-g4-last-result', '');
    panel.appendChild(previous);
    const consentLabel = document.createElement('label');
    consentLabel.style.display = 'block';
    const consentBox = document.createElement('input');
    consentBox.type = 'checkbox';
    consentBox.setAttribute('data-g4-consent', '');
    consentBox.checked = consented();
    consentLabel.appendChild(consentBox);
    consentLabel.append(' Automatically send compact G4 frame-timing results to the private WyrmForge collector after a Hunt. No device identifier, location or per-frame traces. Stored up to 30 days. Off by default.');
    panel.appendChild(consentLabel);
    const controls = document.createElement('div');
    Object.assign(controls.style, { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' });
    const button = (label, action) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = label;
        Object.assign(item.style, {
            background: '#504333', color: 'white', border: '1px solid #ad976e',
            padding: '8px', borderRadius: '4px', minHeight: '36px', cursor: 'pointer'
        });
        item.addEventListener('click', action);
        controls.appendChild(item);
        return item;
    };
    const latestLabel = () => {
        const latest = readJson(G4_LAST_RECORD_KEY);
        const receipt = readJson(G4_RECEIPT_KEY);
        previous.textContent = hasG4Evidence(latest)
            ? `Last Hunt: ${latest.elapsedSeconds}s · ${latest.observedFps} FPS · p95 ${latest.frameMsP95}ms
               · ${receipt?.id === latest.id ? 'received privately' : 'saved on this phone'}`
            : 'No completed G4 samples yet.';
    };
    const setStatus = message => { status.textContent = message; latestLabel(); };
    const persist = outcome => {
        const summary = session.summary(getNow());
        if (!hasG4Evidence(summary)) return false;
        const record = { ...summary, id: recordId, outcome, recordedAtUtc: new Date().toISOString() };
        const saved = writeJson(G4_LAST_RECORD_KEY, record);
        if (!saved) { setStatus('Browser storage unavailable · G4 evidence not saved'); return false; }
        latestLabel();
        return true;
    };
    const finish = (outcome = 'Interrupted') => {
        if (completed) return;
        completed = true;
        session.stop(getNow());
        if (persist(outcome)) {
            header.textContent = 'G4 · SAVED';
            status.textContent = 'Your G4 result survived the Hunt. No export required.';
            if (consented()) {
                const saved = readJson(G4_LAST_RECORD_KEY);
                writeJson(G4_PENDING_KEY, saved);
                void sendPendingG4Evidence(setStatus);
            }
        } else {
            header.textContent = 'G4 · NO FRAMES';
            status.textContent = 'No usable gameplay frames were recorded.';
        }
    };
    consentBox.addEventListener('change', () => {
        try {
            if (consentBox.checked) localStorage.setItem(G4_CONSENT_KEY, 'yes');
            else localStorage.removeItem(G4_CONSENT_KEY);
        } catch { consentBox.checked = false; }
        if (consentBox.checked) {
            const previousResult = readJson(G4_LAST_RECORD_KEY);
            if (hasG4Evidence(previousResult)) writeJson(G4_PENDING_KEY, previousResult);
            void sendPendingG4Evidence(setStatus);
        }
        setStatus(consentBox.checked
            ? 'G4 automatic private delivery enabled. Existing results remain on your phone.'
            : 'G4 private delivery disabled. Local results remain.');
    });
    button('Save now', () => finish('Interrupted'));
    button('New sample', () => {
        recordId = crypto.randomUUID();
        completed = false;
        lastCheckpointAt = -Infinity;
        session.start(getNow());
        header.textContent = 'G4 · REC';
        status.textContent = 'Recording real Hunt frames';
    });
    button('Erase G4 data', () => {
        for (const key of [G4_LAST_RECORD_KEY, G4_PENDING_KEY, G4_RECEIPT_KEY, G4_CONSENT_KEY]) {
            try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
        }
        consentBox.checked = false;
        latestLabel();
        status.textContent = 'Local G4 data and future upload consent erased.';
    });
    panel.appendChild(controls);
    document.body.appendChild(panel);
    session.start(getNow());
    header.textContent = 'G4 · REC';
    status.textContent = 'Automatically recording gameplay';
    latestLabel();
    if (consented()) void sendPendingG4Evidence(setStatus);

    const pagehide = () => finish('Interrupted');
    window.addEventListener('pagehide', pagehide);
    return {
        session,
        record(timestamp, { playing, renderingFailed, gpuAvailable, ended = false }) {
            if (completed) return;
            session.record(timestamp, { playing, renderingFailed, gpuAvailable, getGpu });
            if (ended || !session.recording) {
                finish(ended ? 'Defeated' : 'Interrupted');
                return;
            }
            if (timestamp - lastCheckpointAt >= 5000 && hasG4Evidence(session.summary(timestamp))) {
                persist('Interrupted');
                lastCheckpointAt = timestamp;
            }
            if (timestamp - (this.lastDisplayAt ?? -Infinity) >= 1000) {
                header.textContent = 'G4 · REC';
                status.textContent = `${Math.round((timestamp - session.startedAt) / 1000)}s · ${session.intervals.length} frames`;
                this.lastDisplayAt = timestamp;
            }
        },
        dispose() {
            window.removeEventListener('pagehide', pagehide);
            finish('Interrupted');
            // Deliberately keep the compact result visible after Blazor removes the Hunt.
            // The next Hunt replaces this panel and reads the local saved result.
        }
    };
}
