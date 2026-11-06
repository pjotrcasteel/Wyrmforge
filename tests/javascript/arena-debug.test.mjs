import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEBUG_BRIGHT_AMBIENT, DEBUG_BRIGHT_COLOR, MAX_DEBUG_SPEED, withDebugAmbient, botHuntDirection, flowDirection, botKiteDirection, botMovement, createBotMemory,
    readArenaDebugFlags, roadWalkDirection, walkableSegment,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-debug.js';

const world = { width: 1024, height: 1920 };
const at = (x, y, extra = {}) => ({ player: { x, y }, world, enemies: [], paused: false, ended: false, exit: null, ...extra });

test('debug flags are off by default and clamp the speed', () => {
    assert.deepEqual(readArenaDebugFlags(''), { speed: 1, god: false, bot: false, botRoad: false, bright: false, shear: false, ambient: null, band: null, moonShadows: false, renderScale: null });
    assert.deepEqual(readArenaDebugFlags('?speed=8&god=1&bot=1'), { speed: 8, god: true, bot: true, botRoad: false, bright: false, shear: false, ambient: null, band: null, moonShadows: false, renderScale: null });
    assert.equal(readArenaDebugFlags('?speed=500').speed, MAX_DEBUG_SPEED);
    assert.equal(readArenaDebugFlags('?speed=0').speed, 1);
    assert.equal(readArenaDebugFlags('?speed=abc').speed, 1);
    assert.equal(readArenaDebugFlags('?god=true').god, false, 'only an explicit 1 enables a switch');
});

test('the bot flees a nearby enemy and ignores distant ones', () => {
    const away = botKiteDirection(at(512, 960, { enemies: [{ x: 460, y: 960 }] }));
    assert.ok(away.x > 0.9, 'enemy to the left: run right');
    assert.deepEqual(botKiteDirection(at(512, 960, { enemies: [{ x: 512 + 800, y: 960 }] })), { x: 0, y: 0 });
});

test('the bot is pushed off the arena edge toward the middle', () => {
    assert.ok(botKiteDirection(at(20, 960)).x > 0.9);
    assert.ok(botKiteDirection(at(1000, 960)).x < -0.9);
    assert.ok(botKiteDirection(at(512, 10)).y > 0.9);
});

test('the bot stands still when paused, ended or missing', () => {
    const memory = createBotMemory();
    assert.deepEqual(botMovement(at(0, 0, { paused: true }), memory, 0), { x: 0, y: 0 });
    assert.deepEqual(botMovement(at(0, 0, { ended: true }), memory, 0), { x: 0, y: 0 });
    assert.deepEqual(botMovement(null, memory, 0), { x: 0, y: 0 });
});

test('once the exit opens the bot walks straight to it', () => {
    const memory = createBotMemory();
    const move = botMovement(at(100, 900, { exit: { x: 100, y: 200 } }), memory, 0);
    assert.deepEqual(move, { x: 0, y: -1 });
    assert.deepEqual(botMovement(at(100, 203, { exit: { x: 100, y: 200 } }), memory, 10), { x: 0, y: 0 }, 'inside the dead zone it stops');
});

test('a world-site fork uses its real exit ports rather than kiting after the trail is vanquished', () => {
    const memory = createBotMemory();
    const exits = [{ x: 80, y: 240, radius: 37 }, { x: 900, y: 1600, radius: 37 }];
    const snapshot = at(96, 680, { exitPorts: exits });
    assert.deepEqual(botMovement(snapshot, memory, 0), botMovement(at(96, 680, { exit: exits[0] }), createBotMemory(), 0));
    assert.deepEqual(botMovement(at(900, 1300, { exitPorts: exits }), memory, 100), { x: 0, y: 1 },
        'after moving near the other branch the bot pursues that reachable portal');
    assert.deepEqual(botMovement(at(900, 1599, { exitPorts: exits }), memory, 200), { x: 0, y: 0 },
        'the bot stops inside the selected portal radius');
});

test('a pinned bot sidesteps perpendicular to the exit for a moment, then resumes', () => {
    const memory = createBotMemory();
    const stuck = at(100, 900, { exit: { x: 100, y: 200 } });
    assert.deepEqual(botMovement(stuck, memory, 0), { x: 0, y: -1 });
    assert.deepEqual(botMovement(stuck, memory, 500), { x: 0, y: -1 }, 'not stuck yet');
    const sidestep = botMovement(stuck, memory, 1300);
    assert.equal(Math.abs(sidestep.x), 1, 'sideways');
    assert.equal(sidestep.y === 0 || Math.abs(sidestep.y) < 1e-9, true);
    assert.deepEqual(botMovement(stuck, memory, 1900), sidestep, 'holds the detour');
    assert.deepEqual(botMovement(stuck, memory, 2100), { x: 0, y: -1 }, 'then resumes toward the exit');
});

test('without an exit the memory resets so the next exit starts fresh', () => {
    const memory = createBotMemory();
    botMovement(at(100, 900, { exit: { x: 100, y: 200 } }), memory, 0);
    botMovement(at(512, 960), memory, 10);
    assert.equal(memory.bestDistance, Number.POSITIVE_INFINITY);
});

test('with only a few foes left the bot closes to firing range and holds there', () => {
    assert.equal(botHuntDirection(at(512, 960, { enemies: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }] })), null, 'a crowd is kited, not chased');
    assert.equal(botHuntDirection(at(512, 960)), null, 'nothing to hunt');
    const chase = botHuntDirection(at(512, 960, { enemies: [{ x: 512, y: 300 }] }));
    assert.deepEqual(chase, { x: 0, y: -1 });
    assert.deepEqual(botHuntDirection(at(512, 960, { enemies: [{ x: 512, y: 860 }] })), { x: 0, y: 0 }, 'already in range');
    assert.deepEqual(botHuntDirection(at(512, 960, { enemies: [], dragon: { x: 512, y: 100 } })), { x: 0, y: -1 }, 'the Wyrm counts as a foe');
    assert.deepEqual(botMovement(at(512, 960, { enemies: [{ x: 512, y: 300 }] }), createBotMemory(), 0), { x: 0, y: -1 });
});

test('after a dry spell the review bot closes on a stranded small pack instead of kiting forever', () => {
    const memory = createBotMemory();
    const foes = Array.from({ length: 5 }, (_, index) => ({ x: 512 + index * 10, y: 100 }));
    const snapshot = at(512, 960, { enemies: foes, hud: { kills: 6 } });
    assert.deepEqual(botMovement(snapshot, memory, 1000), botKiteDirection(snapshot), 'initially kite a pack');
    assert.deepEqual(botMovement(snapshot, memory, 10000), { x: 0, y: -1 }, 'pursue after no progress');
    snapshot.hud.kills = 7;
    assert.deepEqual(botMovement(snapshot, memory, 11000), botKiteDirection(snapshot), 'a kill resumes normal kiting');
});

test('an ambush-size crowd cannot pin the invulnerable review bot against the arena edge indefinitely', () => {
    const memory = createBotMemory();
    const enemies = Array.from({ length: 15 }, (_, index) => ({ x: 500 + index * 3, y: 800 }));
    const snapshot = at(512, 1700, { enemies, hud: { kills: 0 } });
    assert.deepEqual(botMovement(snapshot, memory, 0), botKiteDirection(snapshot), 'briefly kite while fighting the wave');
    assert.ok(botMovement(snapshot, memory, 9000).y < -.9, 'after no kills, walk back toward the pack');
});

test('after holding in firing range of five stalled foes the bot keeps closing without losing its pursuit target', () => {
    const memory = createBotMemory();
    const enemies = Array.from({ length: 5 }, (_, index) => ({ x: 512 + index * 4, y: 860 }));
    const snapshot = at(512, 960, { enemies, hud: { kills: 6 } });
    botMovement(snapshot, memory, 0);
    assert.deepEqual(botMovement(snapshot, memory, 9000), { x: 0, y: 0 }, 'hold the first moments inside firing range');
    const pursuit = botMovement(snapshot, memory, 14000);
    assert.ok(pursuit.y < -.9, 'after the hold, pursue a foe even if more than three enemies remain');
    assert.equal(memory.huntClosing, true);
    assert.ok(botMovement(snapshot, memory, 15000).y < -.9, 'the next frame still has a valid pursuit direction');
});

const grid = (columns, rows, height = () => 0, material = () => 0) => ({
    columns, rows,
    surface: Array.from({ length: columns * rows }, (_, i) => height(i % columns, Math.floor(i / columns))),
    material: Array.from({ length: columns * rows }, (_, i) => material(i % columns, Math.floor(i / columns))),
});

test('flow direction heads straight along open ground', () => {
    assert.deepEqual(flowDirection(grid(5, 8), { x: 80, y: 250 }, { x: 80, y: 20 }), { x: 0, y: -1 });
    assert.equal(flowDirection(null, { x: 0, y: 0 }, { x: 1, y: 1 }), null);
});

test('flow direction routes around a rock wall through its gap', () => {
    // A 2 m wall across row 3 with a gap in column 4; start at the left, target on the far side.
    const terrain = grid(5, 7, (column, row) => (row === 3 && column !== 4 ? 16 : 0));
    const first = flowDirection(terrain, { x: 16, y: 5 * 32 + 16 }, { x: 16, y: 16 });
    assert.ok(first.x > 0.9, 'the straight line is blocked, so it first walks sideways toward the gap');
    const atGap = flowDirection(terrain, { x: 4 * 32 + 16, y: 5 * 32 + 16 }, { x: 16, y: 16 });
    assert.ok(atGap.y < -0.9, 'under the gap it walks north');
});

test('flow direction respects the full physical heights of visually lowered trees and boulders', () => {
    const terrain = grid(5, 7);
    terrain.trunks = new Map([1, 2, 3].map(column => [3 * 5 + column, 16]));
    terrain.boulders = new Map([[3 * 5, 16]]);
    const first = flowDirection(terrain, { x: 16, y: 5 * 32 + 16 }, { x: 16, y: 16 });
    assert.ok(first.x > 0.9, 'the bot walks around the physical trunks instead of crossing the renderer-only lowered ground');
});

test('a short road segment checks the full hunter footprint near cliff columns', () => {
    const terrain = grid(5, 7, (column, row) => (row === 3 && column === 3 ? 16 : 0));
    assert.equal(walkableSegment(terrain, { x: 2 * 32 + 25, y: 5 * 32 + 16 }, { x: 2 * 32 + 25, y: 16 }), false,
        'the hunter would clip the cliff in the adjacent column');
    assert.equal(walkableSegment(terrain, { x: 2 * 32 + 16, y: 5 * 32 + 16 }, { x: 2 * 32 + 16, y: 16 }), true,
        'walking down the protected centreline clears the same cliff');
});

test('the road review bot navigates around terrain instead of repeatedly walking into a wall', () => {
    const terrain = grid(7, 7, (column, row) => (row === 3 && column !== 6 ? 16 : 0));
    terrain.road = Array.from({ length: 7 }, (_, row) => [8, (6 - row) * 16 + 8]).flat();
    const snapshot = at(16, 5 * 32 + 16);
    const heading = roadWalkDirection(snapshot, terrain);
    assert.ok(heading.y < -0.9, 'follow the short protected road segment while it is clear');
    const detour = roadWalkDirection(at(16, 4 * 32 + 16), terrain);
    assert.ok(detour.x > 0.9, 'at the ridge, route sideways toward the gap instead of pressing against the wall');
    assert.deepEqual(roadWalkDirection(snapshot, { ...grid(7, 7), road: terrain.road }), { x: 0, y: -1 },
        'on open ground the same road keeps its northbound heading');
});

test('road review bot looks far enough ahead to avoid bouncing around spline samples', () => {
    const terrain = grid(20, 20);
    terrain.road = [[8, 15], [8, 14], [8, 13], [9, 12], [10, 11]]
        .flatMap(([column, row]) => [(column + .5) * 16, (row + .5) * 16]);
    const heading = roadWalkDirection(at(8 * 32 + 16, 15 * 32 + 16), terrain);
    assert.ok(heading.x > .2 && heading.y < -.8, 'use a reachable forward point through the bend, not the first tiny spline step');
});

test('road review bot sidesteps after sustained collision and then resumes its route', () => {
    const terrain = grid(20, 20);
    terrain.road = Array.from({ length: 15 }, (_, row) => [8 * 16 + 8, (19 - row) * 16 + 8]).flat();
    const snapshot = at(8 * 32 + 16, 15 * 32 + 16);
    const memory = createBotMemory();
    assert.deepEqual(roadWalkDirection(snapshot, terrain, memory, 0), { x: 0, y: -1 });
    const detour = roadWalkDirection(snapshot, terrain, memory, 1300);
    assert.equal(Math.abs(detour.x), 1, 'after no movement, try crossing the obstruction');
    assert.deepEqual(roadWalkDirection(snapshot, terrain, memory, 1800), detour, 'keep the detour long enough to clear cover');
    assert.deepEqual(roadWalkDirection(snapshot, terrain, memory, 2400), { x: 0, y: -1 }, 'then resume the C# road');
});

test('a hunter far outside the road corridor first returns to the accessible centreline', () => {
    const terrain = grid(20, 60);
    terrain.road = Array.from({ length: 50 }, (_, row) => [10 * 16 + 8, (59 - row) * 16 + 8]).flat();
    const displaced = at(19 * 32 - 16, 58 * 32 + 16);
    const heading = roadWalkDirection(displaced, terrain);
    assert.ok(heading.x < -.9, 'return toward the road before attempting the next northern segment');
});

test('flow direction refuses lava and steep steps and reports an unreachable target', () => {
    const lavaRow = grid(5, 5, () => 0, (_, row) => (row === 2 ? 3 : 0));
    assert.equal(flowDirection(lavaRow, { x: 16, y: 4 * 32 + 16 }, { x: 16, y: 16 }), null, 'a lava river with no crossing');
    const cliff = grid(5, 5, (_, row) => (row < 2 ? 24 : 0));
    assert.equal(flowDirection(cliff, { x: 16, y: 4 * 32 + 16 }, { x: 16, y: 16 }), null, 'a 3 m cliff cannot be climbed');
    const ramp = grid(5, 5, (_, row) => Math.max(0, (4 - row) * 4));
    assert.notEqual(flowDirection(ramp, { x: 16, y: 4 * 32 + 16 }, { x: 16, y: 16 }), null, 'half-metre steps can');
});

test('with terrain the exit walk follows the flow field instead of a pinned straight line', () => {
    const terrain = grid(5, 7, (column, row) => (row === 3 && column !== 4 ? 16 : 0));
    const move = botMovement(at(16, 5 * 32 + 16, { exit: { x: 16, y: 16 } }), createBotMemory(), 0, terrain);
    assert.ok(move.x > 0.9);
});

test('after the Wyrm falls the bot walks into the extraction zone and stays there', () => {
    const memory = createBotMemory();
    const snapshot = at(100, 900, { extraction: { x: 100, y: 300, radius: 80 }, enemies: [{ x: 700, y: 900 }] });
    assert.deepEqual(botMovement(snapshot, memory, 0), { x: 0, y: -1 });
    assert.deepEqual(botMovement(at(100, 302, { extraction: { x: 100, y: 300, radius: 80 } }), memory, 5), { x: 0, y: 0 });
});

test('a foe that survives in range for a few seconds makes the bot close in', () => {
    const memory = createBotMemory();
    const covered = at(512, 960, { enemies: [{ x: 512, y: 860 }] });
    assert.deepEqual(botMovement(covered, memory, 0), { x: 0, y: 0 }, 'in range: hold and shoot');
    assert.deepEqual(botMovement(covered, memory, 3000), { x: 0, y: 0 }, 'still holding');
    assert.deepEqual(botMovement(covered, memory, 4500), { x: 0, y: -1 }, 'after four seconds close the gap');
    assert.deepEqual(botMovement(at(512, 940, { enemies: [{ x: 512, y: 860 }] }), memory, 4600), { x: 0, y: -1 },
        'continue closing after moving inside the old firing range');
    assert.deepEqual(botMovement(at(512, 850, { enemies: [{ x: 512, y: 860 }] }), memory, 4700), { x: 0, y: 1 },
        'cover inside 60 units cannot leave the bot permanently stationary');
    assert.deepEqual(botMovement(at(512, 960), memory, 4800), botKiteDirection(at(512, 960)), 'no foe: the hold timer resets');
    assert.equal(memory.holdSince, null);
    assert.equal(memory.huntClosing, false);
});

test('the closing bot sidesteps if collision keeps it pinned while pursuing the final enemy', () => {
    const memory = createBotMemory();
    const enemy = [{ x: 512, y: 300 }];
    const pinned = at(512, 960, { enemies: enemy });
    // A ranged target starts outside the holding distance; test the cover-triggered closing path first.
    botMovement(at(512, 960, { enemies: [{ x: 512, y: 860 }] }), memory, 0);
    botMovement(at(512, 960, { enemies: [{ x: 512, y: 860 }] }), memory, 4500);
    assert.deepEqual(botMovement(pinned, memory, 4600), { x: 0, y: -1 });
    const detour = botMovement(pinned, memory, 5800);
    assert.equal(Math.abs(detour.x), 1, 'after no progress, try walking across the obstruction');
    assert.equal(Math.abs(detour.y), 0);
    assert.deepEqual(botMovement(pinned, memory, 6300), detour, 'hold the sidestep long enough to escape cover');
    assert.deepEqual(botMovement(pinned, memory, 6600), { x: 0, y: -1 }, 'then resume the terrain route');
});

test('the opened exit clears hunt pursuit and its detour before extraction begins', () => {
    const memory = createBotMemory();
    const covered = at(512, 960, { enemies: [{ x: 512, y: 860 }] });
    botMovement(covered, memory, 0);
    botMovement(covered, memory, 4500);
    botMovement(covered, memory, 5800);
    assert.equal(memory.huntClosing, true);
    assert.ok(memory.detourUntil > 5800);
    assert.deepEqual(botMovement(at(512, 960, { exit: { x: 512, y: 300 } }), memory, 5900), { x: 0, y: -1 });
    assert.equal(memory.huntClosing, false);
    assert.equal(memory.detourUntil, 0);
});

test('solid props block the flow field and the bot routes around them', () => {
    const open = grid(7, 7);
    const barrel = { x: 3 * 32 + 16, y: 3 * 32 + 16, radius: 16 };
    const straight = flowDirection(open, { x: 3 * 32 + 16, y: 6 * 32 + 16 }, { x: 3 * 32 + 16, y: 16 }, []);
    assert.deepEqual(straight, { x: 0, y: -1 });
    const around = flowDirection(open, { x: 3 * 32 + 16, y: 6 * 32 + 16 }, { x: 3 * 32 + 16, y: 16 }, [barrel]);
    assert.ok(around, 'still reachable around one barrel');
    const wall = Array.from({ length: 7 }, (_, column) => ({ x: column * 32 + 16, y: 3 * 32 + 16, radius: 16 }));
    assert.equal(flowDirection(open, { x: 3 * 32 + 16, y: 6 * 32 + 16 }, { x: 3 * 32 + 16, y: 16 }, wall), null, 'a full row of props closes the way');
    const snapshot = at(3 * 32 + 16, 6 * 32 + 16, { exit: { x: 3 * 32 + 16, y: 16 }, environment: { props: [barrel] } });
    assert.ok(botMovement(snapshot, createBotMemory(), 0, open), 'the bot uses the props from the snapshot');
});

test('the bright inspection light only lifts the ambient term and only on request', () => {
    const night = { lights: [{ id: 'a' }], environment: { ambient: 0.24, color: '#8c9cbb', exposure: 1 } };
    assert.equal(withDebugAmbient(night, false), night, 'off: the very same frame');
    const lit = withDebugAmbient(night, true);
    assert.equal(lit.environment.ambient, DEBUG_BRIGHT_AMBIENT);
    assert.equal(lit.environment.color, DEBUG_BRIGHT_COLOR, 'a neutral moon colour so ground hues stay readable');
    assert.equal(lit.lights, night.lights, 'lights are untouched');
    assert.equal(night.environment.ambient, 0.24, 'the C# frame is never mutated');
    const already = withDebugAmbient({ environment: { ambient: 50 } }, true);
    assert.equal(already.environment.ambient, 50, 'never dims a brighter frame');
    assert.equal(withDebugAmbient(null, true), null);
    assert.equal(readArenaDebugFlags('?bright=1').bright, true);
    assert.equal(readArenaDebugFlags('?bright=yes').bright, false);
    assert.equal(readArenaDebugFlags('?shear=1').shear, true);
    assert.equal(readArenaDebugFlags('?shear=true').shear, false);
});
