// Authored eight-direction character animation (art/characters, owner handover of 5 November 2026): the Fire mage and the Fire Tier-I enemies.
// Presentation only. C# owns movement, attacks, damage, hit stagger and death; this reads the snapshot and picks a strip, a row and a frame.
//
// Each action is one PNG strip: `framesPerDirection` cells across, one row per direction in DIRECTIONS order (E first). Cells are the whole
// canvas (wizard 48 x 48, enemies 80 x 80) with the feet at `root`; they are drawn 1 art pixel to 1 world unit like every actor, nearest
// neighbour, never mirrored, never cross-faded. Pose changes are discrete; the facing keeps its hysteresis and the walk keeps its phase when
// the facing changes.
export const DIRECTIONS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

/** C# EnemyKind numbers that have an authored set, and the strip of each one's primary attack. */
export const ENEMY_CHARACTERS = new Map([
    [0, 'Hollowed'], [1, 'Mire-Hound'], [2, 'Ashling'], [3, 'Penitent'], [4, 'Ash-Slinger'], [5, 'Ash-Priest'], [6, 'Drowned-Wraith'],
]);
const PRIMARY_ACTION = {
    'Hollowed': 'claw_swipe', 'Mire-Hound': 'lunging_bite', 'Ashling': 'pounce_rake', 'Penitent': 'shield_bash',
    'Ash-Slinger': 'ember_throw', 'Ash-Priest': 'heal_resurrection', 'Drowned-Wraith': 'emerge_strike_retreat',
};
/** These hit by touching; every other enemy attacks through a C# telegraph. */
const TOUCH_ATTACKERS = new Set(['Hollowed', 'Ashling']);
/** The wizard's C# cast reaches its release at this fraction of the cast (the old four-pose cast changed pose here too). */
export const CAST_RELEASE_AT = .22;

/** The 8-way heading for a movement vector; the previous heading holds until the vector is clearly (27.5 degrees) into another sector. */
export function pickDirection(dx, dy, previous = 'S') {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < .001) return previous ?? 'S';
    return pickDirectionFromAngle(Math.atan2(dy, dx), previous);
}

export function pickDirectionFromAngle(angle, previous = 'S') {
    if (!Number.isFinite(angle)) return previous ?? 'S';
    const degrees = (angle * 180 / Math.PI % 360 + 360) % 360, old = DIRECTIONS.indexOf(previous);
    if (old >= 0 && Math.abs((degrees - old * 45 + 540) % 360 - 180) < 27.5) return previous;
    return DIRECTIONS[Math.round(degrees / 45) % 8];
}

export const clipDuration = durations => durations.reduce((sum, ms) => sum + ms, 0);

/** The frame a clip shows `ms` after it began; a finished one-shot reports `done` and holds its last frame. */
export function frameAtTime(durations, ms, loop = false) {
    const total = clipDuration(durations);
    let time = loop ? ((ms % total) + total) % total : Math.max(0, ms);
    if (!loop && time >= total) return { index: durations.length - 1, done: true };
    for (let index = 0; index < durations.length; index++) {
        if (time < durations[index]) return { index, done: false };
        time -= durations[index];
    }
    return { index: durations.length - 1, done: !loop };
}

/** A looping clip's frame at a 0 to 1 phase, weighted by the authored frame durations. */
export const frameAtPhase = (durations, phase) => frameAtTime(durations, (phase - Math.floor(phase)) * clipDuration(durations), true).index;

const action = (manifest, name) => manifest?.actions?.[name] ?? null;
const durationsOf = (manifest, name) => action(manifest, name)?.durationsMs ?? null;
const releaseFrame = (manifest, name) => action(manifest, name)?.directions?.S?.events?.[0]?.localFrame ?? 2;

// ---------------------------------------------------------------- enemies

export function createAuthoredState() {
    return { clock: 0, last: null, hud: 0, enemies: new Map(), corpses: new Map(), seen: new Set(), wizard: createWizardState() };
}

/** The authored name of an enemy snapshot, or null when it still uses its old art. */
export const enemyCharacter = enemy => ENEMY_CHARACTERS.get(Number(enemy?.kind)) ?? null;

/**
 * Advances every enemy's pose from the snapshot. `manifests` maps a character name to its loaded manifest (a missing one is skipped, so the
 * old art keeps drawing). Attacks: a C# telegraph scrubs the windup up to the contact frame and the rest plays on once the telegraph ends;
 * touch attackers play the whole strip when they reach the hunter. Hit and death are C# events: a hit flash starts the hit clip, a death burst
 * leaves a corpse that plays the death clip and holds its last frame.
 */
export function updateAuthoredEnemies(state, snapshot, manifests, seconds, reducedMotion = false) {
    const hud = Number(snapshot.hud?.seconds ?? 0);
    if (state.last != null && (seconds < state.last || hud < state.hud)) Object.assign(state, createAuthoredState());
    const dt = state.last == null ? 0 : Math.max(0, Math.min(.1, seconds - state.last));
    state.last = seconds; state.hud = hud;
    const paused = Boolean(snapshot.paused || snapshot.ended);
    if (!paused) state.clock += dt;

    const present = new Set();
    for (const enemy of snapshot.enemies ?? []) {
        const name = enemyCharacter(enemy), manifest = name ? manifests.get(name) : null;
        if (!manifest) continue;
        const id = enemy.entityId;
        present.add(id);
        let pose = state.enemies.get(id);
        if (!pose) {
            pose = { name, x: enemy.x, y: enemy.y, direction: 'S', phase: ((id * 2654435761) >>> 0) / 4294967296, lastMove: -1, attack: null, attackEnded: -9,
                hit: null, hitFlash: false, action: 'idle', frame: 0, offset: ((id * 40503) >>> 0) % 600 };
            state.enemies.set(id, pose);
        }
        const advancing = !paused && !enemy.frozen;
        const dx = enemy.x - pose.x, dy = enemy.y - pose.y, distance = Math.hypot(dx, dy);
        if (distance >= 64) { pose.lastMove = -1; pose.attack = null; }
        if (advancing && distance > .05 && distance < 64) { pose.lastMove = state.clock; pose.direction = pickDirection(dx, dy, pose.direction); }
        pose.x = enemy.x; pose.y = enemy.y;
        const walking = state.clock - pose.lastMove < .18;
        const walkClip = durationsOf(manifest, 'walk');
        if (advancing && walking && walkClip) pose.phase = (pose.phase + dt * 1000 / clipDuration(walkClip)) % 1;

        const primary = PRIMARY_ACTION[name], attackClip = durationsOf(manifest, primary), contact = releaseFrame(manifest, primary);
        const telegraph = enemy.telegraph;
        if (advancing && telegraph && attackClip) {
            if (pose.attack?.mode !== 'telegraph') pose.attack = { mode: 'telegraph', progress: 0, released: null };
            pose.attack.progress = Number(telegraph.progress) || 0;
            if (Number.isFinite(telegraph.targetX) && Math.hypot(telegraph.targetX - enemy.x, telegraph.targetY - enemy.y) > 1)
                pose.direction = pickDirection(telegraph.targetX - enemy.x, telegraph.targetY - enemy.y, pose.direction);
        } else if (advancing && pose.attack?.mode === 'telegraph' && pose.attack.released == null) {
            pose.attack.released = state.clock;
        }
        const player = snapshot.player;
        const touching = player && Math.hypot(enemy.x - player.x, enemy.y - player.y) <= (Number(enemy.radius) || 11) + (Number(player.radius) || 0) + 2;
        if (advancing && !pose.attack && TOUCH_ATTACKERS.has(name) && attackClip && touching && state.clock - pose.attackEnded > .6) {
            pose.attack = { mode: 'contact', started: state.clock };
            pose.direction = pickDirection(player.x - enemy.x, player.y - enemy.y, pose.direction);
        }
        if (advancing && pose.attack && player && pose.attack.mode === 'contact')
            pose.direction = pickDirection(player.x - enemy.x, player.y - enemy.y, pose.direction);

        // Hit stagger: the rising edge of the C# hit flash, never over an attack.
        if (enemy.hitFlash && !pose.hitFlash && !pose.attack && durationsOf(manifest, 'hit')) pose.hit = { started: state.clock };
        pose.hitFlash = Boolean(enemy.hitFlash);
        if (pose.hit && frameAtTime(durationsOf(manifest, 'hit'), (state.clock - pose.hit.started) * 1000).done) pose.hit = null;

        let chosen = { action: 'idle', frame: frameAtTime(durationsOf(manifest, 'idle'), state.clock * 1000 + pose.offset, true).index };
        if (walking && walkClip && !reducedMotion) chosen = { action: 'walk', frame: frameAtPhase(walkClip, pose.phase) };
        if (pose.hit) chosen = { action: 'hit', frame: frameAtTime(durationsOf(manifest, 'hit'), (state.clock - pose.hit.started) * 1000).index };
        if (pose.attack && attackClip) {
            let frame;
            if (pose.attack.mode === 'contact') {
                const sample = frameAtTime(attackClip, (state.clock - pose.attack.started) * 1000);
                frame = sample.index;
                if (sample.done) { pose.attack = null; pose.attackEnded = state.clock; }
            } else if (pose.attack.released == null) {
                frame = Math.min(contact - 1, Math.floor(Math.max(0, Math.min(.999, pose.attack.progress)) * contact));
            } else {
                const tail = attackClip.slice(contact);
                const sample = frameAtTime(tail, (state.clock - pose.attack.released) * 1000);
                frame = contact + sample.index;
                if (sample.done) { pose.attack = null; pose.attackEnded = state.clock; }
            }
            chosen = { action: primary, frame };
        }
        pose.action = chosen.action; pose.frame = chosen.frame;
    }
    for (const id of state.enemies.keys()) if (!present.has(id)) state.enemies.delete(id);

    // Corpses: only a C# death burst with an identity leaves one.
    const current = new Set();
    for (const death of snapshot.deathBursts ?? []) {
        const name = ENEMY_CHARACTERS.get(Number(death.kind));
        if (!name || !Number.isSafeInteger(death.entityId) || !manifests.get(name)) continue;
        const key = `${death.entityId}:${death.kind}`;
        current.add(key);
        if (state.seen.has(key)) continue;
        const old = state.enemies.get(death.entityId);
        state.corpses.set(key, { name, x: death.x, y: death.y, direction: old?.direction ?? 'S', started: state.clock });
    }
    state.seen = current;
    for (const [key, corpse] of state.corpses) if (state.clock - corpse.started > CORPSE_SECONDS) state.corpses.delete(key);
    while (state.corpses.size > 48) state.corpses.delete(state.corpses.keys().next().value);
}

export const CORPSE_SECONDS = 4;

/** The strip, row and frame a corpse shows: the death clip, then its last frame, fading over the final second. */
export function corpsePose(state, corpse, manifest) {
    const clip = durationsOf(manifest, 'death');
    const age = state.clock - corpse.started;
    return { action: 'death', frame: frameAtTime(clip, age * 1000).index, alpha: Math.max(0, Math.min(1, (CORPSE_SECONDS - age) / 1)) };
}

// ----------------------------------------------------------------- wizard

export function createWizardState() {
    return { x: null, y: null, lastMove: -99, mode: 'idle', modeStarted: 0, phase: 0, direction: 'S', action: 'idle', frame: 0, castDirection: null };
}

/**
 * The mage's pose. Idle, walk start, walk loop, walk stop and cast. The walk keeps its phase when it restarts mid-stop, a cast turns the
 * mage to the committed aim and runs to its release frame at the C# release point, and facing follows the aim while the mage has one.
 */
export function updateAuthoredWizard(state, snapshot, manifest, clock, reducedMotion = false) {
    const wizard = state.wizard, player = snapshot.player;
    if (!manifest || !player) return;
    const paused = Boolean(snapshot.paused || snapshot.ended);
    if (wizard.x != null) {
        const distance = Math.hypot(player.x - wizard.x, player.y - wizard.y);
        if (!paused && distance > .3 && distance < 48) {
            wizard.lastMove = clock;
            wizard.heading = pickDirection(player.x - wizard.x, player.y - wizard.y, wizard.heading ?? wizard.direction);
        }
    }
    wizard.x = player.x; wizard.y = player.y;
    const moving = clock - wizard.lastMove < .16;
    const cast = snapshot.castMotion;
    const casting = cast && Number.isFinite(cast.progress) && cast.progress >= 0 && cast.progress < 1 && action(manifest, 'cast');
    const aiming = Number.isFinite(player.aimAngle) && (player.manualAim || player.aimTargetId != null || player.aimPropId != null);
    if (casting && Number.isFinite(cast.angle)) wizard.direction = pickDirectionFromAngle(cast.angle, wizard.direction);
    else if (aiming) wizard.direction = pickDirectionFromAngle(player.aimAngle, wizard.direction);
    else if (wizard.heading) wizard.direction = wizard.heading;

    const walk = durationsOf(manifest, 'walk'), start = durationsOf(manifest, 'walk_start'), stop = durationsOf(manifest, 'walk_stop');
    if (!paused) {
        if (moving && !reducedMotion) {
            if (wizard.mode === 'idle' || wizard.mode === 'stop') {
                // Resuming mid-stop goes straight to the loop; the phase it left is kept.
                wizard.mode = wizard.mode === 'idle' && start ? 'start' : 'walk'; wizard.modeStarted = clock;
            }
            if (wizard.mode === 'start' && (clock - wizard.modeStarted) * 1000 >= clipDuration(start)) { wizard.mode = 'walk'; wizard.modeStarted = clock; }
        } else if (wizard.mode === 'walk' || wizard.mode === 'start') {
            wizard.mode = stop && !reducedMotion ? 'stop' : 'idle'; wizard.modeStarted = clock;
        }
        if (wizard.mode === 'stop' && (clock - wizard.modeStarted) * 1000 >= clipDuration(stop)) { wizard.mode = 'idle'; wizard.modeStarted = clock; }
        if (wizard.mode === 'walk') wizard.phase = (wizard.phase + (wizard.lastTick == null ? 0 : (clock - wizard.lastTick) * 1000 / clipDuration(walk))) % 1;
        wizard.lastTick = clock;
    } else wizard.lastTick = null;

    if (casting) {
        const frames = durationsOf(manifest, 'cast'), release = releaseFrame(manifest, 'cast');
        const p = Math.max(0, Math.min(.999, cast.progress));
        // Wind-up frames run to the release frame at the C# release point, follow-through frames fill the rest.
        const frame = p < CAST_RELEASE_AT ? Math.floor(p / CAST_RELEASE_AT * release)
            : release + Math.min(frames.length - release - 1, Math.floor((p - CAST_RELEASE_AT) / (1 - CAST_RELEASE_AT) * (frames.length - release)));
        wizard.action = 'cast'; wizard.frame = frame;
    } else if (wizard.mode === 'start') {
        wizard.action = 'walk_start'; wizard.frame = frameAtTime(start, (clock - wizard.modeStarted) * 1000).index;
    } else if (wizard.mode === 'walk') {
        wizard.action = 'walk'; wizard.frame = frameAtPhase(walk, wizard.phase);
    } else if (wizard.mode === 'stop') {
        wizard.action = 'walk_stop'; wizard.frame = frameAtTime(stop, (clock - wizard.modeStarted) * 1000).index;
    } else {
        wizard.action = 'idle'; wizard.frame = frameAtTime(durationsOf(manifest, 'idle'), clock * 1000, true).index;
    }
}

// ---------------------------------------------------------------- loading

const loaded = new Map(), requested = new Set();
const base = typeof import.meta !== 'undefined' ? new URL('../art/characters/', import.meta.url) : null;

async function load(name) {
    const response = await fetch(new URL(`${name}/manifest.json`, base));
    if (!response.ok) throw new Error(`${name} manifest unavailable`);
    const manifest = await response.json();
    const strips = new Map();
    await Promise.all(Object.entries(manifest.actions).map(async ([key, spec]) => {
        const image = new Image();
        image.src = new URL(`${name}/${spec.image.split('/').pop()}`, base).href;
        await image.decode();
        const [width, height] = manifest.canvas;
        if (image.naturalWidth !== width * spec.framesPerDirection || image.naturalHeight !== height * manifest.directions.length)
            throw new Error(`${name} ${key} strip has the wrong size`);
        strips.set(key, image);
    }));
    return { manifest, strips };
}

/** Starts downloading a character set; safe to call every frame. */
export function preloadAuthoredCharacter(name) {
    if (!requested.has(name) && typeof Image !== 'undefined' && typeof fetch !== 'undefined' && base) {
        requested.add(name);
        load(name).then(set => loaded.set(name, set)).catch(() => { });
    }
}

export const authoredCharacter = name => loaded.get(name) ?? null;

/** Name to manifest for every loaded set. */
export function loadedManifests() {
    return new Map([...loaded].map(([name, set]) => [name, set.manifest]));
}

/** Draws one cell with its feet on (x, y), in whole world units. Returns false when the set is not loaded. */
export function drawAuthoredCell(ctx, name, actionName, direction, frame, x, y, alpha = 1) {
    const set = loaded.get(name), strip = set?.strips.get(actionName);
    if (!strip) return false;
    const [width, height] = set.manifest.canvas, [rootX, rootY] = set.manifest.root;
    const row = Math.max(0, set.manifest.directions.indexOf(direction));
    const spec = set.manifest.actions[actionName];
    const column = Math.max(0, Math.min(spec.framesPerDirection - 1, frame));
    if (alpha < 1) { ctx.save(); ctx.globalAlpha = Math.max(0, alpha); }
    ctx.drawImage(strip, column * width, row * height, width, height, Math.round(x) - rootX, Math.round(y) - rootY, width, height);
    if (alpha < 1) ctx.restore();
    return true;
}

/** Soft contact shadow under the feet, so a sprite that casts none of its own does not float. */
function contactShadow(ctx, x, y, radius) {
    ctx.fillStyle = 'rgba(7, 9, 14, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * .36, 0, 0, Math.PI * 2);
    ctx.fill();
}

/** Draws an enemy from its authored pose; false when it has none (the caller then draws the old art). */
export function drawAuthoredEnemy(ctx, enemy, state) {
    const pose = state.enemies.get(enemy.entityId);
    if (!pose) return false;
    const opacity = Number.isFinite(enemy.opacity) ? enemy.opacity : 1;
    contactShadow(ctx, enemy.x, enemy.y, Math.max(6, (Number(enemy.radius) || 11) * .7));
    return drawAuthoredCell(ctx, pose.name, pose.action, pose.direction, pose.frame, enemy.x, enemy.y, opacity);
}

export function drawAuthoredCorpses(ctx, state) {
    for (const corpse of state.corpses.values()) {
        const manifest = loaded.get(corpse.name)?.manifest;
        if (!manifest) continue;
        const pose = corpsePose(state, corpse, manifest);
        contactShadow(ctx, corpse.x, corpse.y, 8);
        drawAuthoredCell(ctx, corpse.name, pose.action, corpse.direction, pose.frame, corpse.x, corpse.y, pose.alpha);
    }
}

/** The mage's feet sit this far below the C# position, which is the middle of the body (the old art's convention, kept so shadows line up). */
export const WIZARD_FEET_OFFSET = 12;

export function drawAuthoredWizard(ctx, player, state) {
    const wizard = state.wizard;
    contactShadow(ctx, player.x, player.y + WIZARD_FEET_OFFSET, 8);
    return drawAuthoredCell(ctx, 'Wizard', wizard.action, wizard.direction, wizard.frame, player.x, player.y + WIZARD_FEET_OFFSET);
}

export function authoredDiagnostics(state) {
    return {
        loaded: [...loaded.keys()], enemies: state.enemies.size, corpses: state.corpses.size,
        enemyPoses: [...state.enemies.values()].map(pose => ({ name: pose.name, action: pose.action, frame: pose.frame, direction: pose.direction })),
        wizard: { action: state.wizard.action, frame: state.wizard.frame, direction: state.wizard.direction },
    };
}
