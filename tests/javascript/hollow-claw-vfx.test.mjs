import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/', import.meta.url);
const source = readFileSync(new URL('js/hollow-claw-vfx.js', root), 'utf8')
    .replace("new URL('../art/vfx/hollowed-claw-strict.png', import.meta.url)",
        "new URL('https://example.test/art/vfx/hollowed-claw-strict.png')");
const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const { HOLLOW_CLAW, hollowClawFrame, hollowClawAnchor, preloadHollowClawVfx, drawHollowClawVfx } = mod;
const attack = (values = {}) => ({ clip: 'attack', age: 0.52, attackAt: 0, direction: 'E', ...values });

test('claw trail exists only during the current authored attack release window', () => {
    assert.equal(hollowClawFrame(attack({ age: 0.35 })), -1);
    assert.equal(hollowClawFrame(attack({ clip: 'walk' })), -1);
    assert.equal(hollowClawFrame(attack({ attackAt: null })), -1);
    assert.equal(hollowClawFrame(attack({ age: 0.77 })), -1);
    assert.ok(hollowClawFrame(attack()) >= 0);
    assert.equal(hollowClawFrame(attack({ direction: 'invalid' })), -1);
});

test('animation advances deterministically and supports all eight authentic facings', () => {
    for (const direction of ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']) {
        assert.equal(hollowClawFrame(attack({ direction, age: 0.47 })), 0);
        assert.equal(hollowClawFrame(attack({ direction, age: 0.76 })), 11);
    }
    assert.equal(hollowClawFrame(attack({ age: 0.4, attackAt: 0.4 })), -1);
    assert.equal(hollowClawFrame(attack({ age: 0.52, attackAt: 0.2 })), -1);
});

test('claw follows the authored wrist forward and down through strike frames 6–8', () => {
    const enemy = { kind: 0, entityId: 9, x: 100, y: 150, radius: 11 };
    const attack = age => ({ clip: 'attack', age, attackAt: 0, direction: 'E', visualScale: 1 });
    const windup = hollowClawAnchor(enemy, attack(5.5 / 12));
    const release = hollowClawAnchor(enemy, attack(7 / 12));
    const follow = hollowClawAnchor(enemy, attack(8 / 12));
    assert.ok(release.x > windup.x, 'the moving claw must reach forward before impact');
    assert.ok(follow.y > release.y, 'the strike must descend with the actual hand');
    assert.ok(follow.y > enemy.y - enemy.radius * 3.65, 'it cannot remain at the old high anchor');
    for (const direction of ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']) {
        const position = hollowClawAnchor(enemy, { ...attack(8 / 12), direction });
        assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
    }
    const west = hollowClawAnchor(enemy, { ...attack(8 / 12), direction: 'W' });
    assert.ok(west.x < enemy.x, 'west-facing attack must remain in front of its actor');
    assert.equal(hollowClawAnchor(enemy, { ...attack(8 / 12), attackAt: null }), null);
    assert.deepEqual(enemy, { kind: 0, entityId: 9, x: 100, y: 150, radius: 11 });
});

test('reduced motion renders one brief static slash rather than animating', () => {
    assert.equal(hollowClawFrame(attack({ age: 0.46 }), true), -1);
    assert.equal(hollowClawFrame(attack({ age: 0.50 }), true), 4);
    assert.equal(hollowClawFrame(attack({ age: 0.55 }), true), -1);
});

test('the lightweight source-derived atlas has validated dimensions and bytes', () => {
    const png = readFileSync(new URL('art/vfx/hollowed-claw-strict.png', root));
    assert.equal(png.readUInt32BE(16), HOLLOW_CLAW.cell * 8);
    assert.equal(png.readUInt32BE(20), HOLLOW_CLAW.cell * 2);
    assert.equal(createHash('sha256').update(png).digest('hex'),
        'c733c0fd70952ed5597bbc7f91a98876ff31aec634931bdbfc3f530786a0098e');
    assert.ok(png.length < 8192);
});

test('drawing uses nearest-neighbour, the projected actor anchor and no gameplay changes', async () => {
    const oldImage = globalThis.Image;
    globalThis.Image = class {
        set src(_) { this.naturalWidth = 56 * 8; this.naturalHeight = 56 * 2; queueMicrotask(() => this.onload()); }
    };
    try {
        assert.equal(await preloadHollowClawVfx(), true);
        const actor = { kind: 0, entityId: 9, x: 100, y: 150, radius: 11 };
        const pose = attack({ direction: 'N' });
        const state = { entities: new Map([[9, pose]]) };
        const calls = [];
        const ctx = { save() {}, restore() {}, translate(...args) { calls.push(['translate', ...args]); },
            rotate(angle) { calls.push(['rotate', angle]); }, drawImage(...args) { calls.push(['drawImage', ...args]); } };
        assert.equal(drawHollowClawVfx(ctx, actor, state), true);
        assert.equal(ctx.imageSmoothingEnabled, false);
        assert.equal(calls.filter(x => x[0] === 'drawImage').length, 1);
        assert.ok(calls.find(x => x[0] === 'translate')[2] < actor.y);
        assert.deepEqual(actor, { kind: 0, entityId: 9, x: 100, y: 150, radius: 11 });
        assert.equal(drawHollowClawVfx(ctx, { ...actor, kind: 1 }, state), false);
        assert.equal(drawHollowClawVfx(ctx, actor, { entities: new Map() }), false);
    } finally { globalThis.Image = oldImage; }
});
