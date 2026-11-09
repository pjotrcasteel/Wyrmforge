import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FrameDiagnostics, createBenchmarkReport } from '../diagnostics.mjs';

test('bounded samples and percentile calculations', () => {
  const frames = new FrameDiagnostics(4);
  [10, 20, 30, 40, 50].forEach(value => frames.record(value));
  assert.deepEqual(frames.summary(), {
    sampleCount: 4,
    totalFrames: 5,
    p50Ms: 30,
    p95Ms: 50,
    p99Ms: 50,
    hitches: { over33: 2, over50: 0, over100: 0 },
  });
});

test('invalid intervals are excluded', () => {
  const frames = new FrameDiagnostics();
  [0, -1, NaN, Infinity, 16].forEach(value => frames.record(value));
  assert.equal(frames.summary().sampleCount, 1);
});

test('report schema and caveats are present', () => {
  const report = createBenchmarkReport({
    build: 'test-sha',
    scene: 'flat',
    diagnostics: new FrameDiagnostics(),
    counters: { chunks: 2 },
  });
  assert.equal(report.schema, 'voxel-v2.benchmark.v1');
  assert.equal(report.build, 'test-sha');
  assert.equal(report.frames.p99Ms, null);
  assert.equal(report.counters.chunks, 2);
  assert.ok(report.caveats.length > 0);
});

test('standalone V2 page has no external legacy module or asset dependencies', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const scriptRefs = [...page.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)]
    .map(match => match[1]);
  assert.ok(scriptRefs.every(path => !path.startsWith('../') && !path.startsWith('/')));
  assert.doesNotMatch(page, /\/art\/|\/assets\/|\/scripts\/|\/lib\/|\.\.\/|\/experimental\/voxel\//);
});
