import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerDangerState, updatePlayerDanger, playerDangerPresentation, drawPlayerDanger } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/player-danger.js';

const snapshot = (health, paused = false, maxHealth = 100) => ({ hud: { health, maxHealth }, paused, ended: false });

test('actual damage gives an immediate hit cue and a nearby health ring', () => {
    const state = createPlayerDangerState();
    updatePlayerDanger(state, snapshot(100), 0);
    updatePlayerDanger(state, snapshot(80), 100);
    assert.equal(playerDangerPresentation(state, snapshot(80), 100).hit, true);
    assert.equal(playerDangerPresentation(state, snapshot(80), 500).ring, true);
    assert.equal(playerDangerPresentation(state, snapshot(80), 1100).ring, false);
});

test('35 percent warns, 15 percent escalates, healing clears the warning', () => {
    const state = createPlayerDangerState();
    assert.equal(playerDangerPresentation(state, snapshot(36), 0).level, 0);
    assert.equal(playerDangerPresentation(state, snapshot(35), 0).level, 1);
    assert.equal(playerDangerPresentation(state, snapshot(15), 0).level, 2);
    assert.equal(playerDangerPresentation(state, snapshot(70), 0).edgeAlpha, 0);
});

test('continuous contact cannot restart rapid hit flashes', () => {
    const state = createPlayerDangerState();
    updatePlayerDanger(state, snapshot(100), 0);
    updatePlayerDanger(state, snapshot(95), 100);
    for (let i = 1; i <= 10; i++) updatePlayerDanger(state, snapshot(95 - i), 100 + i * 30);
    assert.equal(state.hitUntil, 240);
    assert.equal(playerDangerPresentation(state, snapshot(85), 400).hit, false);
    assert.equal(playerDangerPresentation(state, snapshot(85), 400).ring, true);
});

test('pause, death, healing and maximum-health changes do not create false hurt cues', () => {
    for (const next of [snapshot(80, true), snapshot(124, false, 124), snapshot(80, false, 80), { ...snapshot(0), ended: true }]) {
        const state = createPlayerDangerState();
        updatePlayerDanger(state, snapshot(100), 0);
        updatePlayerDanger(state, next, 100);
        assert.equal(playerDangerPresentation(state, next, 100).hit, false);
    }
    assert.equal(playerDangerPresentation(createPlayerDangerState(), snapshot(10, true), 100).ring, false);
});

test('reduced motion keeps critical cues static and edge tint leaves the centre clear', () => {
    const state = createPlayerDangerState();
    const first = playerDangerPresentation(state, snapshot(10), 0, true);
    const second = playerDangerPresentation(state, snapshot(10), 1000, true);
    assert.equal(first.pulse, second.pulse);
    const rectangles = [];
    const ctx = { save() {}, restore() {}, createLinearGradient() { return { addColorStop() {} }; },
        fillRect(...args) { rectangles.push(args); }, beginPath() {}, arc() {}, stroke() {}, setLineDash() {} };
    drawPlayerDanger(ctx, { x: 160, y: 284, radius: 12 }, first, 320, 568);
    assert.equal(rectangles.length, 4);
    assert.ok(rectangles.every(([x, y, w, h]) => !(160 > x && 160 < x + w && 284 > y && 284 < y + h)));
});
