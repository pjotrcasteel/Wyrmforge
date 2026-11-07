import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameSampler, readHeapMegabytes, perfReport, perfLines, LONG_FRAME_MS } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-perf.js';

test('the sampler reports percentiles, long frames and ignores pauses', () => {
    const sampler = createFrameSampler();
    for (let i = 0; i < 95; i++) sampler.record(16);
    for (let i = 0; i < 5; i++) sampler.record(40);
    sampler.record(5000); sampler.record(0); sampler.record(NaN);
    const summary = sampler.summary();
    assert.equal(summary.samples, 100);
    assert.equal(summary.p50, 16);
    assert.equal(summary.p95, 16);
    assert.equal(summary.p99, 40);
    assert.equal(summary.max, 40);
    assert.equal(summary.longFrames, 5);
    assert.ok(40 > LONG_FRAME_MS);
    assert.ok(Math.abs(summary.fps - 100 * 1000 / (95 * 16 + 5 * 40)) < 1e-9);
});

test('the sampler stays bounded but remembers the worst frame of the session', () => {
    const sampler = createFrameSampler(10);
    sampler.record(90);
    for (let i = 0; i < 50; i++) sampler.record(16);
    const summary = sampler.summary();
    assert.equal(summary.samples, 10);
    assert.equal(summary.max, 90);
    assert.equal(createFrameSampler().summary().samples, 0);
});

test('heap is reported only where the browser exposes it', () => {
    assert.equal(readHeapMegabytes({}), null);
    assert.equal(readHeapMegabytes({ memory: { usedJSHeapSize: 52428800 } }), 50);
});

test('the report and panel lines carry the renderer, terrain repaint cost and an honest missing heap', () => {
    const sampler = createFrameSampler();
    sampler.record(16);
    const report = perfReport({ sampler, renderer: 'gpu', quality: 'mobile', heapMb: null, devicePixelRatio: 3,
        terrain: { repaints: 4, totalRepaintMs: 20, maxRepaintMs: 9.26 }, enemies: 7, projectiles: 2 });
    assert.equal(report.terrainRepaintAvgMs, 5);
    assert.equal(report.terrainRepaintMaxMs, 9.3);
    assert.equal(report.heapMb, null);
    const lines = perfLines(report);
    assert.equal(lines.length, 5);
    assert.match(lines[4], /GPU - tex/);
    assert.match(lines[1], /gpu\/mobile/);
    assert.match(lines[3], /heap n\/a/);
});

test('performance readout shows GPU upload cost separately from the authoritative enemy count', () => {
    const sampler = createFrameSampler();
    sampler.record(20);
    const report = perfReport({ sampler, renderer: 'gpu', quality: 'mobile', heapMb: null,
        terrain: null, enemies: 600, projectiles: 2, gpuVisibleEnemies: 48,
        gpuUploads: { dynamicTextures: 50, dynamicPixels: 1320000 }, gpuReusedEnemies: 30 });
    assert.equal(report.enemies, 600, 'the authoritative simulation still owns every enemy');
    assert.equal(report.gpuVisibleEnemies, 48, 'visible GPU captures are counted separately');
    assert.equal(report.gpuUploadTextures, 50);
    assert.equal(report.gpuUploadPixels, 1320000);
    assert.equal(report.gpuReusedEnemies, 30, 'cache hits are measured independently of total enemies');
    assert.ok(perfLines(report)[4].includes('GPU 50 tex  1320000 px  visible 48/600  reused 30'));
});
