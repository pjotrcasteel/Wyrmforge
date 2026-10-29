import test from 'node:test';
import assert from 'node:assert/strict';
import { formatGpuEvidenceReport } from './hunt-gpu-evidence-report.mjs';

test('genuine lighting evidence keeps mobile/balanced measurements labeled and limitations visible', () => {
    const evidence = [
        { width: 390, quality: 'balanced', diagnostics: {
            performance: { fps: 9 },
            gpuWorld: { quality: 'balanced', objects: 16,
                budgets: { shadowMapSize: 512 }, textureUploads: { dynamicTextures: 15, dynamicPixels: 1511150 },
                submissionCpu: { meanMs: 39.83 } },
        } },
        { width: 390, quality: 'mobile', diagnostics: {
            performance: { fps: 26 }, gpuWorld: { quality: 'mobile', objects: 14,
                budgets: { shadowMapSize: 256 }, textureUploads: { dynamicTextures: 11, dynamicPixels: 900000 },
                submissionCpu: { meanMs: 25.34 } },
        } },
    ];
    const inputCopy = structuredClone(evidence);
    const report = formatGpuEvidenceReport(evidence);
    assert.match(report, /\| 390px \| balanced \| 9 \| 39\.8 ms \| 15 \| 1,511,150 \| 512 \| 16 \|/);
    assert.match(report, /\| 390px \| mobile \| 26 \| 25\.3 ms \| 11 \| 900,000 \| 256 \| 14 \|/);
    assert.match(report, /live-hunt-light-focus-390-mobile\.png/);
    assert.match(report, /live-hunt-shared-gpu-390-balanced\.png/);
    assert.match(report, /not a measured GPU timestamp/);
    assert.match(report, /not an iOS\/Android performance result/);
    assert.match(report, /do not claim causal speedups/);
    assert.deepEqual(evidence, inputCopy, 'Evidence formatting never changes measurements or state');
});
