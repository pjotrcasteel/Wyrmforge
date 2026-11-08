// Telegraph tracking only. Current Hollowed have no attack telegraph in the C# snapshot.
// Never interpret a Hollowed contact animation or continuous DPS as a confirmed hit.
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
        if (kind !== 'hollow-grasp') continue;
        const previous = tracker.active.get(id);
        const restarted = previous && (previous.kind !== kind || telegraph.progress + 0.001 < previous.progress);
        if (!silent && (!previous || restarted) && enemy.kind === 0 && kind === 'hollow-grasp') {
            events.push({ type: 'hollow-attack-windup', entityId: id, attackKind: kind });
        }
        next.set(id, { kind, progress: telegraph.progress });
    }
    tracker.active = next;
    return events;
}
