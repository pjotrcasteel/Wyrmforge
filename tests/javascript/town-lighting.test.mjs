import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = readFileSync('src/Wyrmforge.Presentation.Web/wwwroot/js/town-lighting.js', 'utf8');

function createHarness(nowHour = 12) {
    const store = new Map();
    const listeners = {};
    const srcNight = 'art/town/night-active.webp?v=139';
    const base = {
        src: new URL(srcNight, 'https://game.test/').href,
        getAttribute: () => srcNight
    };
    const patch = {
        src: new URL('art/town/night-vacant-Codex.png?v=139', 'https://game.test/').href,
        dataset: {},
        getAttribute: () => 'art/town/night-vacant-Codex.png?v=139'
    };
    const scene = {
        dataset: {},
        attributes: {},
        setAttribute(name, value) {this.attributes[name] = value;},
        querySelector: () => base,
        querySelectorAll: () => [patch]
    };
    const document = {
        readyState: 'loading',
        baseURI: 'https://game.test/',
        addEventListener: (key, fn) => listeners[key] = fn,
        querySelector: () => scene,
        getElementById: () => ({})
    };
    const window = {
        localStorage: {getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v)},
        setInterval: () => 1,
        addEventListener: (k,fn) => listeners[k] = fn,
        dispatchEvent: () => {}
    };
    class DeviceDate extends Date {
        constructor(...args) {
            super(...(args.length ? args : [2026, 9, 20, nowHour, 0]));
        }
    }
    class MutationObserver {observe() {}}
    class CustomEvent { constructor(type, detail) {this.type = type;this.detail = detail;} }
    const sandbox = {window, document, URL, Image:class {set src(value) { this.value=value;}}, MutationObserver, Date:DeviceDate, CustomEvent, queueMicrotask:fn=>fn()};
    vm.runInNewContext(source,sandbox);
    return {window, listeners, store, base, patch, scene};
}

test('auto respects the device local hour boundaries', () => {
    const clock = createHarness();
    const resolve = clock.window.wyrmforgeTownLighting.resolveMode;
    const d = (hour) => new Date(2026, 9, 20, hour, 0);
    assert.equal(resolve('auto',d(6)), 'night');
    assert.equal(resolve('auto',d(7)), 'day');
    assert.equal(resolve('auto',d(18)), 'day');
    assert.equal(resolve('auto',d(19)), 'night');
    assert.equal(resolve('night',d(12)), 'night');
    assert.equal(resolve('day',d(23)), 'day');
});

test('day night auto setting persists and swaps panorama and vacancy assets without remounting', () => {
    const h = createHarness(23);
    h.listeners.DOMContentLoaded();
    const time = h.window.wyrmforgeTownLighting;
    assert.equal(time.getMode(),'auto');
    assert.equal(h.scene.dataset.townTime,'night');
    assert.equal(h.scene.attributes['aria-label'],'Nighttime Refuge town square');
    const sameScene=h.scene;
    time.setMode('day');
    assert.equal(h.store.get('wyrmforge.townLighting.v1'),'day');
    assert.match(h.base.src,/day-active\.webp\?v=139$/);
    assert.match(h.patch.src,/day-vacant-Codex\.webp\?v=139$/);
    assert.equal(h.patch.dataset.townAsset,'Codex');
    assert.equal(h.scene.attributes['aria-label'],'Daytime Refuge town square');
    time.setMode('night');
    assert.match(h.base.src,/night-active\.webp\?v=139$/);
    assert.match(h.patch.src,/night-vacant-Codex\.png\?v=139$/);
    time.setMode('day');
    assert.match(h.patch.src,/day-vacant-Codex\.webp\?v=139$/);
    assert.equal(h.scene,sameScene);
});

test('returning to auto is governed by local time and never touches player progression', () => {
    const h=createHarness(13);h.listeners.DOMContentLoaded();
    h.window.wyrmforgeTownLighting.setMode('night');
    assert.equal(h.scene.dataset.townTime,'night');
    h.window.wyrmforgeTownLighting.setMode('auto');
    assert.equal(h.scene.dataset.townTime,'day');
    assert.deepEqual([...h.store.keys()],['wyrmforge.townLighting.v1']);
    assert.throws(()=>h.window.wyrmforgeTownLighting.setMode('sunset'),/Invalid town lighting mode/);
});

test('game settings and initialization contain the lighting controls',() => {
    const options=readFileSync('src/Wyrmforge.Presentation.Web/Features/Forge/ForgeView.razor','utf8');
    const ui=readFileSync('src/Wyrmforge.Presentation.Web/Features/Forge/TownLightingSettings.razor','utf8');
    const html=readFileSync('src/Wyrmforge.Presentation.Web/wwwroot/index.html','utf8');
    assert.match(options,/<TownLightingSettings\s*\/>/);
    for(const mode of ['auto','day','night']) assert.ok(ui.includes('ChangeModeAsync("'+mode+'")'));
    assert.match(html,/js\/town-lighting\.js/);
});
