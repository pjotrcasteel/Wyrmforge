import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareUpload } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunter-cloud.js';
import { openHunterSave, parseHunterSave } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunter-save.js';

const account = { uid: 'hunter-one', projectId: 'alpha' };
const local = { schemaVersion: 1, sections: { web: 'assigned', materials: 'essence', campaign: 'chapter one' } };

test('backs up the complete snapshot without uploading local account metadata', () => {
    const upload = prepareUpload({ ...local, cloud: { ...account, revision: 2 } }, { revision: 2 }, account);
    assert.deepEqual(upload, { status: 'upload', revision: 3, payload: JSON.stringify(local) });
    assert.deepEqual(prepareUpload(local, upload, account), { status: 'current', revision: 3 });
    assert.deepEqual(prepareUpload({ ...local, sections: {} }, undefined, account), { status: 'empty' });
});

test('preserves a divergent backup until the player confirms the exact account and revision', () => {
    const remote = { revision: 2, payload: 'different' };
    const expected = { status: 'conflict', backup: { ...account, revision: 2 } };
    assert.deepEqual(prepareUpload(local, remote, account), expected);
    assert.deepEqual(prepareUpload(local, remote, account, { ...account, revision: 1 }), expected);
    assert.deepEqual(prepareUpload(local, remote, account, { ...expected.backup, uid: 'someone-else' }), expected);
    assert.deepEqual(prepareUpload(local, remote, account, { ...expected.backup, projectId: 'production' }), expected);
    assert.equal(prepareUpload(local, remote, account, expected.backup).status, 'upload');
});

test('checks size in bytes and validates downloaded save format', () => {
    assert.deepEqual(prepareUpload({ ...local, sections: { huge: '🔥'.repeat(150_000) } }, undefined, account), { status: 'too-large' });
    assert.throws(() => parseHunterSave('{"schemaVersion":2,"sections":{}}'), /Unsupported/);
    assert.throws(() => parseHunterSave('{"schemaVersion":1,"sections":{"web":99}}'), /Unsupported/);
});

test('refuses to restore over a save changed while the cloud request was in flight', () => {
    let stored = JSON.stringify(local);
    const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
    const save = openHunterSave(storage, 'hunter', Object.keys(local.sections));
    const before = JSON.stringify(save.snapshot());
    save.write({ materials: 'new drop' });
    assert.equal(save.replace(before, { ...local, sections: { materials: 'old drop' } }), false);
    assert.equal(save.read('materials'), 'new drop');
});
