// Pure simulation-to-audio mapping. No DOM, timers or sound nodes here: deterministic and testable.
// EnemyKind values correspond to the canonical C# enum; restrict specialized audio to authored families.
const creatureFamily = kind => kind === 0 || kind === 'Hollow' ? 'hollow'
    : kind === 2 || kind === 'Ashling' ? 'ashling' : null;

// Match C# SpellId: ArcaneOrb, FireBolt, FrostShard, ChainLightning,
// CinderNeedle, IceLance, BallLightning, AetherDart. No last-cast guessing.
const schoolFromSpell = spell => spell === 1 || spell === 4 ? 'fire'
    : spell === 2 || spell === 5 ? 'frost'
    : spell === 3 || spell === 6 ? 'lightning'
    : spell === 0 || spell === 7 ? 'arcane' : null;

export function createSoundEventTracker() {
    return { previous: null, lastPlayed: new Map(), activeHits: new Set(), activeDeaths: new Set(), activeImpacts: [] };
}

export function collectSoundEvents(tracker, snapshot, now) {
    const previous = tracker.previous;
    const enemies = snapshot?.enemies ?? [];
    const deaths = snapshot?.deathBursts ?? [];
    const activeHits = new Set(enemies.filter(enemy => enemy.hitFlash && Number.isInteger(enemy.entityId) && enemy.entityId > 0)
        .map(enemy => enemy.entityId));
    const activeDeaths = new Set(deaths.filter(burst => Number.isInteger(burst.entityId) && burst.entityId > 0)
        .map(burst => burst.entityId));
    const freshDeaths = deaths.filter(burst => activeDeaths.has(burst.entityId) && !tracker.activeDeaths.has(burst.entityId));
    const freshHits = enemies.filter(enemy => activeHits.has(enemy.entityId) && !tracker.activeHits.has(enemy.entityId));
    tracker.activeHits = activeHits;
    tracker.activeDeaths = activeDeaths;

    // Elemental impacts have SpellId/position/progress, but no event ID. Match the
    // previous frame's living effects rather than using collection-length deltas:
    // two impacts can swap on the same tick without changing the array length.
    const impacts = snapshot?.elementalImpacts ?? [];
    const previousImpacts = tracker.activeImpacts;
    const matched = new Set();
    const freshImpacts = impacts.filter(impact => {
        const index = previousImpacts.findIndex((past, i) => {
            const samePlace = Number.isFinite(past.x) && Number.isFinite(past.y) &&
                Number.isFinite(impact.x) && Number.isFinite(impact.y)
                ? Math.abs(past.x - impact.x) < 0.5 && Math.abs(past.y - impact.y) < 0.5
                : !Number.isFinite(past.x) && !Number.isFinite(impact.x);
            const sameLife = !Number.isFinite(past.progress) || !Number.isFinite(impact.progress) ||
                impact.progress + 0.001 >= past.progress;
            return !matched.has(i) && past.spell === impact.spell && samePlace && sameLife;
        });
        if (index < 0) return true;
        matched.add(index);
        return false;
    });
    tracker.activeImpacts = impacts.map(impact => ({
        x: impact.x, y: impact.y, spell: impact.spell, progress: impact.progress,
    }));

    const current = {
        health: snapshot?.hud?.health ?? 0,
        maxHealth: snapshot?.hud?.maxHealth ?? 0,
        kills: snapshot?.hud?.kills ?? 0,
        projectiles: snapshot?.projectiles?.length ?? 0,
        projectileSpell: snapshot?.projectiles?.at(-1)?.spell ?? 0,
        lightning: snapshot?.lightning?.length ?? 0,
        impacts: impacts.length,
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

    // Spawned corpses have a stable EntityId and Kind. Prefer that direct identity to
    // guessing the last creature killed from a total kill counter. Treat old/unknown
    // creature kinds with the existing generic event, and avoid stacking two deaths.
    const kinds = new Set(freshDeaths.map(burst => creatureFamily(burst.kind)).filter(Boolean));
    for (const family of kinds) emit(family + '-death', 480);
    // Revived or scripted creature deaths may not increment a reward-bearing kill
    // counter in the same snapshot. Only unknown kinds still rely on the counter.
    if (current.kills > previous.kills &&
        (!freshDeaths.length || freshDeaths.some(burst => !creatureFamily(burst.kind)))) emit('enemy-down', 260);

    // HitFlash survives several frames. Rising edges + stable entity IDs prevent
    // the same wound from playing an extra grunt every render/simulation update.
    const hitFamilies = new Set(freshHits.filter(enemy => !activeDeaths.has(enemy.entityId))
        .map(enemy => creatureFamily(enemy.kind)).filter(Boolean));
    for (const family of hitFamilies) emit(family + '-hit', 480);

    // One occasional nearby voice, not a vocalization per enemy or footstep.
    // Sound remains low priority, useful on mobile even when dozens of creatures gather.
    const px = snapshot?.player?.x, py = snapshot?.player?.y;
    if (Number.isFinite(px) && Number.isFinite(py)) {
        let closest = null, distanceSquared = 230 * 230;
        for (const enemy of enemies) {
            const family = creatureFamily(enemy.kind);
            if (!family || !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) continue;
            const d = (enemy.x - px) ** 2 + (enemy.y - py) ** 2;
            if (d >= distanceSquared) continue;
            closest = family;
            distanceSquared = d;
        }
        if (closest) emit(closest + '-approach', 6500);
    }
    if (current.lightning > 0 && (previous.lightning === 0 || current.lightning > previous.lightning)) emit('lightning', 350);
    if (current.projectiles > previous.projectiles) {
        const name = current.projectileSpell === 1 ? 'fire' : current.projectileSpell === 2 ? 'frost' : current.projectileSpell === 3 ? 'lightning' : 'arcane';
        emit(name, 230);
    }
    if (current.kills === previous.kills) {
        for (const impact of freshImpacts) {
            const school = schoolFromSpell(impact.spell);
            emit(school ? school + '-impact' : 'impact', 180);
        }
    }
    return result;
}
