import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_DEBUG_SPEED, botHuntDirection, flowDirection, botKiteDirection, botMovement, createBotMemory, readArenaDebugFlags,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-debug.js';

const world = { width: 1024, height: 1920 };
const at = (x, y, extra = {}) => ({ player: { x, y }, world, enemies: [], paused: false, ended: false, exit: null, ...extra });

test('debug flags are off by default and clamp the speed', () => {
    assert.deepEqual(readArenaDebugFlags(''), { speed: 1, god: false, bot: false });
    assert.deepEqual(readArenaDebugFlags('?speed=8&god=1&bot=1'), { speed: 8, god: true, bot: true });
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
    assert.deepEqual(botMovement(at(512, 960), memory, 4600), botKiteDirection(at(512, 960)), 'no foe: the hold timer resets');
    assert.equal(memory.holdSince, null);
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
