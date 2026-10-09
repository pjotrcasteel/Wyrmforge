import test from 'node:test';
import assert from 'node:assert/strict';
const storage = new Map();
globalThis.localStorage = { getItem:key => storage.get(key) ?? null, setItem:(key, value) => storage.set(key, value), removeItem:key => storage.delete(key) };
globalThis.document = { baseURI:'https://game.test/', cookie:'' };
const board = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/leaderboard.js');
const pendingKey = 'wyrmforge.hall-of-fame.pending.v1';
let posts = [];
let online = false;
globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('playtest-collector-config.json')) return { ok:true, json:async () => ({ endpoint:'https://collector.test/v1/reports' }) };
    if (options.method === 'POST') {
        posts.push(JSON.parse(options.body));
        if (!online) throw Error('offline');
        return { status:202, json:async () => ({ accepted:true }) };
    }
    return { ok:true, json:async () => ({ entries:[] }) };
};
test('saved player nickname is validated and used for automatic runs; offline retry retains the same submission ID', async () => {
    assert.equal(board.setPlayerName('Test Hunter'), 'Test Hunter');
    assert.equal(board.getPlayerName(), 'Test Hunter');
    assert.match(document.cookie, /wyrmforge_player_name=Test%20Hunter/);
    assert.match(document.cookie, /Max-Age=31536000;SameSite=Lax;Secure/);
    assert.equal(storage.has('wyrmforge.player-name.v1'), false);
    assert.equal(board.setPlayerName('<script>'), 'Test Hunter');
    board.recordRun(2500, '0.0.94');
    assert.equal(await board.flush(), 'local');
    const queued = JSON.parse(storage.get(pendingKey));
    assert.equal(queued.length, 1);
    assert.equal(queued[0].nickname, 'Test Hunter');
    assert.equal((await board.load()).filter(x => x.score === 2500).length, 1);
    online = true;
    assert.equal(await board.flush(), 'sent');
    assert.deepEqual(JSON.parse(storage.get(pendingKey)), []);
    assert.equal(posts[0].id, posts[1].id);
    const count = posts.length;
    await board.flush();
    assert.equal(posts.length, count);
    board.recordRun(0, '0.0.94');
    assert.deepEqual(JSON.parse(storage.get(pendingKey)), []);
});
test('rate limited entries stay queued for a later automatic retry', async () => {
    globalThis.fetch = async (url, options) => String(url).endsWith('playtest-collector-config.json')
        ? { ok:true, json:async () => ({ endpoint:'https://collector.test/v1/reports' }) }
        : { status:429 };
    board.recordRun(4000, '0.0.94');
    assert.equal(await board.flush(), 'rate_limited');
    assert.equal(JSON.parse(storage.get(pendingKey)).length, 1);
});

test('existing local nicknames migrate into the cookie', () => {
    document.cookie = '';
    storage.set('wyrmforge.player-name.v1', 'Legacy Hunter');
    assert.equal(board.getPlayerName(), 'Legacy Hunter');
    assert.match(document.cookie, /wyrmforge_player_name=Legacy%20Hunter/);
    assert.equal(storage.has('wyrmforge.player-name.v1'), false);
});
