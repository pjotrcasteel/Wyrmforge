import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const base = new URL('../../src/Wyrmforge.Presentation.Web/', import.meta.url);
const read = path => readFileSync(new URL(path, base), 'utf8');
const makeClasses = (...names) => {
    const values = new Set(names);
    return {
        add: (...added) => added.forEach(name => values.add(name)),
        remove: (...removed) => removed.forEach(name => values.delete(name)),
        contains: name => values.has(name),
    };
};

function startupFixture({ town = false } = {}) {
    const observers = [];
    const pending = [];
    const image = () => ({
        complete: true, naturalWidth: 1672,
        decode: () => new Promise(resolve => pending.push(resolve)),
    });
    const panorama = image(), cutout = image();
    let navigation = false, foreground = false, restored = true;
    const scene = {
        isConnected: true,
        dataset: {},
        querySelector(selector) {
            if (selector === '.refuge-town-night-base') return panorama;
            if (selector === '.refuge-town-png-cutout') return cutout;
            return null;
        },
        querySelectorAll(selector) {
            return selector === 'img[src]' ? [panorama, cutout] : [];
        },
    };
    const app = {
        querySelector(selector) {
            if (selector === '[data-home-restored]') return {};
            if (selector === '[data-home-restored="true"]') return restored ? {} : null;
            if (selector.includes('.refuge-canonical-scene') && town) return scene;
            if (selector.includes('.arrival-reference-art') && !town) return panorama;
            return null;
        },
    };
    const splash = { classList: town ? makeClasses('ignition-complete') : makeClasses(), setAttribute() {} };
    const body = { classList: makeClasses('igniting') };
    const status = { textContent: '' }, retry = { hidden: true };
    const document = {
        body, baseURI: 'https://example.org/Wyrmforge/',
        getElementById(id) {
            return { app, 'wyrmforge-ignition': splash, 'ignition-status': status,
                'ignition-retry': retry }[id];
        },
    };
    const context = {
        document, window: {}, console, URL,
        requestAnimationFrame: callback => queueMicrotask(callback),
        MutationObserver: class {
            constructor(callback) { this.callback = callback; this.active = true; observers.push(this); }
            observe() {}
            disconnect() { this.active = false; }
        },
    };
    runInNewContext(read('wwwroot/js/town-startup-gate.js'), context);
    return {
        startup: context.window.wyrmforgeStartup, splash, body, status, retry, pending, scene,
        setNavigation(value) { navigation = value; scene.dataset.townNavigationSettled = String(value); this.notify(); },
        setForeground(value) { foreground = value; scene.dataset.townForegroundReady = String(value); this.notify(); },
        setRestored(value) { restored = value; this.notify(); },
        notify() { for (const watcher of observers) if (watcher.active) watcher.callback(); },
        get ready() { return navigation && foreground && restored; },
    };
}

test('startup veil waits for actual decoded welcome artwork before revealing first screen', async () => {
    const f = startupFixture();
    const ready = f.startup.revealInitial();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.splash.classList.contains('ignition-complete'), false,
        'the original splash must still cover startup');
    assert.equal(f.body.classList.contains('igniting'), true);
    assert.equal(f.pending.length, 1, 'must actually decode the welcome painting');
    f.pending.shift()();
    await ready;
    assert.equal(f.body.classList.contains('igniting'), false);
    assert.equal(f.splash.classList.contains('ignition-complete'), true);
});

test('town stays veiled until restoration, navigation, foreground cuts and image decodes settle', async () => {
    const f = startupFixture({ town: true });
    f.setRestored(false);
    f.startup.beginTown();
    f.startup.townRendered();
    assert.equal(f.body.classList.contains('igniting'), true);
    assert.equal(f.splash.classList.contains('ignition-complete'), false);

    f.setRestored(true);
    await Promise.resolve();
    assert.equal(f.pending.length, 0, 'town art must wait for actual navigation state');

    f.setNavigation(true);
    await Promise.resolve();
    assert.equal(f.pending.length, 0, 'town art must wait for generated foreground cutouts');

    f.setForeground(true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.pending.length, 2, 'the panorama and generated PNG must both decode');
    assert.equal(f.splash.classList.contains('ignition-complete'), false);
    for (const release of f.pending.splice(0)) release();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.body.classList.contains('igniting'), false);
    assert.equal(f.splash.classList.contains('ignition-complete'), true);
});

test('town, saved build and cutout signals are real, and labs keep their separate startup path', () => {
    const index = read('wwwroot/index.html');
    const home = read('Pages/Home.razor');
    const state = read('Pages/Home.razor.cs');
    const town = read('Features/Forge/CanonicalTownView.razor');
    const shell = read('Features/Forge/ForgeView.razor');
    const cuts = read('wwwroot/js/refuge-foreground-cutouts.js');
    const lab = read('Pages/EnemyLab.razor');

    assert.match(index, /await window\.wyrmforgeStartup\.revealInitial\(\)/);
    assert.doesNotMatch(index, /minimumIntroMs/);
    assert.match(home, /data-home-restored/);
    assert.match(state, /homeRestored = true;/);
    assert.match(town, /data-town-navigation-settled/);
    assert.match(town, /refuge-foreground-cutouts\.js\?v=\{AppBuildInfo\.Version\}-\{AppBuildInfo\.Commit\}/);
    assert.match(cuts, /scene\.dataset\.townForegroundReady = 'true'/);
    assert.match(shell, /wyrmforgeStartup\.beginTown/);
    assert.match(shell, /wyrmforgeStartup\.townRendered/);
    assert.doesNotMatch(lab, /wyrmforgeStartup|town-startup-gate/);
});
