// Real-device Hunt measurements for H9, shown by `?perf=1`. Presentation only: it observes frames, never changes them.
export const LONG_FRAME_MS = 33.4;

/** Rolling window of render-frame durations; the window is bounded so a long session never grows memory. */
export function createFrameSampler(maxSamples = 600) {
    const samples = [];
    let worst = 0;
    return {
        record(deltaMs) {
            if (!(deltaMs > 0) || deltaMs > 1200) return; // tab switches and pauses are not frame pacing
            samples.push(deltaMs);
            if (samples.length > maxSamples) samples.shift();
            worst = Math.max(worst, deltaMs);
        },
        summary() {
            if (!samples.length) return { samples: 0, fps: 0, p50: 0, p95: 0, p99: 0, max: worst, longFrames: 0 };
            const sorted = [...samples].sort((a, b) => a - b);
            const at = fraction => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
            const total = samples.reduce((sum, value) => sum + value, 0);
            return { samples: samples.length, fps: samples.length * 1000 / total, p50: at(.5), p95: at(.95), p99: at(.99),
                max: worst, longFrames: samples.filter(value => value > LONG_FRAME_MS).length };
        },
    };
}

/** Chromium exposes the JS heap; Safari/Firefox do not, and the report says so instead of inventing a number. */
export function readHeapMegabytes(perf = globalThis.performance) {
    const used = perf?.memory?.usedJSHeapSize;
    return Number.isFinite(used) ? used / 1048576 : null;
}

export function perfReport({ sampler, renderer, quality, terrain, heapMb, enemies = 0, projectiles = 0,
    gpuVisibleEnemies = null, gpuUploads = null, devicePixelRatio = 1 }) {
    const frames = sampler.summary();
    return {
        renderer, quality, devicePixelRatio,
        fps: Math.round(frames.fps), frameP50Ms: round(frames.p50), frameP95Ms: round(frames.p95), frameP99Ms: round(frames.p99),
        frameMaxMs: round(frames.max), longFrames: frames.longFrames, samples: frames.samples,
        terrainRepaints: terrain?.repaints ?? 0, terrainRepaintMaxMs: round(terrain?.maxRepaintMs ?? 0),
        terrainRepaintAvgMs: round(terrain?.repaints ? terrain.totalRepaintMs / terrain.repaints : 0),
        heapMb: heapMb === null ? null : round(heapMb), enemies, projectiles,
        gpuVisibleEnemies, gpuUploadTextures: gpuUploads?.dynamicTextures ?? null,
        gpuUploadPixels: gpuUploads?.dynamicPixels ?? null,
    };
}

export function perfLines(report) {
    return [
        `FPS ${report.fps}  p50 ${report.frameP50Ms}  p95 ${report.frameP95Ms}  max ${report.frameMaxMs} ms`,
        `>33ms ${report.longFrames}/${report.samples}  ${report.renderer}/${report.quality ?? '-'}  dpr ${report.devicePixelRatio}`,
        `terrain ${report.terrainRepaints} repaints  avg ${report.terrainRepaintAvgMs}  max ${report.terrainRepaintMaxMs} ms`,
        `heap ${report.heapMb === null ? 'n/a' : `${report.heapMb} MB`}  foes ${report.enemies}  shots ${report.projectiles}`,
        `GPU ${report.gpuUploadTextures ?? '-'} tex  ${report.gpuUploadPixels ?? '-'} px  visible ${report.gpuVisibleEnemies ?? '-'}/${report.enemies}`,
    ];
}

function round(value) { return Math.round(value * 10) / 10; }
