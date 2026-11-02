import test from 'node:test';
import assert from 'node:assert/strict';
import {
    AMBIENT_PARTICLE_COUNTS, ASH_COLOR, EMBER_COLOR, ambientParticles, drawAmbientParticles,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ambient-particles.js';

const world = { width: 1024, height: 1920 };

test('density rises with the influence band and Wet Forest has none', () => {
    const counts = [0, 1, 2, 3].map(band => ambientParticles(band, 3, world).length);
    assert.deepEqual(counts, [...AMBIENT_PARTICLE_COUNTS]);
    assert.equal(counts[0], 0);
    assert.ok(counts[1] < counts[2] && counts[2] < counts[3]);
    assert.ok(counts[3] <= 160, 'hard mobile particle cap');
});

test('particles are deterministic for the same band and time', () => {
    assert.deepEqual(ambientParticles(3, 12.5, world), ambientParticles(3, 12.5, world));
});

test('Scorched shows only grey ash; Volcanic is mostly embers', () => {
    assert.ok(ambientParticles(1, 2, world).every(particle => !particle.ember));
    const volcanic = ambientParticles(3, 2, world);
    const share = volcanic.filter(particle => particle.ember).length / volcanic.length;
    assert.ok(share > 0.5 && share < 0.9, `ember share ${share}`);
});

test('particles rise over time and fade in and out', () => {
    const early = ambientParticles(3, 0, world);
    const later = ambientParticles(3, 0.1, world);
    const risen = early.filter((particle, i) => later[i].y < particle.y).length;
    assert.ok(risen > early.length * 0.9, 'almost every particle moves up; the rest are wrapping while fully faded');
    assert.ok(early.every(particle => particle.alpha >= 0 && particle.alpha <= 0.85));
});

test('reduced motion freezes the field', () => {
    assert.deepEqual(ambientParticles(3, 0, world, true), ambientParticles(3, 99, world, true));
});

test('drawing culls to the view, snaps to whole pixels and restores the context', () => {
    const calls = [];
    const ctx = { save() { calls.push('save'); }, restore() { calls.push('restore'); }, globalAlpha: 1, fillStyle: '',
        fillRect(x, y, w, h) { calls.push(['rect', x, y, w, h, this.fillStyle]); } };
    const particles = [
        { x: 10.4, y: 20.6, size: 1, alpha: 0.5, ember: true },
        { x: 5000, y: 20, size: 1, alpha: 0.5, ember: false },
        { x: 12, y: 22, size: 1, alpha: 0, ember: false },
        { x: 30, y: 40, size: 2, alpha: 0.4, ember: false },
    ];
    assert.equal(drawAmbientParticles(ctx, particles, { x: 0, y: 0, width: 100, height: 100 }), 2);
    assert.deepEqual(calls.filter(call => call[0] === 'rect'), [['rect', 10, 21, 1, 1, EMBER_COLOR], ['rect', 30, 40, 2, 2, ASH_COLOR]]);
    assert.equal(calls[0], 'save');
    assert.equal(calls.at(-1), 'restore');
});
