import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/playtest.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 15));

function harness() {
    const values = new Map();
    const sent = [];
    const store = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
    const root = { wyrmforgePlaytest: null };
    const config = 'https://collector.example.test/v1/reports';
    const context = {
        window: root, localStorage: store, crypto: webcrypto, Date, Math, JSON,
        Number, Array, Object, String, TextEncoder, URL, AbortController, setTimeout, clearTimeout,
        matchMedia: () => ({ matches: false }), innerWidth: 390, innerHeight: 844,
        document: { baseURI: 'https://game.example.test/Wyrmforge/',
            querySelector: () => ({ getAttribute: () => '0.0.84' }) },
        fetch: async (url, options) => {
            if (typeof url !== 'string') url = url.toString();
            if (url.endsWith('playtest-collector-config.json'))
                return { ok: true, json: async () => ({ endpoint: config }) };
            assert.equal(url, config);
            const payload = JSON.parse(options.body);
            sent.push(payload);
            return { ok: true, status: 202, json: async () => ({ accepted: true, id: payload.report.id }) };
        }
    };
    runInNewContext(source, context, { filename: 'playtest.js' });
    return { api: root.wyrmforgePlaytest, values, sent };
}
const ai = () => ({
    frames: 300, population: 64, sightQueriesMax: 32, pathQueriesMax: 32, committedMax: 2,
    meanMs: 4.97, p95Ms: 7.31, maxMs: 45.3, resolvedDamage: 16, damagePeak: 8,
    observedAgents: 32, recordedDecisions: 40, actionDiversity: 15, maxDecisionLatencyTicks: 3,
    playerName: 'SHOULD NEVER BE COPIED', rawPositions: [[100, 200]]
});
const summary = () => ({ outcome: 'Defeated', seed: 42, score: 400, seconds: 30, kills: 18 });

test('AI metrics are sampled automatically into local history but never uploaded without prior opt-in', async () => {
    const h = harness();
    assert.equal(h.api.getAiAutoConsent(), false);
    h.api.startRun(false);
    h.api.aiSample(ai());
    h.api.aiSample({ ...ai(), frames: 600, population: 60, p95Ms: 6.2 });
    h.api.finishRun(summary());
    await tick();
    assert.equal(h.sent.length, 0);
    const report = h.api.buildReport({ includeRuns: true });
    assert.equal(report.recentRuns.length, 1);
    assert.equal(report.recentRuns[0].ai.samples, 2);
    assert.equal(report.recentRuns[0].ai.population, 64);
    assert.equal(report.recentRuns[0].ai.p95Ms, 7.3);
    assert.equal(report.recentRuns[0].ai.rawPositions, undefined);
    assert.equal(report.recentRuns[0].ai.playerName, undefined);
});

test('one explicit opt-in sends each completed AI run without free text, stable IDs or a full clickstream', async () => {
    const h = harness();
    assert.equal(h.api.setAiAutoConsent(true), true);
    h.api.startRun(false);
    h.api.aiSample(ai());
    h.api.finishRun(summary());
    await tick();
    assert.equal(h.sent.length, 1);
    assert.equal(h.sent[0].consent, true);
    assert.equal(h.sent[0].report.recentRuns.length, 1);
    assert.equal(h.sent[0].report.recentRuns[0].ai.committedMax, 2);
    assert.equal(h.sent[0].report.feedback.bestMoment, '');
    assert.equal(h.sent[0].report.stats.starts, 0);
    assert.equal(h.sent[0].report.device.viewport, undefined,
        'Do not transmit full viewport dimensions or device fingerprint for automatic AI reports.');
    assert.equal(h.sent[0].report.recentRuns[0].startedAt, undefined);
    assert.equal(h.sent[0].report.recentRuns[0].milestones, undefined);
    assert.equal(h.sent[0].report.createdUtc, undefined);
    assert.equal(h.sent[0].report.recentRuns[0].ai.playerName, undefined);
    const sentRunId = h.sent[0].report.recentRuns[0].runId;
    assert.notEqual(sentRunId, h.api.buildReport({ includeRuns: true }).recentRuns[0].runId);

    h.api.setAiAutoConsent(false);
    h.api.startRun(false);
    h.api.aiSample(ai());
    h.api.finishRun(summary());
    await tick();
    assert.equal(h.sent.length, 1, 'Revoking consent stops future automatic uploads.');
    h.api.setAiAutoConsent(true);
    h.api.clear();
    assert.equal(h.api.getAiAutoConsent(), false, 'Erasing local history also revokes opt-in.');
});

test('opt-in without AI frames never uploads empty or unrelated gameplay', async () => {
    const h = harness();
    h.api.setAiAutoConsent(true);
    h.api.startRun(false);
    h.api.aiSample({ ...ai(), frames: 0 });
    h.api.finishRun(summary());
    await tick();
    assert.equal(h.sent.length, 0);
});
