/**
 * Voxel V2 diagnostics. Standalone browser module; no legacy runtime imports.
 * All frame samples are milliseconds. A hidden-tab gap is excluded by the caller.
 */
export class FrameDiagnostics {
  constructor(limit = 1800) {
    if (!Number.isInteger(limit) || limit < 2) {
      throw new RangeError('Frame sample limit must be >= 2');
    }
    this.limit = limit;
    this.samples = [];
    this.total = 0;
    this.hitches = { over33: 0, over50: 0, over100: 0 };
  }

  record(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }
    this.total++;
    if (deltaMs > 33) this.hitches.over33++;
    if (deltaMs > 50) this.hitches.over50++;
    if (deltaMs > 100) this.hitches.over100++;
    this.samples.push(deltaMs);
    if (this.samples.length > this.limit) this.samples.shift();
  }

  summary() {
    const ordered = [...this.samples].sort((a, b) => a - b);
    const percentile = p => ordered.length
      ? ordered[Math.min(ordered.length - 1, Math.ceil(p * ordered.length) - 1)]
      : null;
    return {
      sampleCount: ordered.length,
      totalFrames: this.total,
      p50Ms: percentile(0.50),
      p95Ms: percentile(0.95),
      p99Ms: percentile(0.99),
      hitches: { ...this.hitches },
    };
  }

  reset() {
    this.samples.length = 0;
    this.total = 0;
    this.hitches = { over33: 0, over50: 0, over100: 0 };
  }
}

export function createBenchmarkReport({ build, scene, diagnostics, counters = {} }) {
  return {
    schema: 'voxel-v2.benchmark.v1',
    generatedAtUtc: new Date().toISOString(),
    build: build || 'unverified',
    scene,
    browser: typeof navigator === 'undefined' ? 'unavailable' : navigator.userAgent,
    viewport: typeof window === 'undefined' ? null : {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    frames: diagnostics.summary(),
    counters,
    caveats: [
      'Frame intervals are requestAnimationFrame samples, not GPU execution times.',
      'Hidden-tab frame gaps are excluded.',
      'Device thermal state and GPU memory usage are not directly measured.',
    ],
  };
}
