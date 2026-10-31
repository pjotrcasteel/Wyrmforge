// Summarize genuine Hunt screenshots/diagnostics from browser GPU proof.
// This tool never modifies gameplay, lighting, assets or acceptance thresholds.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function formatGpuEvidenceReport(records, reviewRecords = []) {
    const sorted = [...records].sort((a, b) =>
        a.width - b.width || a.quality.localeCompare(b.quality));
    const lines = [
        '# Real-Hunt GPU lighting — browser review',
        '',
        'These screenshots are from the executable game at native browser viewport sizes, not AI-generated art.',
        'The full Hunt shows context; the **light-focus** crop shows the actual illuminated ground and actors.',
        '',
        '| Viewport | Quality | Browser FPS (sample) | Submission CPU mean | Dynamic textures | Dynamic pixels/frame | Shadow map | Objects |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ];
    for (const record of sorted) {
        const gpu = record.diagnostics.gpuWorld ?? {};
        const up = gpu.textureUploads ?? {};
        const cpu = gpu.submissionCpu ?? {};
        const fmt = n => Number.isFinite(n) ? n.toLocaleString('en-US') : 'n/a';
        lines.push(`| ${record.width}px | ${record.quality} | ${fmt(record.diagnostics.performance?.fps)} | ${Number.isFinite(cpu.meanMs) ? cpu.meanMs.toFixed(1) + ' ms' : 'n/a'} | ${fmt(up.dynamicTextures)} | ${fmt(up.dynamicPixels)} | ${fmt(gpu.budgets?.shadowMapSize)} | ${fmt(gpu.objects)} |`);
    }
    lines.push('', '## What the images show', '');
    for (const record of sorted) {
        const name = `${record.width}-${record.quality}`;
        lines.push(`### ${record.width}px — ${record.quality}`, '',
            `![Genuine Hunt ${name}](live-hunt-shared-gpu-${name}.png)`, '',
            `![Unmodified center crop ${name}](live-hunt-light-focus-${name}.png)`, '');
        const largest = record.diagnostics.gpuWorld?.largestDynamicUploads ?? [];
        if (largest.length) {
            lines.push('**Largest per-frame texture uploads** (GPU resource IDs, not game-engine categories):', '');
            for (const surface of largest)
                lines.push(`- \`${surface.id}\`: ${surface.width} × ${surface.height} = ${surface.pixels.toLocaleString('en-US')} pixels`);
            lines.push('');
        }
    }
    if (reviewRecords.length) {
        lines.push('## Exact G4 phone-review terrain modes', '',
            'These screenshots come from the **actual g4Review=1 Hunt URL**, not the ordinary painted GPU smoke test.',
            'The default neutral-grey mode and explicitly requested painted A/B are distinct: a green nonblack pixel check is not visual approval.',
            '',
            '| Viewport | Terrain mode | Submission CPU mean | Dynamic pixels/frame |',
            '| --- | --- | ---: | ---: |');
        for (const record of [...reviewRecords].sort((a, b) => a.width - b.width ||
            a.terrain.localeCompare(b.terrain))) {
            const gpu = record.diagnostics.gpuWorld ?? {};
            const cpu = gpu.submissionCpu?.meanMs;
            const pixels = gpu.textureUploads?.dynamicPixels;
            lines.push(`| ${record.width}px | ${record.terrain} | ${Number.isFinite(cpu) ? cpu.toFixed(1) + ' ms' : 'n/a'} | ${Number.isFinite(pixels) ? pixels.toLocaleString('en-US') : 'n/a'} |`);
        }
        lines.push('');
        for (const record of [...reviewRecords].sort((a, b) => a.width - b.width ||
            a.terrain.localeCompare(b.terrain))) {
            lines.push(`### Actual G4 review ${record.width}px — ${record.terrain}`, '',
                `![G4 review ${record.width}px ${record.terrain}](live-g4-review-${record.terrain}-${record.width}-mobile.png)`, '');
        }
    }
    lines.push('## Interpretation and limitations', '',
        '- Black space beyond the light radius is expected in the current Gothic-night lighting setup, but this is **not** visual-quality approval.',
        '- Light/shadow response and framebuffer zero-light checks are separate from whether the scene is sufficiently readable.',
        '- The CPU number includes JavaScript scene submission, WebGL render calls and Canvas composition; **it is not a measured GPU timestamp**.',
        '- Browser FPS is a short sample from hosted desktop Chromium, not an iOS/Android performance result.',
        '- Different test runs have different combat snapshots; do not claim causal speedups from a single row comparison.',
        '- Neutral-grey-versus-painted phone-review captures may differ in C# scene seed/time; compare rendering modes and upload costs, not causal FPS.',
        '- Source-authoritative projectiles, collision, aiming, AI and animations are outside the Lighting Engine ownership boundary.',
        '');
    return lines.join('\n');
}

async function main(directory) {
    const namesAll = await readdir(directory);
    const names = namesAll.filter(name =>
        /^live-hunt-shared-gpu-\d+-(mobile|balanced)\.json$/.test(name));
    if (!names.length) throw new Error('No genuine Hunt GPU diagnostics were produced');
    const records = [];
    for (const name of names) {
        const match = /^live-hunt-shared-gpu-(\d+)-(mobile|balanced)\.json$/.exec(name);
        const diagnostics = JSON.parse(await readFile(join(directory, name), 'utf8'));
        if (diagnostics.gpuWorld?.quality !== match[2] || diagnostics.renderingFailed)
            throw new Error(`Invalid GPU evidence ${name}`);
        records.push({ width: Number(match[1]), quality: match[2], diagnostics });
    }
    const reviewRecords = [];
    for (const name of namesAll.filter(name =>
        /^live-g4-review-(painted|neutral-grey)-\d+-mobile\.json$/.test(name))) {
        const match = /^live-g4-review-(painted|neutral-grey)-(\d+)-mobile\.json$/.exec(name);
        const diagnostics = JSON.parse(await readFile(join(directory, name), 'utf8'));
        if (diagnostics.terrainPresentation !== match[1] || diagnostics.gpuWorld?.quality !== 'mobile' ||
            diagnostics.renderingFailed)
            throw new Error(`Wrong G4 phone-review terrain/quality mode: ${name}`);
        reviewRecords.push({ width: Number(match[2]), terrain: match[1], diagnostics });
    }
    if (!['painted', 'neutral-grey'].every(mode =>
        reviewRecords.some(record => record.width === 390 && record.terrain === mode)))
        throw new Error('G4 proof must contain both neutral-grey-default and painted-opt-in real 390px Hunts');
    const report = formatGpuEvidenceReport(records, reviewRecords);
    await writeFile(join(directory, 'README-lighting-review.md'), report, 'utf8');
    process.stdout.write(report);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main(process.argv[2] ?? 'artifacts/gpu-proof');
}
