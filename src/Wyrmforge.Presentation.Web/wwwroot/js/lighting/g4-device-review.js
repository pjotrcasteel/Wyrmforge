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
            schema: 'wyrmforge.g4-device-review.v1',
            generatedAtUtc: new Date().toISOString(),
            device,
            ...this.summary(now),
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

/** Touch-accessible opt-in UI; never displayed during ordinary Hunts. */
export function mountG4DeviceReview(canvas, getGpu, mode = 'canvas', quality = null) {
    const session = new G4DeviceReviewSession(mode, quality);
    const panel = document.createElement('details');
    panel.setAttribute('data-g4-device-review', '');
    Object.assign(panel.style, {
        position: 'fixed', right: '8px', top: '8px', zIndex: '10000',
        width: 'min(240px, 74vw)', maxHeight: '48vh', overflow: 'auto',
        background: 'rgba(16,21,26,.94)', color: '#f3eee8',
        border: '1px solid #ad976e', borderRadius: '6px', padding: '8px',
        font: '12px/1.5 system-ui,sans-serif', boxSizing: 'border-box',
    });
    const header = document.createElement('summary');
    header.textContent = 'G4 PHONE TEST · idle';
    header.style.cursor = 'pointer';
    panel.appendChild(header);
    const help = document.createElement('p');
    help.textContent = `${mode === 'gpu' ? `GPU (${quality})` : 'Canvas'} · Play 5–10 minutes, then Stop and Export JSON. Note battery and device warmth separately.`;
    panel.appendChild(help);
    const status = document.createElement('p');
    status.setAttribute('data-g4-status', '');
    status.textContent = 'Not started';
    panel.appendChild(status);
    const controls = document.createElement('div');
    Object.assign(controls.style, { display: 'flex', flexWrap: 'wrap', gap: '6px' });
    const button = (label, action) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = label;
        Object.assign(item.style, {
            background: '#504333', color: 'white', border: '1px solid #ad976e',
            padding: '8px', borderRadius: '4px', minHeight: '36px', cursor: 'pointer',
        });
        item.addEventListener('click', action);
        controls.appendChild(item);
        return item;
    };
    const getNow = () => performance.now();
    const metadata = () => ({
        userAgent: navigator.userAgent, viewport: { width: window.innerWidth, height: window.innerHeight },
        dpr: window.devicePixelRatio || 1,
        estimatedDeviceMemoryGiB: navigator.deviceMemory ?? null,
        jsHeapUsedBytes: performance.memory?.usedJSHeapSize ?? null,
        // These are unavailable through a standardized, reliable browser API.
        gpuTimeMs: null, gpuMemoryBytes: null, batteryDraw: null, thermalState: null,
    });
    const updateStatus = now => {
        // Do not sort thousands of samples every second while profiling a phone.
        if (session.recording) {
            header.textContent = 'G4 PHONE TEST · recording';
            status.textContent = `${Math.round((now - session.startedAt) / 1000)}s · ${session.intervals.length} frame intervals`;
            return;
        }
        const info = session.summary(now);
        header.textContent = `G4 PHONE TEST · ${info.frameIntervals ? 'stopped' : 'idle'}`;
        status.textContent = `${info.elapsedSeconds}s · ${info.frameIntervals} intervals · p95 ${info.frameMsP95 ?? 'n/a'}ms · ${info.observedFps ?? 0} FPS`;
    };
    button('Start', () => { session.start(getNow()); updateStatus(getNow()); panel.open = false; });
    button('Stop', () => { session.stop(getNow()); updateStatus(getNow()); });
    button('Export JSON', () => {
        const payload = JSON.stringify(session.report(getNow(), metadata()), null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wyrmforge-g4-${mode}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Release URL after the browser handles the user-triggered download.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    button('Copy summary', () => {
        const info = session.summary(getNow());
        const message = `G4 ${mode} ${quality ?? ''}: ${JSON.stringify(info)}`;
        navigator.clipboard?.writeText(message).then(() => {
            status.textContent = 'Summary copied';
        }).catch(() => { status.textContent = 'Clipboard unavailable; export JSON instead'; });
        if (!navigator.clipboard) status.textContent = 'Clipboard unavailable; export JSON instead';
    });
    panel.appendChild(controls);
    canvas.closest('.game-screen')?.appendChild(panel) ?? document.body.appendChild(panel);
    return {
        session,
        record(timestamp, { playing, renderingFailed, gpuAvailable }) {
            const wasRecording = session.recording;
            session.record(timestamp, { playing, renderingFailed, gpuAvailable, getGpu });
            if (wasRecording && (!session.recording || timestamp - (this.lastDisplayAt ?? -Infinity) > 1000)) {
                updateStatus(timestamp);
                this.lastDisplayAt = timestamp;
            }
        },
        dispose() { panel.remove(); },
    };
}
