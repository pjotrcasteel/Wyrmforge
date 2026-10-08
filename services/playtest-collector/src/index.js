// Cloudflare Worker: explicit-consent feedback intake. No automatic/passive telemetry.
const REPORT_SCHEMA = 'wyrmforge.playtest.report.v1';
const MAX_BYTES = 32 * 1024;
const MAX_RUNS = 12;
const MAX_PER_HOUR = 12;
const fields = new Set(['onboarding', 'movement', 'combat', 'rewards', 'forge', 'wyrms', 'performance', 'other']);
const outcomes = new Set(['Extracted', 'Defeated', 'Abandoned', 'Interrupted', 'Unknown']);
const milestones = new Set(['trail_entered', 'wyrm_entered', 'refuge_reached', 'descended', 'extracted']);
const identifier = /^[a-zA-Z0-9-]{8,100}$/;
const nicknameFormat = /^[a-zA-Z0-9 _-]{2,18}$/;

function json(value, status = 200, headers = {}) {
    return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
function reject(status, code, headers = {}) { return json({ error: code }, status, headers); }
function cors(origin) {
    return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin' };
}
function int(value, max = 1000000) { return Number.isInteger(value) && value >= 0 ? Math.min(value, max) : 0; }
function string(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function rating(value) { return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null; }
function enumValue(value, allowed) { return allowed.has(value) ? value : null; }

export function sanitizeReport(report) {
    if (!report || typeof report !== 'object' || Array.isArray(report) || report.schema !== REPORT_SCHEMA ||
        typeof report.id !== 'string' || !identifier.test(report.id) ||
        typeof report.feedback !== 'object' || !report.feedback || Array.isArray(report.feedback) ||
        !Array.isArray(report.recentRuns) || report.recentRuns.length > MAX_RUNS) return null;

    const feedback = report.feedback;
    const stats = report.stats && typeof report.stats === 'object' && !Array.isArray(report.stats) ? report.stats : {};
    const device = report.device && typeof report.device === 'object' && !Array.isArray(report.device) ? report.device : {};
    const kind = device.kind === 'touch' || device.kind === 'pointer' ? device.kind : 'unknown';
    const recentRuns = [];
    for (const run of report.recentRuns) {
        if (!run || typeof run !== 'object' || Array.isArray(run) ||
            typeof run.runId !== 'string' || !identifier.test(run.runId)) return null;
        recentRuns.push({
            runId: run.runId, outcome: enumValue(run.outcome, outcomes) ?? 'Unknown',
            seed: int(run.seed, 2147483647), score: int(run.score), durationSeconds: int(run.durationSeconds, 86400),
            depth: int(run.depth, 100), level: int(run.level, 500), kills: int(run.kills),
            trailsCompleted: int(run.trailsCompleted, 1000), rareTrails: int(run.rareTrails, 1000),
            wyrmsDefeated: int(run.wyrmsDefeated, 100), essencesSecured: int(run.essencesSecured, 100),
            ascendantVictories: int(run.ascendantVictories, 10), ascendantRite: run.ascendantRite === true,
            milestones: Array.isArray(run.milestones) ? run.milestones.filter(v => milestones.has(v)).slice(0, 30) : [],
            spellEvolutions: Array.isArray(run.spellEvolutions) ?
                run.spellEvolutions.filter(v => typeof v === 'string').map(v => string(v, 40)).slice(0, 12) : [],
            perf: { samples: int(run.perf?.samples), slowFrames: int(run.perf?.slowFrames),
                maxBridgeMs: int(run.perf?.maxBridgeMs, 10000) }
        });
    }
    return {
        schema: REPORT_SCHEMA, id: report.id,
        gameVersion: string(report.gameVersion, 30),
        device: { kind, standalone: device.standalone === true },
        feedback: {
            enjoyment: rating(feedback.enjoyment), clarity: rating(feedback.clarity),
            replay: enumValue(feedback.replay, new Set(['yes', 'maybe', 'no'])),
            troubleArea: enumValue(feedback.troubleArea, fields),
            bestMoment: string(feedback.bestMoment, 600), improvement: string(feedback.improvement, 1000)
        },
        stats: {
            starts: int(stats.starts), completedRuns: int(stats.completedRuns),
            interruptedRuns: int(stats.interruptedRuns), trailsEntered: int(stats.trailsEntered),
            wyrmGatesEntered: int(stats.wyrmGatesEntered)
        }, recentRuns
    };
}
async function readCapped(request) {
    const reader = request.body?.getReader();
    if (!reader) return null;
    const chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); return null; }
        chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
}
async function bucketFor(ip, key, hour) {
    const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const bytes = await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(hour + ':' + ip));
    return [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
}
async function equalSecret(a, b) {
    if (!a || !b) return false;
    const encode = new TextEncoder();
    const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', encode.encode(a)),
        crypto.subtle.digest('SHA-256', encode.encode(b))]);
    return [...new Uint8Array(x)].every((v, i) => v === new Uint8Array(y)[i]);
}
async function submit(request, env, headers) {
    if (!env.DB || !env.RATE_LIMIT_KEY) return reject(503, 'collector_not_configured', headers);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reject(415, 'json_required', headers);
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return reject(413, 'too_large', headers);
    let payload;
    try {
        const body = await readCapped(request);
        if (body === null) return reject(413, 'too_large', headers);
        payload = JSON.parse(body);
    } catch { return reject(400, 'invalid_json', headers); }
    if (payload?.consent !== true) return reject(400, 'explicit_consent_required', headers);
    const report = sanitizeReport(payload.report);
    if (!report) return reject(400, 'invalid_report', headers);

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const hour = Math.floor(Date.now() / 3600000);
    const bucket = await bucketFor(ip, env.RATE_LIMIT_KEY, hour);
    const limited = await env.DB.prepare(`INSERT INTO rate_limits (bucket,hits,expires_at) VALUES (?,1,?)
        ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits < ${MAX_PER_HOUR}`).bind(bucket, (hour + 2) * 3600).run();
    if (!limited.meta?.changes) return reject(429, 'rate_limited', { ...headers, 'Retry-After': '3600' });

    const now = new Date().toISOString();
    const result = await env.DB.prepare(`INSERT OR IGNORE INTO reports
        (id,received_at,version,kind,enjoyment,clarity,replay,trouble_area,starts,completed_runs,interrupted_runs,recent_run_count,data)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(report.id, now, report.gameVersion, report.device.kind, report.feedback.enjoyment,
        report.feedback.clarity, report.feedback.replay, report.feedback.troubleArea, report.stats.starts,
        report.stats.completedRuns, report.stats.interruptedRuns, report.recentRuns.length, JSON.stringify(report)).run();
    return json({ accepted: true, id: report.id, duplicate: result.meta?.changes === 0 }, 202, headers);
}
async function leaderboard(request, env, origin) {
    if (!env.DB) return reject(503, 'leaderboard_unavailable');
    if (request.method === 'GET') {
        const results = await env.DB.prepare('SELECT nickname,score,game_version FROM leaderboard_entries ORDER BY score DESC,created_at ASC LIMIT 20').all();
        return json({ entries: results.results.map(entry => ({ name: entry.nickname, score: entry.score,
            version: entry.game_version, type: 'community', verified: false })) }, 200,
            origin === env.PUBLIC_ORIGIN ? cors(origin) : {});
    }
    if (!origin || origin !== env.PUBLIC_ORIGIN) return reject(403, 'origin_not_allowed');
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reject(405, 'method_not_allowed', headers);
    if (!env.RATE_LIMIT_KEY) return reject(503, 'leaderboard_unavailable', headers);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reject(415, 'json_required', headers);

    let payload;
    try {
        const body = await readCapped(request);
        if (!body) return reject(400, 'invalid_json', headers);
        payload = JSON.parse(body);
    } catch { return reject(400, 'invalid_json', headers); }

    const name = string(payload?.nickname, 80);
    if (payload?.consent !== true || typeof payload?.id !== 'string' || !identifier.test(payload.id) ||
        !nicknameFormat.test(name) || !Number.isSafeInteger(payload.score) || payload.score < 1 || payload.score > 2000000 ||
        !/^0\.0\.[0-9]{1,3}$/.test(payload.version ?? '')) return reject(400, 'invalid_entry', headers);

    const hour = Math.floor(Date.now() / 3600000);
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const bucket = await bucketFor(ip, env.RATE_LIMIT_KEY, 'leaderboard:' + hour);
    const limit = await env.DB.prepare('INSERT INTO rate_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits < 5')
        .bind(bucket, (hour + 2) * 3600).run();
    if (!limit.meta?.changes) return reject(429, 'rate_limited', headers);

    const inserted = await env.DB.prepare('INSERT OR IGNORE INTO leaderboard_entries (id,nickname,score,game_version,created_at) VALUES (?,?,?,?,?)')
        .bind(payload.id, name, payload.score, payload.version, new Date().toISOString()).run();
    return json({ accepted: true, duplicate: inserted.meta?.changes === 0 }, 202, headers);
}

async function admin(request, env, url) {
    if (!env.ADMIN_TOKEN || !env.DB) return reject(503, 'admin_not_configured');
    const authorization = request.headers.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ') || !(await equalSecret(authorization.slice(7), env.ADMIN_TOKEN))) return reject(401, 'unauthorized');
    if (request.method === 'GET' && url.pathname === '/v1/admin/summary') {
        const aggregate = await env.DB.prepare(`SELECT COUNT(*) AS reports,ROUND(AVG(enjoyment),2) AS enjoyment,
            ROUND(AVG(clarity),2) AS clarity,SUM(completed_runs) AS reportedRunCounts,
            SUM(recent_run_count) AS sharedRunSamples FROM reports`).first();
        const issues = await env.DB.prepare(`SELECT trouble_area AS area,COUNT(*) AS count FROM reports
            WHERE trouble_area IS NOT NULL GROUP BY trouble_area ORDER BY count DESC`).all();
        const intent = await env.DB.prepare(`SELECT replay,COUNT(*) AS count FROM reports
            WHERE replay IS NOT NULL GROUP BY replay ORDER BY count DESC`).all();
        return json({ aggregate, issues: issues.results, replayIntent: intent.results });
    }
    if (request.method === 'GET' && url.pathname === '/v1/admin/reports') {
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
        const rows = await env.DB.prepare('SELECT id,received_at,data FROM reports ORDER BY received_at DESC LIMIT ?').bind(limit).all();
        return json({ reports: rows.results.map(row => ({ receivedUtc: row.received_at, ...JSON.parse(row.data) })) });
    }
    if (request.method === 'DELETE' && url.pathname.startsWith('/v1/admin/reports/')) {
        const id = url.pathname.slice('/v1/admin/reports/'.length);
        if (!identifier.test(id)) return reject(400, 'invalid_id');
        await env.DB.prepare('DELETE FROM reports WHERE id = ?').bind(id).run();
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }
    return reject(404, 'not_found');
}
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/health' && request.method === 'GET') return json({ status: 'ok', service: 'wyrmforge-feedback' });
        if (url.pathname.startsWith('/v1/admin/')) return admin(request, env, url);
        if (url.pathname === '/v1/leaderboard') {
            try { return await leaderboard(request, env, request.headers.get('origin')); }
            catch { return reject(503, 'leaderboard_unavailable'); }
        }
        if (url.pathname !== '/v1/reports') return reject(404, 'not_found');
        const origin = request.headers.get('origin');
        if (!origin || origin !== env.PUBLIC_ORIGIN) return reject(403, 'origin_not_allowed');
        const headers = cors(origin);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
        if (request.method !== 'POST') return reject(405, 'method_not_allowed', headers);
        try { return await submit(request, env, headers); }
        catch { return reject(503, 'temporarily_unavailable', headers); }
    },
    async scheduled(_event, env) {
        const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
        await env.DB.prepare('DELETE FROM reports WHERE received_at < ?').bind(cutoff).run();
        await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(Math.floor(Date.now() / 1000)).run();
    }
};
