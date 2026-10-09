import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { sanitizeReport } from '../src/index.js';

class MemoryDb {
    reports = new Map();
    buckets = new Map();
    scores = new Map();
    prepare(sql) {
        return {
            bind: (...args) => ({ run: () => this.run(sql, args), all: () => this.all(sql, args), first: () => this.first(sql, args) }),
            all: () => this.all(sql, []),
            first: () => this.first(sql, [])
        };
    }
    async run(sql, args) {
        if (sql.includes('INSERT INTO rate_limits')) {
            const [key] = args;
            const count = this.buckets.get(key) ?? 0;
            if (count >= 12) return { meta: { changes: 0 } };
            this.buckets.set(key, count + 1);
            return { meta: { changes: 1 } };
        }
        if (sql.includes('INSERT OR IGNORE INTO leaderboard_entries')) {
            const [id, nickname, score, game_version, created_at] = args;
            if (this.scores.has(id)) return { meta: { changes: 0 } };
            this.scores.set(id, { id, nickname, score, game_version, created_at });
            return { meta: { changes: 1 } };
        }
        if (sql.includes('INSERT OR IGNORE INTO reports')) {
            const [id] = args;
            if (this.reports.has(id)) return { meta: { changes: 0 } };
            this.reports.set(id, { id, received_at: args[1], data: args[12], enjoyment: args[4], clarity: args[5], replay: args[6],
                trouble_area: args[7], completed_runs: args[9], recent_run_count: args[11] });
            return { meta: { changes: 1 } };
        }
        if (sql.includes('DELETE FROM leaderboard_entries WHERE id')) this.scores.delete(args[0]);
        if (sql.includes('DELETE FROM reports WHERE id')) this.reports.delete(args[0]);
        if (sql.includes('DELETE FROM reports WHERE received_at')) {
            for (const [id, value] of this.reports) if (value.received_at < args[0]) this.reports.delete(id);
        }
        if (sql.includes('DELETE FROM rate_limits')) this.buckets.clear();
        return { meta: { changes: 1 } };
    }
    async all(sql, args) {
        const rows = [...this.reports.values()];
        if (sql.includes('SELECT id,nickname,score,game_version,created_at FROM leaderboard_entries'))
            return { results: [...this.scores.values()].slice().reverse() };
        if (sql.includes('SELECT nickname,score,game_version FROM leaderboard_entries'))
            return { results: [...this.scores.values()].sort((a,b) => b.score - a.score).slice(0,20) };
        if (sql.includes('SELECT id,received_at,data')) return { results: rows.slice(-args[0]).reverse() };
        if (sql.includes('trouble_area AS area')) {
            return { results: Object.entries(countBy(rows, 'trouble_area')).map(([area, count]) => ({ area, count })) };
        }
        if (sql.includes('SELECT replay')) return { results: Object.entries(countBy(rows, 'replay')).map(([replay, count]) => ({ replay, count })) };
        throw Error('Unexpected SQL: ' + sql);
    }
    async first(sql) {
        assert.match(sql, /COUNT\(\*\) AS reports/);
        const rows = [...this.reports.values()];
        const avg = key => {
            const values = rows.map(row => row[key]).filter(value => value !== null);
            return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
        };
        return { reports: rows.length, enjoyment: avg('enjoyment'), clarity: avg('clarity'),
            reportedRunCounts: rows.reduce((sum, row) => sum + row.completed_runs, 0),
            sharedRunSamples: rows.reduce((sum, row) => sum + row.recent_run_count, 0) };
    }
}
function countBy(rows, key) {
    const counts = {};
    for (const row of rows) if (row[key] !== null) counts[row[key]] = (counts[row[key]] ?? 0) + 1;
    return counts;
}
const env = () => ({ DB: new MemoryDb(), PUBLIC_ORIGIN: 'https://pjotrcasteel.github.io', RATE_LIMIT_KEY: 'private-test-rate-key', ADMIN_TOKEN: 'very-long-private-admin-key' });
const report = () => ({
    schema: 'wyrmforge.playtest.report.v1', id: 'd6d3a08a-2ce3-4eae-af24-991bb42b8701', gameVersion: '0.0.80',
    device: { kind: 'touch', viewport: '390x844', standalone: false, email: 'do-not-store@example.com' },
    feedback: { enjoyment: 4, clarity: 3, replay: 'yes', troubleArea: 'movement',
        bestMoment: 'The Ashfang gate', improvement: 'Swipe controls', email: 'do-not-store@example.com' },
    stats: { starts: 2, completedRuns: 1, interruptedRuns: 0, trailsEntered: 2, wyrmGatesEntered: 0 },
    recentRuns: [{ runId: '759a2f31-3ddb-4b4c-92b8-071992504984', outcome: 'Defeated', seed: 42, score: 123,
        milestones: ['trail_entered', 'unauthorized_event'], playerName: 'NOPE', perf: { samples: 20, slowFrames: 2 } }]
});
function post(e, payload, origin = e.PUBLIC_ORIGIN) {
    return worker.fetch(new Request('https://collector.example.test/v1/reports', {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.5' },
        body: JSON.stringify(payload)
    }), e);
}
function admin(e, path, token = e.ADMIN_TOKEN, method = 'GET') {
    return worker.fetch(new Request('https://collector.example.test' + path, {
        method, headers: { Authorization: 'Bearer ' + token }
    }), e);
}

test('Accept valid explicit consent only; refuse silent/malformed and cross-origin submissions', async () => {
    const e = env();
    assert.equal((await post(e, { report: report() })).status, 400);
    assert.equal((await post(e, { consent: true, report: report() }, 'https://attacker.invalid')).status, 403);
    assert.equal((await post(e, { consent: true, report: { ...report(), recentRuns: new Array(13).fill({}) } })).status, 400);
    assert.equal((await post(e, { consent: true, report: report() })).status, 202);
    assert.equal(e.DB.reports.size, 1);
});
test('Discard unexpected properties, identifiers and detailed viewport/fingerprint data', async () => {
    const safe = sanitizeReport(report());
    assert.equal(safe.device.kind, 'touch');
    assert.equal('viewport' in safe.device, false);
    assert.equal('email' in safe.feedback, false);
    assert.equal('playerName' in safe.recentRuns[0], false);
    assert.deepEqual(safe.recentRuns[0].milestones, ['trail_entered']);
    assert.equal(sanitizeReport({ ...report(), id: 'a' }), null);
});
test('Duplicates are idempotent and reports/admin remain private', async () => {
    const e = env();
    assert.equal((await post(e, { consent: true, report: report() })).status, 202);
    const retry = await post(e, { consent: true, report: report() });
    assert.equal((await retry.json()).duplicate, true);
    assert.equal(e.DB.reports.size, 1);
    assert.equal((await admin(e, '/v1/admin/reports', 'wrong')).status, 401);
    assert.equal((await admin(e, '/v1/admin/summary')).status, 200);
    const list = await (await admin(e, '/v1/admin/reports')).json();
    assert.equal(list.reports.length, 1);
    assert.equal(list.reports[0].id, report().id);
    assert.equal(list.reports[0].device.viewport, undefined);
    assert.equal((await admin(e, '/v1/admin/reports/' + report().id, e.ADMIN_TOKEN, 'DELETE')).status, 204);
    assert.equal(e.DB.reports.size, 0);
});
test('Rate limit and no service secrets fails closed', async () => {
    const e = env();
    const payload = { consent: true, report: report() };
    for (let attempt = 0; attempt < 12; attempt++) assert.equal((await post(e, payload)).status, 202);
    assert.equal((await post(e, payload)).status, 429);
    const missing = env(); missing.RATE_LIMIT_KEY = '';
    assert.equal((await post(missing, payload)).status, 503);
    missing.ADMIN_TOKEN = '';
    assert.equal((await admin(missing, '/v1/admin/summary')).status, 503);
});
test('CORS preflight and retention cleanup', async () => {
    const e = env();
    const response = await worker.fetch(new Request('https://collector.example.test/v1/reports', { method: 'OPTIONS',
        headers: { Origin: e.PUBLIC_ORIGIN } }), e);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), e.PUBLIC_ORIGIN);
    await post(e, { consent: true, report: report() });
    e.DB.reports.get(report().id).received_at = '2020-01-01T00:00:00.000Z';
    await worker.scheduled({}, e);
    assert.equal(e.DB.reports.size, 0);
});

test('Leaderboard stores opted-in community scores, never invented Legends, and hides report data', async () => {
    const e = env();
    const path = 'https://collector.example.test/v1/leaderboard';
    const base = { consent: true, id: 'score-test-12345', nickname: 'Rune Scout', score: 7200, version: '0.0.84' };
    const send = (payload, origin = e.PUBLIC_ORIGIN) => worker.fetch(new Request(path, { method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.5' },
        body: JSON.stringify(payload)
    }), e);

    assert.equal((await send({ ...base, consent: false })).status, 400);
    assert.equal((await send({ ...base, nickname: 'test@example.com' })).status, 400);
    assert.equal((await send(base, 'https://attacker.invalid')).status, 403);
    for (const nickname of ['FuckMage', 'KankerMage', 'f_u_c_k', 'Sh1t']) assert.equal((await send({...base, nickname})).status, 400);
    assert.equal((await send(base)).status, 202);
    const duplicate = await (await send(base)).json();
    assert.equal(duplicate.duplicate, true);
    assert.equal(e.DB.scores.size, 1);
    const response = await worker.fetch(new Request(path), e);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), e.PUBLIC_ORIGIN === undefined ? null : null);
    const browserResponse = await worker.fetch(new Request(path, { headers: { Origin: e.PUBLIC_ORIGIN } }), e);
    assert.equal(browserResponse.headers.get('Access-Control-Allow-Origin'), e.PUBLIC_ORIGIN);
    const board = await response.json();
    assert.deepEqual(board.entries, [{ name: 'Rune Scout', score: 7200, version: '0.0.84', type: 'community', verified: false }]);
    assert.equal(JSON.stringify(board).includes('score-test-12345'), false);
    const preflight = await worker.fetch(new Request(path, { method: 'OPTIONS', headers: { Origin: e.PUBLIC_ORIGIN } }), e);
    assert.equal(preflight.status, 204);
    assert.equal(e.DB.reports.size, 0);
});

test('Organizer can list and delete consented scores without exposing feedback', async () => {
    const e = env();
    e.DB.scores.set('score-00001', { id: 'score-00001', nickname: 'Run Tester', score: 1200,
        game_version: '0.0.84', created_at: '2026-10-08T12:00:00Z' });
    assert.equal((await admin(e, '/v1/admin/leaderboard', 'bad-key')).status, 401);
    const list = await (await admin(e, '/v1/admin/leaderboard')).json();
    assert.equal(list.entries[0].id, 'score-00001');
    assert.equal((await admin(e, '/v1/admin/leaderboard/score-00001', e.ADMIN_TOKEN, 'DELETE')).status, 204);
    assert.equal(e.DB.scores.size, 0);
});
