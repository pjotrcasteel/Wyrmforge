import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    DAMAGE_NUMBER_STORAGE_KEY, normalizeDamageNumberMode, loadDamageNumberMode, saveDamageNumberMode,
    presentDamageNumber, drawDamageNumbers,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-damage-numbers.js';

const hit = (overrides = {}) => ({
    sequence: 11, x: 320, y: 420, amount: 24, school: 'Fire', progress: 0.2,
    finisher: false, empowered: false, periodic: false, ...overrides,
});

test('damage settings default to full, tolerate blocked storage, and persist explicit modes', () => {
    const saved = new Map();
    const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
    assert.equal(normalizeDamageNumberMode('unknown'), 'full');
    assert.equal(loadDamageNumberMode(storage), 'full');
    saveDamageNumberMode(storage, 'minimal');
    assert.equal(saved.get(DAMAGE_NUMBER_STORAGE_KEY), 'minimal');
    assert.equal(loadDamageNumberMode(storage), 'minimal');
    saveDamageNumberMode(storage, 'off');
    assert.equal(loadDamageNumberMode(storage), 'off');
    const forbidden = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
    assert.equal(loadDamageNumberMode(forbidden), 'full');
    assert.doesNotThrow(() => saveDamageNumberMode(forbidden, 'full'));
});

test('only real positive finite health loss produces a number', () => {
    assert.equal(presentDamageNumber(hit({ amount: 0 })), null);
    assert.equal(presentDamageNumber(hit({ amount: -5 })), null);
    assert.equal(presentDamageNumber(hit({ amount: Infinity })), null);
    assert.equal(presentDamageNumber(hit({ x: NaN })), null);
    assert.equal(presentDamageNumber(hit(), 'off'), null);
    assert.equal(presentDamageNumber(hit({ periodic: true }), 'minimal'), null);
    assert.equal(presentDamageNumber(hit()).text, '24');
    assert.equal(presentDamageNumber(hit({ amount: .25 })).text, '0.25');
    assert.equal(presentDamageNumber(hit({ amount: 1000 })).text, '1,000');
});

test('finishing blows are highlighted, surges amplified, schools distinct, motion accessible', () => {
    const normal = presentDamageNumber(hit(), 'full', true);
    const finishing = presentDamageNumber(hit({ finisher: true }), 'full', true);
    const empowered = presentDamageNumber(hit({ empowered: true }), 'full', true);
    assert.equal(normal.x, 311, 'Reduced motion keeps a stationary lane to avoid number overlap.');
    assert.equal(normal.y, 420);
    assert.equal(finishing.text, '24', 'No arcade punctuation for finishers.');
    assert.ok(finishing.fontSize > normal.fontSize);
    assert.ok(empowered.fontSize > normal.fontSize);
    assert.notEqual(finishing.color, normal.color);
    assert.notEqual(presentDamageNumber(hit({ school: 'Frost' })).color, normal.color);
    assert.notEqual(presentDamageNumber(hit({ school: 'Storm' })).color, normal.color);
    assert.notEqual(presentDamageNumber(hit({ school: 'Arcane' })).color, normal.color);
    assert.notEqual(presentDamageNumber(hit({ school: 'Necromancer' })).color, normal.color);
    assert.notEqual(presentDamageNumber(hit({ school: 'Summoner' })).color, normal.color);
    const moving = presentDamageNumber(hit({ progress: .85 }), 'full', false);
    assert.ok(moving.y < hit().y);
    assert.ok(moving.opacity < 1);
    assert.equal(presentDamageNumber(hit({ progress: 1 })), null);
    assert.ok(presentDamageNumber(hit(), 'minimal').fontSize < normal.fontSize);
});

test('real burning and scorched-ground ticks have different restrained elastic motion', () => {
    const burn = hit({ periodic: true, flavor: 'Burn', school: 'Fire', progress: .15 });
    const scorch = { ...burn, flavor: 'Scorch' };
    const burnView = presentDamageNumber(burn);
    const scorchView = presentDamageNumber(scorch);
    assert.equal(burnView.family, 'burn');
    assert.equal(scorchView.family, 'scorch');
    assert.notEqual(burnView.color, scorchView.color);
    assert.ok(burnView.fontSize < presentDamageNumber(hit()).fontSize);
    assert.notEqual(burnView.y, scorchView.y);
    assert.ok(Math.abs(burnView.x - burn.x) < 35);
    assert.equal(presentDamageNumber(burn, 'minimal'), null);
    assert.equal(presentDamageNumber(burn, 'full', true).y, burn.y);
    assert.equal(presentDamageNumber({ ...burn, finisher: true }).text, '24');
});

test('future periodic schools share the same feedback adapter without faking damage events', () => {
    const frost = presentDamageNumber(hit({ periodic: true, flavor: 'Frost', school: 'Frost' }));
    const storm = presentDamageNumber(hit({ periodic: true, flavor: 'Storm', school: 'Storm' }));
    const necrotic = presentDamageNumber(hit({ periodic: true, flavor: 'Necrotic', school: 'Necromancer' }));
    for (const item of [frost, storm, necrotic]) {
        assert.ok(item.periodic);
        assert.ok(item.fontSize > 0);
        assert.notEqual(item.family, 'impact');
    }
    assert.equal(new Set([frost.color, storm.color, necrotic.color]).size, 3);
    assert.notEqual(frost.y, storm.y);
    assert.notEqual(storm.y, necrotic.y);
});

test('canvas draws once per visible number without compositing lights or leaving global state', () => {
    const calls = [];
    const ctx = {
        save: () => calls.push('save'), restore: () => calls.push('restore'),
        strokeText: (...args) => calls.push(['stroke', ...args]),
        fillText: (...args) => calls.push(['fill', ...args]),
    };
    assert.equal(drawDamageNumbers(ctx, [hit(), hit({ x: 6000 }), hit({ amount: 0 })], 'full', false,
        { x: 0, y: 0, width: 400, height: 500 }), 1);
    assert.equal(calls.filter(call => Array.isArray(call) && call[0] === 'stroke').length, 1);
    assert.equal(calls.filter(call => Array.isArray(call) && call[0] === 'fill').length, 1);
    assert.equal(calls[0], 'save');
    assert.equal(calls.at(-1), 'restore');
    assert.equal(drawDamageNumbers(ctx, [hit()], 'off'), 0);
});

test('the game draws numbers above night lighting but below UI, without modifying animation systems', () => {
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    const draw = arena.indexOf('drawDamageNumbers(ctx, snapshot.damageNumbers');
    const night = arena.indexOf('drawGothicNight(ctx, gothicNightPlan');
    const restore = arena.indexOf('    ctx.restore();\n    const battleActive', night);
    assert.ok(night >= 0 && draw > night && draw < restore);
    assert.match(arena, /damageNumbers: state\.latestSnapshot\?\.damageNumbers/);
    const combat = readFileSync(new URL('../../src/Wyrmforge.Application/Runs/Simulation/Combat/RunSimulation.Combat.cs', import.meta.url), 'utf8');
    const feedback = readFileSync(new URL('../../src/Wyrmforge.Application/Runs/Simulation/Combat/RunSimulation.Feedback.cs', import.meta.url), 'utf8');
    assert.match(combat, /RegisterDamageNumber\(target, Math\.Min\(healthBeforeHit, damage\)/);
    assert.match(feedback, /MaxDamageNumbers = 48/);
    assert.doesNotMatch(feedback, /randomSource\.|Math\.Random/);
});
