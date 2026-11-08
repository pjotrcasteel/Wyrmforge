// Attack-event identity is derived from the authoritative simulation telegraph,
// never from render frame count or proximity. This module performs no playback.
export function createCreatureAttackTracker() {
    return { active: new Map() };
}

export function collectCreatureAttackEvents(tracker, snapshot) {
    const next = new Map();
    const events = [];
    const silent = Boolean(snapshot?.paused || snapshot?.ended);
    for (const enemy of snapshot?.enemies ?? []) {
        const id = enemy.entityId;
        const telegraph = enemy.telegraph;
        if (!Number.isSafeInteger(id) || id <= 0 || !telegraph ||
            !Number.isFinite(telegraph.progress) || telegraph.progress < 0 || telegraph.progress > 1) {
            continue;
        }
        // A telegraph is the wind-up, not proof that an attack connected.
        const kind = telegraph.kind;
        if (kind !== 'bash' && kind !== 'claw' && kind !== 'pounce') continue;
        const previous = tracker.active.get(id);
        const restarted = previous && (previous.kind !== kind || telegraph.progress + 0.001 < previous.progress);
        if (!silent && (!previous || restarted) && enemy.kind === 0) {
            events.push({ type: 'hollow-attack-windup', entityId: id, attackKind: kind });
        }
        next.set(id, { kind, progress: telegraph.progress });
    }
    tracker.active = next;
    return events;
}
