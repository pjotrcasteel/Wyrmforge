import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { decodePng, encodePng } from '../art/lib/png.mjs';
import { WALK, REST, poseAt } from './hollow-rig.mjs';
const root = path.resolve(import.meta.dirname, '../..'), sourcePath = 'src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow.png';
const source = decodePng(fs.readFileSync(path.join(root, sourcePath))), size = WALK.cell;
const inside = (x, y, poly) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
};
const regions = {
    farThigh: [[73,105],[90,108],[83,136],[77,148],[64,145],[65,131]],
    farShin: [[65,137],[79,141],[70,160],[68,171],[54,172],[55,157]],
    farFoot: [[54,160],[69,163],[76,171],[79,179],[50,181],[49,172]],
    nearThigh: [[98,100],[112,104],[122,131],[121,147],[109,149],[101,131]],
    nearShin: [[108,135],[121,136],[123,162],[124,170],[110,173],[106,157]],
    nearFoot: [[109,160],[123,161],[131,167],[143,171],[145,179],[117,181],[106,174]],
    farUpperArm: [[76,34],[87,41],[78,61],[72,73],[59,70],[61,56]],
    farForearm: [[60,61],[75,66],[68,87],[66,101],[52,102],[49,92],[54,75]],
    farHand: [[50,91],[65,94],[69,108],[65,122],[59,129],[48,125],[45,107]],
    nearUpperArm: [[116,39],[128,44],[130,62],[127,81],[115,83],[109,62]],
    nearForearm: [[114,73],[127,75],[140,91],[142,103],[130,108],[120,94],[113,83]],
    nearHand: [[130,94],[143,94],[147,105],[143,124],[137,133],[129,130],[128,116]],
};
// Extract one immutable material layer per bone from the SAME authored pose.
const layers = Object.fromEntries(Object.keys(regions).concat('body').map(name => [name, new Uint8Array(size * size * 4)]));
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const from = (y * source.width + x) * 4, to = (y * size + x) * 4;
    if (source.rgba[from + 3] < 24) continue;
    const matches = Object.keys(regions).filter(name => inside(x + .5, y + .5, regions[name]));
    for (const name of matches.length ? matches : ['body']) layers[name].set(source.rgba.subarray(from, from + 4), to);
}
function paint(target, layer, restA, restB, a, b, extra = 0) {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.atan2(restB[1] - restA[1], restB[0] - restA[0]) + extra;
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = x - a[0], dy = y - a[1], sx = c * dx + s * dy + restA[0], sy = -s * dx + c * dy + restA[1];
        const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
        let alpha = 0, rgb = [0, 0, 0];
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
            if (ix + i < 0 || ix + i >= size || iy + j < 0 || iy + j >= size) continue;
            const at = ((iy + j) * size + ix + i) * 4, weight = (i ? fx : 1 - fx) * (j ? fy : 1 - fy) * layer[at + 3] / 255;
            alpha += weight; for (let k = 0; k < 3; k++) rgb[k] += layer[at + k] * weight;
        }
        if (alpha < .005) continue;
        const at = (y * size + x) * 4, oldAlpha = target[at + 3] / 255, combined = alpha + oldAlpha * (1 - alpha);
        for (let k = 0; k < 3; k++) target[at + k] = Math.round((rgb[k] + target[at + k] * oldAlpha * (1 - alpha)) / combined);
        target[at + 3] = Math.round(combined * 255);
    }
}
const width = size * WALK.frames, output = new Uint8Array(width * size * 4), diagnostics = [];
for (let frame = 0; frame < WALK.frames; frame++) {
    const p = poseAt(frame / WALK.frames), target = new Uint8Array(size * size * 4);
    const bone = (name, a, b, ta, tb) => paint(target, layers[name], REST[a], REST[b], ta, tb);
    const leg = side => {
        const hip = p[side + 'Hip'], knee = p[side + 'Knee'], ankle = p[side].point;
        bone(side + 'Thigh', side + 'Hip', side + 'Knee', hip, knee);
        bone(side + 'Shin', side + 'Knee', side + 'Ankle', knee, ankle);
        const rest = REST[side + 'Ankle'];
        paint(target, layers[side + 'Foot'], rest, [rest[0] + 1, rest[1]], ankle, [ankle[0] + 1, ankle[1]], p[side].toeAngle);
    };
    const arm = side => {
        const a = p[side + 'Arm'];
        bone(side + 'UpperArm', side + 'Shoulder', side + 'Elbow', a.shoulder, a.elbow);
        bone(side + 'Forearm', side + 'Elbow', side + 'Wrist', a.elbow, a.wrist);
        paint(target, layers[side + 'Hand'], REST[side + 'Wrist'], REST[side + 'Elbow'], a.wrist, a.elbow);
    };
    leg('far'); arm('far'); leg('near');
    paint(target, layers.body, [0, 0], [1, 0], [0, p.bob], [1, p.bob]); arm('near');
    for (let y = 0; y < size; y++) output.set(target.subarray(y * size * 4, (y + 1) * size * 4), (y * width + frame * size) * 4);
    diagnostics.push({ frame, ...p });
}
const assets = path.join(root, 'src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/assets');
fs.writeFileSync(path.join(assets, 'hollow-walk-rig-v2.png'), encodePng(width, size, output));
const C = createRequire(import.meta.url)('../../src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/src/lab-core.js');
const config = { ...C.DEFAULT_CONFIG, layout: 'single', columns: WALK.frames, rows: 1, cellWidth: size, cellHeight: size, fps: WALK.fps };
const manifest = { schemaVersion: '1.1', name: 'The Hollow — rigged walking review', animation: 'walk',
    source: { width, height: size, columns: WALK.frames, rows: 1, frameWidth: size, frameHeight: size, offsetX: 0, offsetY: 0 },
    playback: { fps: WALK.fps, loop: true }, directions: { SE: { row: 0, flipX: false } },
    travelPerCycle: WALK.travelPerCycle, status: 'motion-review', visualAccepted: false,
    artworkSource: sourcePath, artworkSourceFrame: 0, notes: 'One drawn view only; validate this gait before authoring other facings.',
    rig: WALK, diagnostics };
fs.writeFileSync(path.join(assets, 'hollow-walk-rig-v2.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Built one coherent 16-frame rigged walking view; all textures come from source frame 0.');
