// Pure simulation-to-audio mapping. No DOM, timers or sound nodes here: deterministic and testable.
export function createSoundEventTracker() {
    return { previous: null, lastPlayed: new Map() };
}

export function collectSoundEvents(tracker, snapshot, now) {
    const previous = tracker.previous;
    const current = {
        health: snapshot?.hud?.health ?? 0,
        maxHealth: snapshot?.hud?.maxHealth ?? 0,
        kills: snapshot?.hud?.kills ?? 0,
        projectiles: snapshot?.projectiles?.length ?? 0,
        projectileSpell: snapshot?.projectiles?.at(-1)?.spell ?? 0,
        lightning: snapshot?.lightning?.length ?? 0,
        impacts: snapshot?.elementalImpacts?.length ?? 0,
        powerBurst: Boolean(snapshot?.powerBurst),
        dragon: Boolean(snapshot?.dragon),
        paused: Boolean(snapshot?.paused || snapshot?.ended),
    };
    tracker.previous = current;
    if (!previous || previous.paused || current.paused) return [];

    const result = [];
    const emit = (name, interval) => {
        if (now - (tracker.lastPlayed.get(name) ?? -Infinity) < interval) return;
        tracker.lastPlayed.set(name, now);
        result.push(name);
    };

    if (current.health < previous.health && current.maxHealth === previous.maxHealth) emit('hurt', 550);
    if (current.powerBurst && !previous.powerBurst) emit('power-burst', 800);
    if (current.dragon && !previous.dragon) emit('wyrm', 2000);
    if (current.kills > previous.kills) emit('enemy-down', 260);
    if (current.lightning > 0 && (previous.lightning === 0 || current.lightning > previous.lightning)) emit('lightning', 350);
    if (current.projectiles > previous.projectiles) {
        const name = current.projectileSpell === 1 ? 'fire' : current.projectileSpell === 2 ? 'frost' : current.projectileSpell === 3 ? 'lightning' : 'arcane';
        emit(name, 230);
    }
    if (current.impacts > previous.impacts && current.kills === previous.kills) emit('impact', 180);
    return result;
}
