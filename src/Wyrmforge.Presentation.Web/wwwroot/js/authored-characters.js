// Authored eight-direction character animation (art/characters, owner handover of 5 November 2026): the Fire mage and the Fire Tier-I enemies.
// Presentation only. C# owns movement, attacks, damage, hit stagger and death; this reads the snapshot and picks a strip, a row and a frame.
//
// Each action is one PNG strip: `framesPerDirection` cells across, one row per direction in DIRECTIONS order (E first). Cells are the whole
// canvas (wizard 48 x 48, enemies 80 x 80) with the feet at `root`; they are drawn 1 art pixel to 1 world unit like every actor, nearest
// neighbour, never mirrored, never cross-faded. Pose changes are discrete; the facing keeps its hysteresis and the walk keeps its phase when
// the facing changes.
export const DIRECTIONS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
import { drawEmergeParticles } from './arena-field-ambush-vfx.js';
import { drawFootprint, drawCastShadow, footDrop } from './authored-grounding.js';

/** C# EnemyKind numbers that have an authored set, and the strip of each one's primary attack. */
export const ENEMY_CHARACTERS = new Map([
    [0, 'Hollowed'], [1, 'Mire-Hound'], [2, 'Ashling'], [3, 'Penitent'], [4, 'Ash-Slinger'], [5, 'Ash-Priest'], [6, 'Drowned-Wraith'],
    // The two Fire bosses start in their first form; resolveCharacter picks the second from the C# phase.
    [7, 'Reliquary-normal'], [9, 'Bell-Warden-normal'],
]);
/** Every authored set the Hunt can ask for, the mage and the second boss forms included. */
export const AUTHORED_SETS = ['Wizard', ...ENEMY_CHARACTERS.values(), 'Bell-Warden-molten', 'Reliquary-awakened', 'Ashfang-normal', 'Ashfang-enraged'];
const PRIMARY_ACTION = {
    'Hollowed': 'claw_swipe', 'Mire-Hound': 'lunging_bite', 'Ashling': 'pounce_rake', 'Penitent': 'shield_bash',
    'Ash-Slinger': 'ember_throw', 'Ash-Priest': 'heal_resurrection', 'Drowned-Wraith': 'emerge_strike_retreat',
    'Reliquary-normal': 'ward', 'Reliquary-awakened': 'ward', 'Bell-Warden-normal': 'smash', 'Bell-Warden-molten': 'smash',
};
/** The C# telegraph kinds of the bosses name their strip; a form change plays the old form's phase_change over the whole telegraph. */
const TELEGRAPH_ACTION = {
    'bell-smash': 'smash', 'bell-toll': 'toll', 'bell-toll-fan': 'toll', 'bell-rally': 'rally', 'bell-crack': 'phase_change',
    'rite-ward': 'ward', 'rite-seal': 'seal', 'rite-corruption': 'corruption', 'rite-shift': 'phase_change',
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
// A phase change is all windup (the form flips when it ends); an action without a marked contact frame reaches contact on its third frame.
const releaseFrame = (manifest, name) => name === 'phase_change' ? action(manifest, name)?.framesPerDirection ?? 4
    : action(manifest, name)?.directions?.S?.events?.[0]?.localFrame ?? 2;

// ---------------------------------------------------------------- enemies

export function createAuthoredState() {
    return { clock: 0, last: null, hud: 0, enemies: new Map(), corpses: new Map(), seen: new Set(), wizard: createWizardState() };
}

/** The authored name of an enemy snapshot, or null when it still uses its old art. */
export const enemyCharacter = enemy => ENEMY_CHARACTERS.get(Number(enemy?.kind)) ?? null;

/**
 * The set an enemy plays right now. The Fire bosses change form with their C# phase (Bell Warden cracked, Reliquary shifted); during the
 * crack or shift telegraph they still wear the first form so its phase_change clip can play. Frost variants keep their old art.
 */
export function resolveCharacter(enemy, snapshot) {
    const kind = Number(enemy?.kind), telegraph = enemy?.telegraph?.kind;
    if (kind === 9) {
        if ((snapshot?.bellWarden?.variant ?? 'fire') !== 'fire') return null;
        return snapshot?.bellWarden?.cracked && telegraph !== 'bell-crack' ? 'Bell-Warden-molten' : 'Bell-Warden-normal';
    }
    if (kind === 7) {
        if ((snapshot?.reliquary?.variant ?? 'fire') !== 'fire') return null;
        return snapshot?.reliquary?.shifted && telegraph !== 'rite-shift' ? 'Reliquary-awakened' : 'Reliquary-normal';
    }
    return enemyCharacter(enemy);
}

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
        const name = resolveCharacter(enemy, snapshot), manifest = name ? manifests.get(name) : null;
        if (!manifest) continue;
        const id = enemy.entityId;
        present.add(id);
        let pose = state.enemies.get(id);
        if (!pose) {
            pose = { name, x: enemy.x, y: enemy.y, direction: 'S', phase: ((id * 2654435761) >>> 0) / 4294967296, lastMove: -1, attack: null, attackEnded: -9,
                hit: null, hitFlash: false, action: 'idle', frame: 0, offset: ((id * 40503) >>> 0) % 600 };
            state.enemies.set(id, pose);
        }
        pose.name = name;
        // Crawling out of the ground (a field ambush): C# holds it still and reports 0 to 1; it faces the hunter and plays the buried frames.
        if (enemy.emergeProgress != null) {
            const player = snapshot.player;
            if (player) pose.direction = pickDirection(player.x - enemy.x, player.y - enemy.y, pose.direction);
            pose.attack = null; pose.hit = null; pose.emerge = true;
            pose.emergeProgress = enemy.emergeProgress; pose.x = enemy.x; pose.y = enemy.y; pose.lastMove = -1;
            pose.action = name === 'Hollowed' && crawlOutReady() ? 'crawl_out' : 'rise';
            pose.frame = crawlOutFrame(enemy.emergeClip, enemy.emergeProgress);
            pose.emergeClip = enemy.emergeClip;
            continue;
        }
        pose.emerge = false;
        const advancing = !paused && !enemy.frozen;
        const dx = enemy.x - pose.x, dy = enemy.y - pose.y, distance = Math.hypot(dx, dy);
        if (distance >= 64) { pose.lastMove = -1; pose.attack = null; }
        if (advancing && distance > .05 && distance < 64) { pose.lastMove = state.clock; pose.direction = pickDirection(dx, dy, pose.direction); }
        pose.x = enemy.x; pose.y = enemy.y;
        const walking = state.clock - pose.lastMove < .18;
        const walkClip = durationsOf(manifest, 'walk');
        if (advancing && walking && walkClip) pose.phase = (pose.phase + dt * 1000 / clipDuration(walkClip)) % 1;

        const telegraph = enemy.telegraph;
        // A running telegraph names its strip (bosses); one that has ended keeps the strip it started with.
        const primary = pose.attack?.action && !telegraph ? pose.attack.action : TELEGRAPH_ACTION[telegraph?.kind] ?? PRIMARY_ACTION[name];
        const attackClip = durationsOf(manifest, primary), contact = releaseFrame(manifest, primary);
        if (advancing && telegraph && attackClip) {
            if (pose.attack?.mode !== 'telegraph' || pose.attack.action !== primary) pose.attack = { mode: 'telegraph', action: primary, progress: 0, released: null };
            pose.attack.progress = Number(telegraph.progress) || 0;
            if (Number.isFinite(telegraph.targetX) && Math.hypot(telegraph.targetX - enemy.x, telegraph.targetY - enemy.y) > 1)
                pose.direction = pickDirection(telegraph.targetX - enemy.x, telegraph.targetY - enemy.y, pose.direction);
        } else if (advancing && pose.attack?.mode === 'telegraph' && pose.attack.released == null) {
            pose.attack.released = state.clock;
        }
        const player = snapshot.player;
        const touching = player && Math.hypot(enemy.x - player.x, enemy.y - player.y) <= (Number(enemy.radius) || 11) + (Number(player.radius) || 0) + 2;
        if (advancing && !pose.attack && TOUCH_ATTACKERS.has(name) && attackClip && touching && state.clock - pose.attackEnded > .6) {
            pose.attack = { mode: 'contact', action: primary, started: state.clock };
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
                const sample = tail.length ? frameAtTime(tail, (state.clock - pose.attack.released) * 1000) : { index: -1, done: true };
                frame = Math.min(attackClip.length - 1, contact + Math.max(0, sample.index));
                if (sample.done) { pose.attack = null; pose.attackEnded = state.clock; }
            }
            chosen = { action: primary, frame };
        }
        // The exposed gap after a boss's big commitment (C# `recovering`): it reels in the authored stagger and holds its last frame.
        if (enemy.recovering && !pose.attack && durationsOf(manifest, 'stagger')) {
            if (pose.recoverStart == null) pose.recoverStart = state.clock;
            chosen = { action: 'stagger', frame: frameAtTime(durationsOf(manifest, 'stagger'), (state.clock - pose.recoverStart) * 1000).index };
        } else pose.recoverStart = null;
        pose.action = chosen.action; pose.frame = chosen.frame;
    }
    // Corpses: only a C# death burst with an identity leaves one.
    const current = new Set();
    for (const death of snapshot.deathBursts ?? []) {
        if (!ENEMY_CHARACTERS.has(Number(death.kind)) || !Number.isSafeInteger(death.entityId)) continue;
        const old = state.enemies.get(death.entityId);
        // A boss dies in the form it was last seen in.
        const name = old?.name ?? ENEMY_CHARACTERS.get(Number(death.kind));
        if (!manifests.get(name)) continue;
        const key = `${death.entityId}:${death.kind}`;
        current.add(key);
        if (state.seen.has(key)) continue;
        state.corpses.set(key, { name, x: death.x, y: death.y, direction: old?.direction ?? 'S', started: state.clock });
    }
    state.seen = current;
    // The pose that just vanished is where a dying enemy's facing and form came from, so it goes only after its corpse is made.
    for (const id of state.enemies.keys()) if (!present.has(id)) state.enemies.delete(id);
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

const loaded = new Map(), requested = new Set(), failed = new Set();
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
    // The emissive strips (built from the strips' own hot pixels, so registered with them) are optional: a set without them simply does not glow.
    const emissive = new Map();
    await Promise.all((manifest.emissive ?? []).map(async key => {
        try {
            const image = new Image(), spec = manifest.actions[key];
            image.src = new URL(`${name}/emissive/${key}.png`, base).href;
            await image.decode();
            const [width, height] = manifest.canvas;
            if (spec && image.naturalWidth === width * spec.framesPerDirection && image.naturalHeight === height * manifest.directions.length) emissive.set(key, image);
        } catch { /* a missing emissive strip only means no glow for that action */ }
    }));
    return { manifest, strips, emissive };
}

/**
 * What a draw call paints: `overlay` (Canvas fallback) the sprite with its glow added on top; `albedo` (GPU) the sprite and its shadows only,
 * because the glow goes to a separate emissive texture; `emissive` (GPU) only the glowing pixels, on a transparent tile.
 */
let renderMode = 'overlay';
export function setAuthoredRenderMode(mode) { renderMode = mode; }
export const authoredRenderMode = () => renderMode;

/** Test hook: registers an already decoded set under a name. */
export function injectAuthoredSet(name, set) { loaded.set(name, set); requested.add(name); }

/** True when the set has a glow strip for this action. */
export const hasEmissive = (name, actionName) => Boolean(loaded.get(name)?.emissive?.has(actionName));

/**
 * Avoid allocating and clearing a second GPU capture when an enemy's current authored action has no glow.
 * A future glow strip is picked up automatically as soon as its authored set loads.
 */
export function enemyHasEmissivePose(state, entityId) {
    const pose = state?.enemies?.get(entityId);
    return Boolean(pose && !pose.emerge && hasEmissive(pose.name, pose.action));
}

/**
 * How hard a set's glow burns: the second forms (enraged, molten, awakened) are fire-infused and burn harder, and a boss in the middle of a
 * transformation (C# `invulnerable`, progress from its telegraph) swells to its peak as it breaks open.
 */
export function emissionIntensity(name, changeProgress = null) {
    const secondForm = /enraged|molten|awakened/i.test(name ?? '');
    const base = secondForm ? 1.8 : 1;
    return changeProgress == null ? base : base + 1.4 * Math.max(0, Math.min(1, changeProgress));
}

/** Starts downloading a character set; safe to call every frame. */
export function preloadAuthoredCharacter(name) {
    if (!requested.has(name) && typeof Image !== 'undefined' && typeof fetch !== 'undefined' && base) {
        requested.add(name);
        load(name).then(set => loaded.set(name, set)).catch(() => failed.add(name));
    }
}

/** True while a set is still downloading: the caller draws nothing for it rather than the old art it replaces. */
export const authoredPending = name => requested.has(name) && !loaded.has(name) && !failed.has(name);

export const authoredCharacter = name => loaded.get(name) ?? null;

/** Name to manifest for every loaded set. */
export function loadedManifests() {
    return new Map([...loaded].map(([name, set]) => [name, set.manifest]));
}

/** Draws one cell with its feet on (x, y), in whole world units. Returns false when the set is not loaded. */
export function drawAuthoredCell(ctx, name, actionName, direction, frame, x, y, alpha = 1, scale = 1) {
    const set = loaded.get(name), strip = set?.strips.get(actionName);
    if (!strip) return false;
    const [width, height] = set.manifest.canvas, [rootX, rootY] = set.manifest.root;
    const row = Math.max(0, set.manifest.directions.indexOf(direction));
    const spec = set.manifest.actions[actionName];
    const column = Math.max(0, Math.min(spec.framesPerDirection - 1, frame));
    if (alpha < 1) { ctx.save(); ctx.globalAlpha = Math.max(0, alpha); }
    ctx.drawImage(strip, column * width, row * height, width, height, Math.round(x) - rootX * scale, Math.round(y) - rootY * scale, width * scale, height * scale);
    if (alpha < 1) ctx.restore();
    return true;
}

/**
 * Draws one cell grounded: the footprint ellipse under the body, the silhouette cast flat across the ground, then the sprite with its front foot
 * planted `footDrop(radius)` below the C# position. `radius` is the body's collision radius. Returns false when the set is not loaded.
 */
export function drawGrounded(ctx, name, actionName, direction, frame, x, y, { alpha = 1, scale = 1, radius = 11 } = {}) {
    const set = loaded.get(name), strip = set?.strips.get(actionName);
    if (!strip) return false;
    const feetY = y + footDrop(radius);
    const [width, height] = set.manifest.canvas, [rootX, rootY] = set.manifest.root, spec = set.manifest.actions[actionName];
    const row = Math.max(0, set.manifest.directions.indexOf(direction)), column = Math.max(0, Math.min(spec.framesPerDirection - 1, frame));
    const glow = set.emissive?.get(actionName);
    const drawGlow = (mode, glowAlpha) => {
        ctx.save();
        if (mode === 'overlay') ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, glowAlpha);
        ctx.drawImage(glow, column * width, row * height, width, height, Math.round(x) - rootX * scale, Math.round(feetY) - rootY * scale, width * scale, height * scale);
        ctx.restore();
    };
    // The GPU's emissive tile holds only the glowing pixels, in the same place as the sprite.
    if (renderMode === 'emissive') {
        if (!glow) return false;
        drawGlow('emissive', alpha);
        return true;
    }
    drawFootprint(ctx, x, y + footDrop(radius) * .4, radius, alpha);
    drawCastShadow(ctx, strip, { x: column * width, y: row * height, width, height }, rootX, rootY, x, feetY, scale, alpha);
    const drawn = drawAuthoredCell(ctx, name, actionName, direction, frame, x, feetY, alpha, scale);
    if (renderMode === 'overlay' && glow) drawGlow('overlay', alpha * .9);
    return drawn;
}

// ---------------------------------------------------------------- crawl out of the ground

let crawlOut = null, crawlOutRequested = false;

/** The two authored Hollowed crawl-out clips (south-east only; the pack's atlas is 8 cells across, one clip per row). */
export function preloadCrawlOut() {
    if (crawlOutRequested || typeof Image === 'undefined' || typeof fetch === 'undefined' || !base) return;
    crawlOutRequested = true;
    (async () => {
        const folder = new URL('Hollowed-Crawl-Out/', base);
        const manifest = await (await fetch(new URL('manifest.json', folder))).json();
        const image = new Image();
        image.src = new URL(manifest.atlas, folder).href;
        await image.decode();
        if (image.naturalWidth !== manifest.atlasSize[0] || image.naturalHeight !== manifest.atlasSize[1]) throw new Error('crawl-out atlas has the wrong size');
        crawlOut = { manifest, image };
    })().catch(() => { });
}

export const crawlOutReady = () => crawlOut !== null;

/** The frame (0 to 7) of clip 0 (the long pull) or 1 (the short scramble) at C#'s 0 to 1 progress, weighted by the authored frame times. */
export function crawlOutFrame(clipIndex, progress) {
    const clip = Object.values(crawlOut?.manifest.clips ?? {})[clipIndex === 1 ? 1 : 0];
    if (!clip) return 0;
    return frameAtTime(clip.durationsMs, Math.max(0, Math.min(1, progress)) * clipDuration(clip.durationsMs)).index;
}

function drawCrawlOut(ctx, x, y, clipIndex, frame) {
    const clip = Object.values(crawlOut.manifest.clips)[clipIndex === 1 ? 1 : 0];
    const [width, height] = crawlOut.manifest.canvas, [rootX, rootY] = crawlOut.manifest.root;
    const index = clip.fromFrame + Math.min(frame, clip.toFrame - clip.fromFrame), columns = crawlOut.manifest.atlasSize[0] / width;
    ctx.drawImage(crawlOut.image, (index % columns) * width, Math.floor(index / columns) * height, width, height, Math.round(x) - rootX, Math.round(y) - rootY, width, height);
}

/**
 * An enemy climbing out of the ground: the Hollowed plays the owner's crawl-out clip (south-east art, so it is not turned), everything else rises
 * out of the ground behind a clip line at its feet, facing the hunter. Dirt and chips fly from its root either way.
 */
function drawEmerging(ctx, enemy, pose) {
    const progress = Math.max(0, Math.min(1, pose.emergeProgress));
    if (pose.action === 'crawl_out') drawCrawlOut(ctx, enemy.x, enemy.y, pose.emergeClip, pose.frame);
    else {
        ctx.save();
        ctx.beginPath(); ctx.rect(enemy.x - 70, enemy.y - 120, 140, 122); ctx.clip();
        const style = RISE_STYLES[pose.name] ?? RISE_STYLES.default;
        drawAuthoredCell(ctx, pose.name, 'idle', pose.direction, 0, enemy.x + riseShake(style, progress, enemy.entityId), enemy.y + (1 - riseEmerged(style, progress)) * 56);
        ctx.restore();
    }
    drawEmergeParticles(ctx, enemy.x, enemy.y, enemy.entityId, progress);
    return true;
}

/**
 * The emerge styles of the kinds that have no authored crawl-out art (it exists for the Hollowed only): all rise behind the ground line, but each
 * pulls itself out its own way. `steps` makes the climb a few hauls instead of a glide; `hop` throws the body clear at the end; `shake` is the strain.
 */
export const RISE_STYLES = {
    default: { steps: 5, hop: 0, shake: 2 },
    'Mire-Hound': { steps: 0, hop: 10, shake: 1 },
    Ashling: { steps: 3, hop: 4, shake: 3 },
    Penitent: { steps: 8, hop: 0, shake: 1 },
    'Ash-Priest': { steps: 0, hop: 0, shake: 0 },
    'Ash-Slinger': { steps: 4, hop: 3, shake: 2 },
};

/** How much of the body has cleared the ground (0 to 1) at C#'s emerge progress, in the kind's own rhythm. */
export function riseEmerged(style, progress) {
    const p = Math.max(0, Math.min(1, progress));
    if (p >= 1) return 1;
    const hauls = style.steps * p;
    // Hauls climb in whole steps with a small slide between them; the others ease out.
    const smooth = style.steps > 0 ? (Math.floor(hauls) + (hauls % 1) * .35) / style.steps : 1 - (1 - p) ** 2;
    const hop = style.hop && p > .8 ? Math.sin((p - .8) / .2 * Math.PI) * style.hop / 56 : 0;
    return Math.max(0, smooth + hop);
}

export const riseShake = (style, progress, id) => progress >= 1 ? 0 : Math.round(Math.sin(progress * 40 + id) * style.shake);

/** How far a Drowned Wraith has sunk below the waterline (0 on the surface, 1 gone) from C#'s body opacity, which only the submerge and emerge lower. */
export const wraithSink = opacity => Math.max(0, Math.min(1, 1 - (Number.isFinite(opacity) ? opacity : 1)));

/** Draws an enemy from its authored pose; false when it has none (the caller then draws the old art). */
export function drawAuthoredEnemy(ctx, enemy, state) {
    const pose = state.enemies.get(enemy.entityId);
    const glowPass = renderMode === 'emissive';
    if (!pose) return glowPass ? false : pendingKind(enemy.kind);
    if (pose.emerge) return glowPass ? false : drawEmerging(ctx, enemy, pose);
    const opacity = Number.isFinite(enemy.opacity) ? enemy.opacity : 1;
    // A Drowned Wraith sinks into the water and rises out of it behind a clip line with ripples, instead of fading.
    if (pose.name === 'Drowned-Wraith' && opacity < 1 && !glowPass) return drawSubmerging(ctx, enemy, pose, wraithSink(opacity));
    return drawGrounded(ctx, pose.name, pose.action, pose.direction, pose.frame, enemy.x, enemy.y, { alpha: opacity, radius: Number(enemy.radius) || 11 });
}

function drawSubmerging(ctx, enemy, pose, sink) {
    const radius = Number(enemy.radius) || 11;
    ctx.save();
    ctx.beginPath(); ctx.rect(enemy.x - 70, enemy.y - 120, 140, 122 + footDrop(radius)); ctx.clip();
    drawAuthoredCell(ctx, pose.name, pose.action, pose.direction, pose.frame, enemy.x, enemy.y + footDrop(radius) + sink * 56);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(150,190,200,.5)';
    for (let ring = 0; ring < 2; ring++) {
        const r = radius * (.7 + ring * .5 + sink * .6);
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.fillRect(Math.round(enemy.x + Math.cos(a) * r), Math.round(enemy.y + footDrop(radius) + Math.sin(a) * r * .38), 2, 1); }
    }
    ctx.restore();
    return true;
}

/** A kind whose set (or either boss form) is still downloading is skipped, not drawn in the old art. */
function pendingKind(kind) {
    const name = ENEMY_CHARACTERS.get(Number(kind));
    if (!name) return false;
    return authoredPending(name) || (Number(kind) === 7 && authoredPending('Reliquary-awakened')) || (Number(kind) === 9 && authoredPending('Bell-Warden-molten'));
}

export function drawAuthoredCorpses(ctx, state) {
    for (const corpse of state.corpses.values()) {
        const manifest = loaded.get(corpse.name)?.manifest;
        if (!manifest) continue;
        const pose = corpsePose(state, corpse, manifest);
        drawGrounded(ctx, corpse.name, pose.action, corpse.direction, pose.frame, corpse.x, corpse.y, { alpha: pose.alpha, radius: 11 });
    }
}

/** The mage's feet sit this far below the C# position, which is the middle of the body (the old art's convention, kept so shadows line up). */
export const WIZARD_FEET_OFFSET = 12;

export function drawAuthoredWizard(ctx, player, state, hit = false) {
    const wizard = state.wizard, radius = Number(player.radius) || 12, feetY = player.y + WIZARD_FEET_OFFSET;
    if (renderMode === 'emissive') return drawGrounded(ctx, 'Wizard', wizard.action, wizard.direction, wizard.frame, player.x, feetY - footDrop(radius), { radius });
    // A hit reddens the whole figure for its short flash; the cast and walk poses stay untouched.
    ctx.save();
    if (hit) ctx.filter = 'sepia(1) saturate(3.2) hue-rotate(-35deg) brightness(1.05)';
    const drawn = drawGrounded(ctx, 'Wizard', wizard.action, wizard.direction, wizard.frame, player.x, feetY - footDrop(radius), { radius });
    ctx.restore();
    // Warding Barrier: two pale seams at the shoulders, as the old mage showed it.
    if (player.barrier) {
        ctx.fillStyle = '#a9c8d3';
        ctx.fillRect(Math.round(player.x) - 11, feetY - 26, 3, 8);
        ctx.fillRect(Math.round(player.x) + 8, feetY - 26, 3, 8);
    }
    return drawn;
}

// ---------------------------------------------------------------- Ashfang

/**
 * Ashfang is the C# dragon, not an enemy. The old motion graph (ashfang-sprites.js) already turns the snapshot into a clip name, a facing and a
 * progress; this only maps those onto the authored strips. The authored cells are 80 px for a 60-unit-radius dragon, drawn at a whole 2x so
 * the pixels stay square and the body fills its collision circle.
 */
export const ASHFANG_SCALE = 2;
const ASHFANG_ALIAS = { land: 'landing', run_start: 'walk_start', run_stop: 'walk_stop' };
// The enraged form lacks a few strips the normal form has; each falls back to the nearest authored pose.
const FALLBACK = { stagger: ['hit', 'roar'], breath_sweep: ['fire_breath'], claw_combo: ['claw_right'], tail_left: ['claw_left'], tail_right: ['claw_right'] };

/** The set, strip and frame for the old graph's `entity`; `shadow` means only the moving ground shadow shows (overhead flight). */
export function ashfangPose(entity, dragon, clock, manifests) {
    const name = Number(dragon?.phase) === 2 ? 'Ashfang-enraged' : 'Ashfang-normal', manifest = manifests.get(name);
    if (!manifest || !entity) return null;
    if (entity.hidden) return { name, hidden: true };
    if (entity.clip === 'fly' || entity.shadow) return { name, shadow: true };
    const age = Math.max(0, clock - (entity.at ?? clock));
    let actionName = ASHFANG_ALIAS[entity.clip] ?? entity.clip, frame;
    // C# has one claw; the authored left and right claws are chosen by which side of its facing the target stands on.
    if (entity.clip === 'claw_right' && Number.isFinite(dragon?.attackTargetX) && Number.isFinite(dragon?.x)) {
        const angle = DIRECTIONS.indexOf(entity.direction) * Math.PI / 4;
        const cross = Math.cos(angle) * (dragon.attackTargetY - dragon.y) - Math.sin(angle) * (dragon.attackTargetX - dragon.x);
        if (cross < 0) actionName = 'claw_left';
    }
    if (entity.clip === 'breath_start' || entity.clip === 'breath_loop' || entity.clip === 'breath_end') {
        // Windup frames, a two-frame loop while the flame is out, then the recovery frame.
        actionName = 'fire_breath';
        frame = entity.clip === 'breath_start' ? Math.min(1, Math.floor((entity.progress ?? 0) * 2)) : entity.clip === 'breath_loop' ? 2 + Math.floor(age * 8) % 2 : 4;
    }
    const spec = action(manifest, actionName) ?? FALLBACK[actionName]?.map(name => action(manifest, name)).find(Boolean) ?? action(manifest, 'idle');
    if (!action(manifest, actionName)) actionName = FALLBACK[actionName]?.find(name => action(manifest, name)) ?? 'idle';
    if (frame == null) {
        const durations = spec.durationsMs;
        frame = entity.progress != null ? Math.floor(Math.max(0, Math.min(.999, entity.progress)) * durations.length)
            : frameAtTime(durations, age * 1000, Boolean(spec.loop)).index;
    }
    return { name, action: actionName, frame: Math.min(frame, spec.framesPerDirection - 1), direction: entity.direction };
}

/** Draws the live dragon from its old motion graph; true while its set is still downloading (nothing draws), false when it has none (the old atlas then draws). */
export function drawAuthoredAshfang(ctx, ashfang, dragon) {
    const p = ashfang?.entity;
    const pose = p ? ashfangPose(p, dragon, ashfang.clock, loadedManifests()) : null;
    if (!pose) return authoredPending('Ashfang-normal') || authoredPending('Ashfang-enraged');
    if (!pose.hidden && !pose.shadow && !authoredCharacter(pose.name)) return authoredPending(pose.name);
    ashfang.authoredForm = pose.name;
    if (pose.hidden) return renderMode !== 'emissive';
    ctx.save();
    if (pose.shadow) {
        if (renderMode !== 'emissive') {
            ctx.fillStyle = 'rgba(4,6,9,.27)';
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius * .55, p.radius * .2, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        return renderMode !== 'emissive';
    }
    if (renderMode !== 'emissive') {
        if (p.frozen) ctx.filter = 'sepia(1) saturate(1.6) hue-rotate(135deg)';
        else if (p.hitFlash) ctx.filter = 'brightness(1.25) saturate(.75)';
    }
    const drawn = drawGrounded(ctx, pose.name, pose.action, pose.direction, pose.frame, p.x, p.y, { scale: ASHFANG_SCALE, radius: p.radius });
    ctx.restore();
    return renderMode === 'emissive' ? drawn : true;
}

/** The collapse: the death clip once, then its last frame, fading after eight seconds like the old one. */
export function drawAuthoredAshfangDeath(ctx, ashfang) {
    const death = ashfang?.death, name = ashfang?.authoredForm;
    const manifest = name ? loaded.get(name)?.manifest : null;
    if (!death || !manifest) return false;
    const frame = frameAtTime(durationsOf(manifest, 'death'), death.age * 1000).index;
    return drawAuthoredCell(ctx, name, 'death', death.direction ?? 'SE', frame, death.x, death.y, Math.max(0, Math.min(1, 8 - death.age)), ASHFANG_SCALE);
}

export function authoredDiagnostics(state) {
    return {
        loaded: [...loaded.keys()], enemies: state.enemies.size, corpses: state.corpses.size,
        corpsePoses: [...state.corpses.values()].map(corpse => {
            const manifest = loaded.get(corpse.name)?.manifest;
            if (!manifest) return null;
            const death = durationsOf(manifest, 'death');
            return { name: corpse.name, age: state.clock - corpse.started, frame: corpsePose(state, corpse, manifest).frame,
                finalFrame: death.length - 1 };
        }).filter(Boolean),
        enemyPoses: [...state.enemies.values()].map(pose => ({ name: pose.name, action: pose.action, frame: pose.frame, direction: pose.direction })),
        wizard: { action: state.wizard.action, frame: state.wizard.frame, direction: state.wizard.direction },
    };
}
