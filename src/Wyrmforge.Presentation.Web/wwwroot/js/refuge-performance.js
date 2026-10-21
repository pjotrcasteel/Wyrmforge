// Lightweight, opt-in Refuge measurements. No frames or intervals are retained
// after leaving town; the normal game does not import this module.
export function startRefugePerformance(selector) {
    const output = document.querySelector(selector);
    if (!output) return { update() {}, dispose() {} };

    let running = true;
    let frameHandle = 0;
    let windowStart = 0;
    let previousFrame = 0;
    let frameCount = 0;
    let longFrames = 0;
    let fps = 0;
    let p95 = 0;
    let frameMax = 0; // Session high-water mark, not an interval maximum.
    let snapshot = {};
    const frameTimes = [];

    function render() {
        const format = (value, places = 1) => Number(value ?? 0).toFixed(places);
        output.textContent =
            `FPS ${Math.round(fps)}  •  frame p95 ${format(p95)}ms  •  max ${format(frameMax)}ms\n` +
            `NPC ${snapshot.present ?? 0}/${snapshot.total ?? 0}  •  workers ${snapshot.workers ?? 0}  •  away ${snapshot.away ?? 0}\n` +
            `AI ${format(snapshot.stepAvg)}ms avg  •  ${format(snapshot.stepMax)}ms max  •  ${snapshot.updates ?? 0} Hz\n` +
            `Paths ${snapshot.pathCount ?? 0}  •  A* ${format(snapshot.pathMs)}ms  •  >50ms ${longFrames}`;
    }

    function frame(now) {
        if (!running) return;
        if (!windowStart || now - previousFrame > 1200) {
            windowStart = now;
            previousFrame = now;
            frameCount = 0;
            frameTimes.length = 0;
            longFrames = 0;
        }
        const delta = now - previousFrame;
        previousFrame = now;
        if (delta > 0 && delta < 1200) {
            frameTimes.push(delta);
            frameMax = Math.max(frameMax, delta);
            if (delta > 50) longFrames++;
        }
        frameCount++;

        const duration = now - windowStart;
        if (duration >= 1000) {
            fps = frameCount * 1000 / duration;
            frameTimes.sort((a, b) => a - b);
            p95 = frameTimes.length
                ? frameTimes[Math.min(frameTimes.length - 1, Math.ceil(frameTimes.length * 0.95) - 1)]
                : 0;
            render();
            windowStart = now;
            frameCount = 0;
            frameTimes.length = 0;
            longFrames = 0;
        }
        frameHandle = requestAnimationFrame(frame);
    }

    frameHandle = requestAnimationFrame(frame);
    return {
        update(metrics) { snapshot = metrics ?? {}; },
        dispose() {
            running = false;
            cancelAnimationFrame(frameHandle);
            output.textContent = '';
        }
    };
}
