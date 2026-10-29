import test from 'node:test';
import assert from 'node:assert/strict';
import { G4DeviceReviewSession } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/g4-device-review.js';

test('device review measures real animation-frame intervals and freezes when stopped', () => {
    const session = new G4DeviceReviewSession('canvas');
    session.start(1000);
    session.record(1000);
    session.record(1016);
    session.record(1032);
    session.record(1066);
    session.stop(1100);
    const before = session.summary(40000);
    assert.equal(before.frameIntervals, 3);
    assert.equal(before.frameMsP50, 16);
    assert.equal(before.frameMsP95, 34);
    assert.equal(before.frameMsP99, 34);
    assert.equal(before.elapsedSeconds, .1, 'Exporting later must not keep extending a stopped session');
    assert.equal(before.playedMs, undefined, 'The device report exposes only explicit contract fields');
    assert.equal(before.over33msPercent, 33.33);
    session.record(2000);
    assert.deepEqual(session.summary(100000), before, 'Stopped sessions cannot accrue phantom frames');
    assert.deepEqual(session.report(50000).limitations.length, 5);
});

test('paused periods, bad frames and missing GPU renderer remain visible in evidence', () => {
    const session = new G4DeviceReviewSession('gpu', 'mobile');
    session.start(0);
    session.record(0, { gpuAvailable: false });
    session.record(16, { renderingFailed: true, gpuAvailable: false });
    session.record(1000, { playing: false, gpuAvailable: false });
    session.record(2000, { gpuAvailable: false });
    session.record(2016, { gpuAvailable: true });
    session.stop(2500);
    const summary = session.summary();
    assert.equal(summary.frameIntervals, 2, 'Pausing breaks the previous frame interval');
    assert.equal(summary.pausedFrames, 1);
    assert.equal(summary.renderingFailures, 1);
    assert.equal(summary.missingGpuFrames, 4,
        'GPU fallback must be visible instead of silently reporting Canvas as G4 success');
    assert.equal(summary.mode, 'gpu');
    assert.equal(summary.quality, 'mobile');
    assert.ok(summary.frameMsP99 <= 16);
});

test('GPU diagnostics are sampled once per second, not on each animation frame', () => {
    const session = new G4DeviceReviewSession('gpu', 'balanced');
    let invocations = 0;
    const getGpu = () => {
        invocations++;
        return { submissionCpu: { meanMs: 3.25 }, textureUploads: {
            dynamicPixels: invocations * 1000, dynamicTextures: invocations,
        }, lights: [{ id: 'source' }], budgets: { shadowMapSize: 512 } };
    };
    session.start(0);
    for (let i = 0; i < 180; i++) session.record(i * (1000 / 60), { gpuAvailable: true, getGpu });
    session.stop(3000);
    assert.equal(invocations, 3);
    const summary = session.summary();
    assert.equal(summary.gpuSamples, 3);
    assert.equal(summary.sampledDynamicPixelsMean, 2000);
    const report = session.report(100000, { viewport: { width: 390, height: 844 } });
    assert.equal(report.samples.length, 3);
    assert.equal(report.samples[0].cpuSubmissionMeanMs, 3.25);
    assert.equal(report.samples[2].shadowMapSize, 512);
    assert.deepEqual(report.device.viewport, { width: 390, height: 844 });
    assert.equal(report.schema, 'wyrmforge.g4-device-review.v1');
    assert.equal(report.elapsedSeconds, 3);
});

test('device review is bounded, reject invalid timestamps, restart resets all samples', () => {
    assert.throws(() => new G4DeviceReviewSession('new-renderer'), RangeError);
    const session = new G4DeviceReviewSession('gpu', 'mobile');
    assert.throws(() => session.start(NaN), TypeError);
    session.start(100);
    assert.throws(() => session.record(Infinity), TypeError);
    session.record(100, { gpuAvailable: false });
    session.record(600100, { gpuAvailable: true });
    assert.equal(session.recording, false);
    assert.equal(session.summary().missingGpuFrames, 1);
    session.start(500000);
    assert.equal(session.summary().missingGpuFrames, 0);
    assert.equal(session.summary().frameIntervals, 0);
    assert.throws(() => session.stop(499999), TypeError);
    session.stop(500100);
});

test('minute-by-minute pacing captures later slowdowns without pretending to read device temperature', () => {
    const session = new G4DeviceReviewSession('canvas');
    session.start(0);
    session.record(0);
    session.record(16);
    session.record(60000);
    session.record(60050);
    session.stop(60100);
    const report = session.report();
    assert.deepEqual(report.framePacingByMinute.map(window => window.minute), [1, 2]);
    assert.deepEqual(report.framePacingByMinute.map(window => window.frameMsP95), [16, 50]);
    assert.ok(report.framePacingByMinute[1].observedFps < report.framePacingByMinute[0].observedFps);
    assert.ok(report.limitations.some(note => note.includes('thermal throttling')));
});

test('G4 reviewer only attaches to optional real Hunt integration and not default rendering', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(source, /params\.get\('g4Review'\) === '1'/);
    assert.match(source, /mountG4DeviceReview\(canvas/);
    assert.match(source, /state\.g4Review\?\.dispose\(\)/);
    assert.match(source, /state\.g4Review\?\.record\(timestamp/);
    assert.match(source, /state\.g4Review = mountG4DeviceReview/);
    assert.doesNotMatch(source, /new G4DeviceReviewSession\(/,
        'All report policy belongs to the reusable reviewer, not the gameplay loop');
});
