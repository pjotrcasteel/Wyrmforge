// Renders the generated terrain tiles to a PNG sheet for review: node tools/art/terrain-tile-preview.mjs <out.png> [scale] [bands e.g. 0,1] [variants per kind]
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { generateTileSet, TILE, variantFor } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-tiles.js';

const out = process.argv[2] ?? 'terrain-tiles.png';
const scale = Number(process.argv[3] ?? 3);
const bands = (process.argv[4] ?? '0,1,2,3').split(',').map(Number);
const variantCount = Number(process.argv[5] ?? 8);
const kinds = ['grassTop', 'dirtTop', 'stoneTop', 'grassSide', 'dirtSide', 'stoneSide', 'lavaTop', 'lavaSide'];
const gap = 4;
const width = (TILE * 4 + gap * 5) * 1, height = bands.length * (kinds.length * 0 + (TILE + gap) * 6) ;
const sheetW = (variantCount * (TILE + gap) + gap), sheetH = bands.length * (kinds.length * (TILE + gap) + gap);
const pixels = new Uint8Array(sheetW * sheetH * 4).fill(0);
for (let i = 0; i < pixels.length; i += 4) { pixels[i] = 12; pixels[i + 1] = 10; pixels[i + 2] = 14; pixels[i + 3] = 255; }
bands.forEach((band, bandIndex) => {
    const set = generateTileSet(band);
    kinds.forEach((kind, kindIndex) => set[kind].slice(0, variantCount).forEach((tile, variant) => {
        const ox = gap + variant * (TILE + gap), oy = gap + (bandIndex * kinds.length + kindIndex) * (TILE + gap);
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
            const s = (y * TILE + x) * 4, d = ((oy + y) * sheetW + ox + x) * 4;
            pixels.set(tile.data.subarray(s, s + 4), d);
        }
    }));
});
void variantFor; void width; void height;
function crc32(buf) { let c, crc = 0xFFFFFFFF; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
}
function png(w, h, rgba, s) {
    const W = w * s, H = h * s, raw = Buffer.alloc((W * 4 + 1) * H);
    for (let y = 0; y < H; y++) {
        raw[y * (W * 4 + 1)] = 0;
        for (let x = 0; x < W; x++) { const src = ((Math.floor(y / s)) * w + Math.floor(x / s)) * 4, dst = y * (W * 4 + 1) + 1 + x * 4; raw[dst] = rgba[src]; raw[dst + 1] = rgba[src + 1]; raw[dst + 2] = rgba[src + 2]; raw[dst + 3] = 255; }
    }
    const header = Buffer.alloc(13); header.writeUInt32BE(W, 0); header.writeUInt32BE(H, 4); header[8] = 8; header[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync(out, png(sheetW, sheetH, pixels, scale));
console.log(`wrote ${out} ${sheetW * scale}x${sheetH * scale}`);
