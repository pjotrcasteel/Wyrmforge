import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { drawView } from './render.mjs';
const { createCanvas } = createRequire(import.meta.url)('@napi-rs/canvas');
const root = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(root, process.argv[3] || 'cleaned-motion.json'), 'utf8'));
const output = process.argv[2];
if (!output) throw new Error('Pass a scratch output directory for PNG frames');
mkdirSync(output, { recursive: true });
for (let i = 0; i < data.frames.length; i++) {
    const canvas = createCanvas(720, 360), ctx = canvas.getContext('2d');
    for (const [x, yaw, pitch, label] of [[0, 90, 8, 'Side view'], [360, 45, 25, 'Game view']])
        drawView(ctx, data, i / data.frames.length, { x, y: 0, width: 360, height: 335, yaw, pitch, label, travel: false });
    ctx.fillStyle = '#111b1a'; ctx.fillRect(0, 335, 720, 25);
    ctx.fillStyle = '#a8b9ad'; ctx.font = '12px sans-serif';
    ctx.fillText(`CMU 07/01 · ${data.frames.length} frames · ${data.duration.toFixed(3)} s/stride · in-place motion reference`, 16, 352);
    writeFileSync(path.join(output, `frame-${String(i).padStart(3, '0')}.png`), canvas.toBuffer('image/png'));
}
console.log(`Rendered ${data.frames.length} frames`);
