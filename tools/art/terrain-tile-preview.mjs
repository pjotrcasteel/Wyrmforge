// Renders the generated terrain textures to a PNG sheet for review: node tools/art/terrain-tile-preview.mjs <out.png> [scale] [band] [kinds comma list]
// Each texture is 256 px (4 m) and wraps; the sheet also tiles the first kind twice across so seams are visible.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { generateTileSet, TEXTURE } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-terrain-tiles.js';

const out = process.argv[2] ?? 'terrain-tiles.png';
const scale = Number(process.argv[3] ?? 1);
const band = Number(process.argv[4] ?? 0);
const kinds = (process.argv[5] ?? 'grassTop,slabTop,stoneTop,pathTop,mudTop,stoneSide,stoneGrassSide,grassSide').split(',');
const set = generateTileSet(band);
const gap = 4, perRow = 4, rows = Math.ceil(kinds.length / perRow);
const sheetW = perRow * (TEXTURE * 2 + gap) + gap, sheetH = rows * (TEXTURE * 2 + gap) + gap;
const pixels = new Uint8Array(sheetW * sheetH * 4);
for (let i = 0; i < pixels.length; i += 4) { pixels[i] = 12; pixels[i + 1] = 10; pixels[i + 2] = 14; pixels[i + 3] = 255; }
kinds.forEach((kind, index) => {
    const tile = set[kind][0];
    const ox = gap + (index % perRow) * (TEXTURE * 2 + gap), oy = gap + Math.floor(index / perRow) * (TEXTURE * 2 + gap);
    // The texture repeated 2 x 2 so a seam would show as a line.
    for (let y = 0; y < TEXTURE * 2; y++) for (let x = 0; x < TEXTURE * 2; x++) {
        const s = ((y % TEXTURE) * TEXTURE + (x % TEXTURE)) * 4, d = ((oy + y) * sheetW + ox + x) * 4;
        pixels.set(tile.data.subarray(s, s + 4), d);
    }
});
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