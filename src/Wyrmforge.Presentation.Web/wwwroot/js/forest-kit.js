// The gothic forest sprite kit (tools/art/build_gothic_forest_kit.py): one atlas image plus a manifest of rectangles and foot anchors.
// Loaded once, lazily; every consumer treats "not loaded yet" as "draw nothing yet".
let kit = null;
let requested = false;

/** Installs a kit (`{ sprites, image }`) directly; used by tests and by anything that already holds the atlas. */
export function useForestKit(value) { kit = value; requested = true; }

async function load() {
    const base = new URL('../art/environment/forest/', import.meta.url);
    const json = await (await fetch(new URL('forest-kit.json', base))).json();
    const image = new Image();
    image.src = new URL(json.atlas, base).href;
    await image.decode();
    return { sprites: json.sprites, image };
}

/** The loaded kit, or null while it is still downloading. */
export function forestKit() {
    if (!kit && !requested && typeof Image !== 'undefined' && typeof fetch !== 'undefined') {
        requested = true;
        load().then(loaded => { kit = loaded; }).catch(() => { });
    }
    return kit;
}

/** Sprite names of a kit that start with a prefix, sorted; cached per kit. */
export function kitNames(loaded, prefix, maxHeight = Infinity) {
    const cache = loaded.nameCache ??= new Map();
    const key = `${prefix}|${maxHeight}`;
    if (!cache.has(key)) cache.set(key, Object.keys(loaded.sprites).filter(name => name.startsWith(prefix) && loaded.sprites[name].h <= maxHeight).sort());
    return cache.get(key);
}
