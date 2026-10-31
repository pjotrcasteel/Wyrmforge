import test from 'node:test';
import assert from 'node:assert/strict';
import { drawAr1GeographyReview } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ar1-geography-review.js';

function reviewCanvas() {
    const calls = [];
    const ctx = {
        save() { calls.push('save'); }, restore() { calls.push('restore'); },
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
        rect() {}, clip() {}, translate() {}, scale() {}, arc() {},
        fill() {}, stroke() {}, fillRect() { calls.push('fillRect'); },
        strokeRect(...args) { calls.push(['viewport', ...args]); },
        fillText(text) { calls.push(text); },
    };
    return { ctx, calls };
}

const site = {
    version: 1, siteId: 'fire:fork', regionId: 'fire',
    substrate: { material: 1 },
    corridors: [{ edgeId: 'fork|north', material: 2, width: .09,
        points: [{ x: .5, y: .5 }, { x: .94, y: .06 }] }],
    ports: [{ edgeId: 'fork|north', direction: 'NE', entrance: false, localPoint: { x: .94, y: .06 } }],
    landscape: { kind: 'forest-fork', obstacles: [{ kind: 'tree-root', material: 1, height: .5,
        outline: [{ x: .12, y: .1 }, { x: .2, y: .1 }, { x: .2, y: .19 }] }] },
};

test('AR1 overview is a read-only reuse of the C# semantic site renderer', () => {
    const before = JSON.stringify(site);
    const { ctx, calls } = reviewCanvas();
    const camera = { x: 270, y: 360, width: 950, height: 1550 };
    assert.equal(drawAr1GeographyReview(ctx, site, true, { x: 440, y: 650 }, camera, 390, 844), true);
    assert.ok(calls.includes('AR1 · C# SITE OVERVIEW'));
    assert.ok(calls.filter(call => Array.isArray(call) && call[0] === 'viewport').length >= 2);
    assert.equal(calls.filter(call => call === 'save').length, calls.filter(call => call === 'restore').length);
    assert.equal(JSON.stringify(site), before, 'Rendering must never mutate the C# site contract');
});

test('AR1 review does not draw inactive geometry or unsupported versions', () => {
    const { ctx, calls } = reviewCanvas();
    const camera = { x: 0, y: 0, width: 950, height: 1550 };
    assert.equal(drawAr1GeographyReview(ctx, site, false, { x: 500, y: 600 }, camera, 320, 568), false);
    assert.equal(drawAr1GeographyReview(ctx, { ...site, version: 2 }, true,
        { x: 500, y: 600 }, camera, 320, 568), false);
    assert.equal(calls.length, 0);
});
