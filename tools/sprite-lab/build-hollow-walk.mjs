// Packing/registration only: never synthesizes poses, mirrors art, or scales individual frames.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { decodePng, encodePng } from '../art/lib/png.mjs';
const require = createRequire(import.meta.url);
const C = require('../../src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/src/lab-core.js');
const root = path.resolve(import.meta.dirname, '../..');
const source = 'art/source/enemies/hollow/walk/hollow-walk-v1-rejected.png';
const output = 'src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/assets/hollow-walk-v1.png';
const image = decodePng(fs.readFileSync(path.join(root, source)));
if (image.width !== 1254 || image.height !== 1254) throw new Error('Unexpected source; review crop coordinates.');
const size = 192, width = size * 8, rgba = new Uint8Array(width * width * 4);
// Reviewed gaps between authored rows; avoids cutting the NW skull at the nominal regular-grid boundary.
const rowCuts = [0, 160, 320, 474, 632, 788, 944, 1093, 1254];
const frames = [];
for (let row = 0; row < 8; row++) {
    const cells = [];
    for (let col = 0; col < 8; col++) {
        const x0 = Math.round(col * image.width / 8), x1 = Math.round((col + 1) * image.width / 8);
        const y0 = rowCuts[row], y1 = rowCuts[row + 1];
        let top = y1, bottom = y0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            if (image.rgba[(y * image.width + x) * 4 + 3] > 128) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
        }
        // Register the pelvis, not the changing silhouette (hands and swinging feet).
        let totalX = 0, count = 0;
        for (let y = Math.round(top + (bottom - top) * .48); y < top + (bottom - top) * .60; y++) {
            for (let x = x0; x < x1; x++) if (image.rgba[(y * image.width + x) * 4 + 3] > 128) { totalX += x - x0; count++; }
        }
        cells.push({ row, col, x0, x1, y0, y1, top, bottom, pelvisX: totalX / count });
    }
    const baseline = cells.reduce((sum, f) => sum + f.bottom - f.y0, 0) / 8;
    for (const f of cells) {
        const dx = Math.round(size / 2 - f.pelvisX), dy = Math.round(166 - baseline);
        for (let y = f.y0; y < f.y1; y++) for (let x = f.x0; x < f.x1; x++) {
            const tx = x - f.x0 + dx, ty = y - f.y0 + dy;
            if (tx < 0 || tx >= size || ty < 0 || ty >= size) throw new Error('Packing overflow');
            const from = (y * image.width + x) * 4, to = ((row * size + ty) * width + f.col * size + tx) * 4;
            rgba.set(image.rgba.subarray(from, from + 4), to);
        }
        frames.push({ direction: C.DIRECTIONS[row], frame: f.col, sourceRect: [f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0], translation: [dx, dy] });
    }
}
fs.writeFileSync(path.join(root, output), encodePng(width, width, rgba));
const cfg = { ...C.DEFAULT_CONFIG, layout: 'eight', rows: 8, cellWidth: size, cellHeight: size, fps: 8 };
const checks = C.validate(width, width, cfg, { width, height: width, data: rgba });
const manifest = { ...C.manifest(cfg, 'hollow-walk-v1.png', width, width),
    pivot: { x: .5, y: 166 / size }, status: 'candidate', visualAccepted: false,
    source, processing: 'Integer translation and equal-cell packing only; no resampling, pose synthesis or mirroring.',
    review: 'Inspect alternating leg support, cloth consistency and loop seam. Format checks do not establish motion quality.', frames };
fs.writeFileSync(path.join(root, output.replace('.png', '.manifest.json')), JSON.stringify(manifest, null, 2) + '\n');
const report = { source, output, ready: false, technicalPass: checks.every(c => c.severity === 'pass'),
    visualAccepted: false, checks, outstanding: ['Human motion/style review at gameplay scale', 'Physical iPhone Safari review', 'Runtime adapter is outside this art review'] };
fs.writeFileSync(path.join(root, output.replace('.png', '.qa.json')), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
