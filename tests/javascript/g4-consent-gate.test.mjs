import test from 'node:test';
import assert from 'node:assert/strict';
import { G4_SHARING_KEY, showG4PreflightChoice } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/g4-consent-gate.js';

function setup({ storageFails = false } = {}) {
    class Element {
        constructor(tag) {
            this.tagName = tag;
            this.style = {};
            this.attributes = {};
            this.children = [];
            this.handlers = {};
            this.parent = null;
        }
        setAttribute(k, v) { this.attributes[k] = v; }
        append(...items) {
            for (const item of items) { item.parent = this; this.children.push(item); }
        }
        appendChild(item) { this.append(item); }
        addEventListener(type, cb) { this.handlers[type] = cb; }
        click() { this.handlers.click?.(); }
        focus() { this.focused = true; }
        remove() {
            const parent = this.parent;
            if (parent) parent.children.splice(parent.children.indexOf(this), 1);
            this.parent = null;
        }
    }
    const body = new Element('body');
    const doc = { body, createElement: tag => new Element(tag), querySelector: () => null };
    const values = new Map();
    const storage = {
        setItem(key, value) { if (storageFails) throw Error('private storage'); values.set(key, value); },
        getItem(key) { return values.get(key) ?? null; }
    };
    return { doc, body, storage, values };
}

test('the G4 first screen blocks all game menus until a clear private/local decision', async () => {
    const { doc, body, storage } = setup();
    const decision = showG4PreflightChoice({ doc, storage });
    assert.equal(body.children.length, 1);
    const gate = body.children[0];
    assert.equal(gate.attributes.role, 'dialog');
    assert.equal(gate.attributes['aria-modal'], 'true');
    assert.equal(gate.style.zIndex, '2147483647');
    const card = gate.children[0];
    const options = card.children.filter(child => child.tagName === 'button');
    assert.deepEqual(options.map(b => b.textContent),
        ['Share performance results privately', 'Keep private on this phone']);
    assert.equal(storage.getItem(G4_SHARING_KEY), null,
        'Merely viewing the G4 screen is not upload consent');
    options[1].click();
    assert.equal(await decision, 'no');
    assert.equal(storage.getItem(G4_SHARING_KEY), 'no');
    assert.equal(body.children.length, 0);
});

test('remote sharing requires an intentional click rather than a default checkbox', async () => {
    const { doc, body, storage } = setup();
    const promise = showG4PreflightChoice({ doc, storage });
    body.children[0].children[0].children.find(child => child.attributes['data-g4-choice'] === 'yes').click();
    assert.equal(await promise, 'yes');
    assert.equal(storage.getItem(G4_SHARING_KEY), 'yes');
    assert.equal(body.children.length, 0);
});

test('if iPhone private storage blocks consent, sharing is never silently enabled', async () => {
    const { doc, body, storage } = setup({ storageFails: true });
    const promise = showG4PreflightChoice({ doc, storage });
    const choices = body.children[0].children[0].children.filter(child => child.tagName === 'button');
    choices[0].click();
    assert.equal(body.children.length, 1);
    assert.equal(storage.getItem(G4_SHARING_KEY), null);
    assert.match(body.children[0].children[0].children.at(-1).textContent, /cannot be enabled/);
    choices[1].click();
    assert.equal(await promise, 'no');
    assert.equal(body.children.length, 0);
});
