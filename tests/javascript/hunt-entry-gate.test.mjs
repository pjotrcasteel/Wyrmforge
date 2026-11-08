import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHuntEntryGate, huntEntryReadiness, huntEntrySceneKey }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-entry-gate.js';

const snapshot = (overrides = {}) => ({
    paused: false,
    ended: false,
    player: { x: 32, y: 32 },
    world: { width: 512, height: 512 },
    environment: { seed: 17, biome: 'wet-forest', landmark: 'forest-fork',
        terrain: { revision: 4, columns: 16, rows: 16 }, greybox: { enabled: true } },
    ...overrides,
});
const ready = (overrides = {}) => ({
    terrainFrame: { revision: 4 },
    terrainCache: { revision: 4 },
    atlasSettled: true,
    authoredPending: false,
    gpuWorld: { initialized: true },
    gpuError: null,
    renderingFailed: false,
    framePresented: true,
    ...overrides,
});

function createDocument() {
    const elements = [];
    const document = {
        createElement(tag) {
            const attributes = new Map(), classes = new Set();
            const element = {
                tag, className: '', dataset: {},
                classList: { toggle(name, value) { if (value) classes.add(name); else classes.delete(name); },
                    contains(name) { return classes.has(name); } },
                setAttribute(name, value) { attributes.set(name, value); },
                getAttribute(name) { return attributes.get(name); },
                querySelector(selector) {
                    if (!this.children) {
                        this.children = new Map([
                            ['[data-hunt-phase]', { textContent: '' }],
                            ['[data-hunt-tip]', { textContent: '' }],
                        ]);
                    }
                    return this.children.get(selector);
                },
                remove() { this.removed = true; },
            };
            elements.push(element);
            return element;
        },
    };
    return { document, elements };
}

test('the Hunt veil is inactive during choice and refuge menus; requires an authoritative playable site', () => {
    const s = snapshot();
    assert.equal(huntEntrySceneKey(s), '17:wet-forest:forest-fork:16:16');
    assert.equal(huntEntrySceneKey(snapshot({ paused: true })), null);
    assert.equal(huntEntrySceneKey(snapshot({ ended: true })), null);
    assert.equal(huntEntrySceneKey(snapshot({ environment: {} })), null);
    assert.equal(huntEntrySceneKey(snapshot({ player: null })), null);
    assert.equal(huntEntrySceneKey({}), null);
    assert.equal(huntEntryReadiness(snapshot({ paused: true }), ready()), 'inactive');
});

test('real terrain revision, decoded art, actors, GPU and completed render all gate the first reveal', () => {
    const s = snapshot();
    assert.equal(huntEntryReadiness(s, ready({ terrainFrame: null })), 'terrain');
    assert.equal(huntEntryReadiness(s, ready({ terrainFrame: { revision: 3 } })), 'terrain');
    assert.equal(huntEntryReadiness(s, ready({ atlasSettled: false })), 'atlas');
    assert.equal(huntEntryReadiness(s, ready({ authoredPending: true })), 'actors');
    assert.equal(huntEntryReadiness(s, ready({ gpuWorld: null })), 'lighting');
    assert.equal(huntEntryReadiness(s, ready({ gpuWorld: null, gpuError: 'WebGL unavailable' })), 'ready',
        'the existing Canvas fallback can be revealed after its real first paint');
    assert.equal(huntEntryReadiness(s, ready({ terrainCache: null })), 'painting');
    assert.equal(huntEntryReadiness(s, ready({ terrainCache: { revision: 2 } })), 'painting');
    assert.equal(huntEntryReadiness(s, ready({ framePresented: false })), 'scene');
    assert.equal(huntEntryReadiness(s, ready({ renderingFailed: true })), 'renderer');
    assert.equal(huntEntryReadiness(s, ready()), 'ready');
});

test('a single scene locks input until complete, retains unlocked state through impacts and cancels for menu', () => {
    const { document, elements } = createDocument();
    const root = { ownerDocument: document, appendChild(element) { this.overlay = element; } };
    const gate = createHuntEntryGate(root);
    const panel = elements[0], s = snapshot();
    assert.equal(gate.isBlocking(), false);
    assert.equal(panel.getAttribute('aria-hidden'), 'true');
    gate.update(s, 'terrain');
    assert.equal(gate.isBlocking(), true);
    assert.equal(panel.getAttribute('aria-hidden'), 'false');
    assert.equal(panel.classList.contains('hunt-entry-loading--visible'), true);
    assert.equal(panel.querySelector('[data-hunt-phase]').textContent, 'SHAPING THE TRAIL');
    gate.update(s, 'lighting');
    assert.equal(panel.querySelector('[data-hunt-phase]').textContent, 'LIGHTING THE FOREST');
    gate.update(s, 'ready');
    assert.equal(gate.isBlocking(), false);
    assert.equal(panel.getAttribute('aria-hidden'), 'true');
    gate.update(snapshot({ environment: { ...s.environment, terrain: { ...s.environment.terrain, revision: 5 } } }), 'terrain');
    assert.equal(gate.isBlocking(), false, 'damage revisions must not repeatedly hide active gameplay');
    gate.update(snapshot({ paused: true }), 'inactive');
    assert.equal(gate.isBlocking(), false);
    gate.update(snapshot({ environment: { ...s.environment, seed: 18 } }), 'actors');
    assert.equal(gate.isBlocking(), true, 'a new seeded site has an independent loading barrier');
    gate.update(snapshot({ paused: true }), 'inactive');
    assert.equal(gate.isBlocking(), false, 'a cancelled/new map decision remains accessible');
    gate.dispose();
    gate.dispose();
    assert.equal(panel.removed, true);
    assert.equal(gate.isBlocking(), false);
});

test('while the gate is held, JS requests a side-effect-free C# snapshot, never a combat Tick(0)', () => {
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    const codebehind = readFileSync(new URL(
        '../../src/Wyrmforge.Presentation.Web/Features/Arena/ArenaView.razor.cs', import.meta.url), 'utf8');
    assert.match(arena, /entryBlocked\s*\?\s*state\.dotNetReference\.invokeMethodAsync\('PreviewFrame'\)/,
        'loading must bypass the combat simulation completely');
    assert.match(codebehind, /public RunRenderSnapshot PreviewFrame\(\)\s*=>\s*simulation\?\.CreateSnapshot\(\)/,
        'the C# preview only reads the live scene');
    assert.doesNotMatch(codebehind.match(/public RunRenderSnapshot PreviewFrame\(\)[\s\S]*?\[JSInvokable\]/)?.[0] ?? '',
        /\.Tick\(/, 'C# startup preview never advances enemy attacks, spawns or damage');
});
