// Opt-in, passive performance flight recorder. ?perfCapture=1 enables automatic capture and one export button.
// No network uploads, no persistent storage, and no changes to game simulation or rendering.
const MAX_SAMPLES = 1800;
const MAX_EVENTS = 300;
const samples = [];
const events = [];
const started = performance.now();
let lastFrame = 0;
let frameCount = 0;
let worstFrame = 0;
let longFrameCount = 0;
let observer;
let active = true;

function pushBounded(array, value, limit) {
    array.push(value);
    if (array.length > limit) array.shift();
}

function onFrame(now) {
    if (!active) return;
    if (lastFrame) {
        const delta = now - lastFrame;
        if (delta > 33.4 && delta < 1200) {
            longFrameCount++;
            worstFrame = Math.max(worstFrame, delta);
            if (delta >= 80) pushBounded(events, { tMs: Math.round(now - started), type: 'slow-frame', ms: Math.round(delta) }, MAX_EVENTS);
        }
    }
    lastFrame = now;
    frameCount++;
    requestAnimationFrame(onFrame);
}
requestAnimationFrame(onFrame);

try {
    if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                pushBounded(events, { tMs: Math.round(entry.startTime - started), type: 'main-thread-longtask',
                    ms: Math.round(entry.duration) }, MAX_EVENTS);
            }
        });
        observer.observe({ entryTypes: ['longtask'] });
    }
} catch { /* Safari may not support long tasks; frame timing still works. */ }

const startWallClock = new Date().toISOString();
const timer = setInterval(() => {
    if (!active) return;
    const now = performance.now();
    const game = window.__wyrmforgePerf;
    const heap = performance.memory?.usedJSHeapSize;
    pushBounded(samples, {
        tMs: Math.round(now - started),
        fps: Math.round(frameCount * 4),
        longFrames: longFrameCount,
        worstFrameMs: Math.round(worstFrame),
        heapMb: Number.isFinite(heap) ? Math.round(heap / 1048576) : null,
        game: game ? { ...game } : null,
    }, MAX_SAMPLES);
    frameCount = 0;
    longFrameCount = 0;
    worstFrame = 0;
}, 250);

const button = document.createElement('button');
button.type = 'button';
button.textContent = 'Export perf';
button.setAttribute('aria-label', 'Export automatic performance recording');
Object.assign(button.style, {
    position: 'fixed', right: 'max(10px, env(safe-area-inset-right))',
    bottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: '2147483647',
    padding: '7px 10px', border: '1px solid #b38b52', borderRadius: '6px',
    background: '#211b23', color: '#f4e4c9', font: '12px monospace',
    opacity: '.85', cursor: 'pointer'
});
button.addEventListener('click', () => {
    const payload = {
        schema: 'wyrmforge-perf-capture-v1', startedAtUtc: startWallClock,
        exportedAtUtc: new Date().toISOString(),
        urlPath: location.pathname, // omit query string (may contain sensitive parameters)
        userAgent: navigator.userAgent, devicePixelRatio: devicePixelRatio,
        viewport: { width: innerWidth, height: innerHeight },
        samplingIntervalMs: 250, maxSamples: MAX_SAMPLES,
        samples: [...samples], events: [...events],
        notes: 'Passive browser frame pacing. game field is populated only when the existing perf overlay is enabled.'
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wyrmforge-perf-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
});
document.body.appendChild(button);
window.addEventListener('pagehide', () => { active = false; clearInterval(timer); observer?.disconnect(); }, { once: true });
