import assert from 'node:assert/strict';
import test from 'node:test';
import { openHunterSave } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunter-save.js';

const saveKey = 'hunter';
const keys = ['web', 'mutators', 'materials', 'campaign'];

function fixture(entries) {
    const data = new Map(entries);
    const storage = {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
    };
    return { data, storage, save: openHunterSave(storage, saveKey, keys) };
}

test('keeps legacy progression and imports only registered sections on the first write', () => {
    const { data, save } = fixture([['web', 'assigned'], ['campaign', 'chapter one'], ['telemetry', 'private']]);
    assert.equal(save.read('web'), 'assigned');
    save.write({ mutators: 'equipped', materials: 'spent' });
    assert.deepEqual(JSON.parse(data.get(saveKey)), {
        schemaVersion: 1,
        sections: { web: 'assigned', campaign: 'chapter one', mutators: 'equipped', materials: 'spent' },
    });
    assert.equal(data.get('web'), 'assigned');
    data.set('web', 'outdated legacy value');
    assert.equal(save.read('web'), 'assigned');
});

test('an interrupted purchase leaves the previous snapshot intact and can be retried', () => {
    const { storage, save } = fixture([]);
    save.write({ mutators: 'locked', materials: 'unspent' });
    const setItem = storage.setItem;
    storage.setItem = () => { throw new Error('Storage full'); };
    assert.throws(() => save.write({ mutators: 'equipped', materials: 'spent' }), /Storage full/);
    assert.equal(save.read('mutators'), 'locked');
    assert.equal(save.read('materials'), 'unspent');
    storage.setItem = setItem;
    save.write({ mutators: 'equipped', materials: 'spent' });
    assert.equal(save.read('mutators'), 'equipped');
    assert.equal(save.read('materials'), 'spent');
});

test('preserves unknown data and rejects writing over a newer save format', () => {
    const newer = JSON.stringify({ schemaVersion: 2, sections: { web: 'assigned' } });
    const { data, save } = fixture([[saveKey, newer]]);
    assert.throws(() => save.write({ web: 'default' }), /Unsupported Hunter save/);
    assert.equal(data.get(saveKey), newer);
});
