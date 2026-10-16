// Builds every WyrmForge runtime art atlas deterministically.
// Usage: node tools/art/build-art.mjs [--check]
//   --check  regenerates in memory and fails if committed files differ (CI / test guard).
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from './lib/png.mjs';
import { Bitmap, packAtlas } from './lib/painter.mjs';
import { paintMageFront, paintMageBack, paintMageSide, hitVariant, MAGE_POSES, MAGE_ORIGIN } from './sprites/mage.mjs';
import { ENEMY_SPECS, ENEMY_POSES, paintEnemy, enemyHit, enemyFrozen } from './sprites/enemies.mjs';
import { WYRM_SCHOOLS, WYRM_ORIGIN, WYRM_RADIUS, paintWyrm, wyrmFrozen } from './sprites/wyrms.mjs';
import { tiles, decals, vegetation, ruins, walls, pickups } from './sprites/environment.mjs';
import { icons, hubBackdrop } from './sprites/ui.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'src', 'Wyrmforge.Presentation.Web', 'wwwroot', 'art');
const previewDir = join(root, 'docs', 'art', 'previews');
const check = process.argv.includes('--check');
const files = new Map();

function emit(path, data) { files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data)); }
const png = bitmap => encodePng(bitmap.width, bitmap.height, bitmap.data);

function upscale(bitmap, factor, background = null) {
    const out = new Bitmap(bitmap.width * factor, bitmap.height * factor);
    if (background) out.rect(0, 0, out.width, out.height, background);
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
        const c = bitmap.get(Math.floor(x / factor), Math.floor(y / factor));
        if (c[3]) out.set(x, y, c);
    }
    return out;
}

// ---- Actors -------------------------------------------------------------------------------
const actorEntries = [];
const painters = { S: paintMageFront, N: paintMageBack, E: paintMageSide };
for (const [dir, paint] of Object.entries(painters)) for (const pose of Object.keys(MAGE_POSES)) {
    const sprite = paint(pose);
    actorEntries.push({ name: `mage.${dir}.${pose}`, bitmap: sprite, anchor: MAGE_ORIGIN });
    actorEntries.push({ name: `mage.${dir}.${pose}.hit`, bitmap: hitVariant(sprite), anchor: MAGE_ORIGIN });
}
for (const spec of ENEMY_SPECS) for (const pose of ENEMY_POSES) {
    const sprite = paintEnemy(spec.kind, pose);
    const meta = { radius: spec.radius };
    actorEntries.push({ name: `enemy.${spec.kind}.${pose}.normal`, bitmap: sprite, anchor: spec.origin, meta });
    actorEntries.push({ name: `enemy.${spec.kind}.${pose}.hit`, bitmap: enemyHit(sprite), anchor: spec.origin, meta });
    actorEntries.push({ name: `enemy.${spec.kind}.${pose}.frozen`, bitmap: enemyFrozen(sprite), anchor: spec.origin, meta });
}
const actors = packAtlas(actorEntries, 512);

const wyrmEntries = [];
for (const S of WYRM_SCHOOLS) {
    for (const phase of [1, 2]) for (const flap of [0, 1])
        wyrmEntries.push({ name: `wyrm.${S.school}.p${phase}.f${flap}`, bitmap: paintWyrm(S.school, { phase, flap }), anchor: WYRM_ORIGIN, meta: { radius: WYRM_RADIUS } });
    wyrmEntries.push({ name: `wyrm.${S.school}.frozen`, bitmap: wyrmFrozen(paintWyrm(S.school, { phase: 1, flap: 0 })), anchor: WYRM_ORIGIN, meta: { radius: WYRM_RADIUS } });
}
const wyrms = packAtlas(wyrmEntries, 1024);

// ---- Environment --------------------------------------------------------------------------
const tileSet = tiles();
const tileEntries = Object.entries(tileSet).map(([name, bitmap]) => ({ name, bitmap, anchor: [0, 0] }));
const tileAtlas = packAtlas(tileEntries, 512, 0);

const envSprites = { ...decals(), ...vegetation(), ...ruins(), ...walls(), ...pickups() };
const envEntries = Object.entries(envSprites).map(([name, bitmap]) => {
    // Upright props stand on their foot line; caches/exit are centred on their C# position.
    let anchor;
    if (name.startsWith('cache.')) anchor = [36, 38];
    else if (name === 'exit.waystone') anchor = [44, 62];
    else if (name.startsWith('shard.')) anchor = [Math.floor(bitmap.width / 2), Math.floor(bitmap.height / 2)];
    else if (name.startsWith('wall.') || name.startsWith('rune.') || name.startsWith('decal.')) anchor = [0, 0];
    else anchor = [Math.floor(bitmap.width / 2), bitmap.height - 4];
    return { name, bitmap, anchor };
});
const environment = packAtlas(envEntries, 512);

// ---- UI -----------------------------------------------------------------------------------
const iconSet = icons();
const iconEntries = Object.entries(iconSet).map(([name, bitmap]) => ({ name, bitmap, anchor: [8, 8] }));
const iconAtlas = packAtlas(iconEntries, 256, 0);
const backdrop = hubBackdrop();

// ---- Emit ---------------------------------------------------------------------------------
const atlases = { actors, wyrms, tiles: tileAtlas, environment, icons: iconAtlas };
const manifest = {
    version: 1,
    generator: 'tools/art/build-art.mjs',
    provenance: 'Original pixel art authored as deterministic code in tools/art/sprites (no image-generation model, no third-party assets).',
    pixelsPerWorldUnit: 1,
    atlases: {},
    images: { hubBackdrop: { image: 'hub-backdrop.png', width: backdrop.width, height: backdrop.height } },
};
for (const [name, { atlas, frames }] of Object.entries(atlases)) {
    emit(join(outDir, `${name}.png`), png(atlas));
    manifest.atlases[name] = { image: `${name}.png`, width: atlas.width, height: atlas.height,
        frames: Object.fromEntries(Object.keys(frames).sort().map(key => [key, frames[key]])) };
}
emit(join(outDir, 'hub-backdrop.png'), png(backdrop));
emit(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

// Icon CSS: crisp 2x pixel icons via background-position into the shared sheet.
const scale = 2;
let css = `/* Generated by tools/art/build-art.mjs - do not edit by hand. */\n` +
    `.px-icon{display:inline-block;width:${16 * scale}px;height:${16 * scale}px;background-image:url('icons.png');` +
    `background-size:${iconAtlas.atlas.width * scale}px ${iconAtlas.atlas.height * scale}px;image-rendering:pixelated;flex:none;vertical-align:middle}\n` +
    `.px-icon.px-sm{width:16px;height:16px;background-size:${iconAtlas.atlas.width}px ${iconAtlas.atlas.height}px}\n` +
    `.px-icon.px-lg{width:48px;height:48px;background-size:${iconAtlas.atlas.width * 3}px ${iconAtlas.atlas.height * 3}px}\n`;
for (const [name, f] of Object.entries(iconAtlas.frames).sort()) {
    const id = name.replace('icon.', '');
    css += `.px-${id}{background-position:-${f.x * scale}px -${f.y * scale}px}` +
        `.px-sm.px-${id}{background-position:-${f.x}px -${f.y}px}` +
        `.px-lg.px-${id}{background-position:-${f.x * 3}px -${f.y * 3}px}\n`;
}
emit(join(outDir, 'icons.css'), css);

// Review sheets (magnified, on a dark ground) live with the documentation, not the runtime.
emit(join(previewDir, 'actors-4x.png'), png(upscale(actors.atlas, 4, '#1b2420')));
emit(join(previewDir, 'wyrms-3x.png'), png(upscale(wyrms.atlas, 3, '#1b2420')));
emit(join(previewDir, 'environment-3x.png'), png(upscale(environment.atlas, 3, '#1b2420')));
emit(join(previewDir, 'tiles-4x.png'), png(upscale(tileAtlas.atlas, 4)));
emit(join(previewDir, 'icons-6x.png'), png(upscale(iconAtlas.atlas, 6, '#1b2420')));
emit(join(previewDir, 'hub-backdrop-2x.png'), png(upscale(backdrop, 2)));

let stale = 0;
for (const [path, data] of files) {
    if (check) {
        if (!existsSync(path) || !readFileSync(path).equals(data)) { console.error(`stale: ${relative(root, path)}`); stale++; }
        continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
}
if (check && stale) { console.error(`${stale} art file(s) are out of date; run node tools/art/build-art.mjs`); process.exit(1); }
const frameCount = Object.values(manifest.atlases).reduce((n, a) => n + Object.keys(a.frames).length, 0);
console.log(`${check ? 'verified' : 'wrote'} ${files.size} files, ${frameCount} frames`);
