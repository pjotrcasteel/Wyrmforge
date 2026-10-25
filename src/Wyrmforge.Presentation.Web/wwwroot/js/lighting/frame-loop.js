// Presentation scheduling only; never owns simulation time or sprite poses.
export function createFrameLoop(onFrame, {
    requestFrame = callback => requestAnimationFrame(callback),
    cancelFrame = id => cancelAnimationFrame(id),
} = {}) {
    let active = false, visible = true, disposed = false, pending = null, lastTime = null;
    const schedule = () => {
        if (active && visible && !disposed && pending === null) pending = requestFrame(tick);
    };
    const pause = () => {
        if (pending !== null) cancelFrame(pending);
        pending = null; lastTime = null;
    };
    const tick = time => {
        pending = null;
        if (!active || !visible || disposed) return;
        const delta = Math.min(.1, Math.max(0, (time - (lastTime ?? time)) / 1000));
        lastTime = time;
        onFrame(delta);
        schedule();
    };
    return {
        setActive(value) { active = value; if (!active) pause(); else schedule(); },
        setVisible(value) { visible = value; if (!visible) pause(); else schedule(); },
        dispose() { disposed = true; pause(); },
        get scheduled() { return pending !== null; },
    };
}
