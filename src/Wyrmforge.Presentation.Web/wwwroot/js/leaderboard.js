// Public game scores use the editable player nickname. Demo entries stay out of the database.
import { validateName } from './name-policy.js';
export { validateName } from './name-policy.js';
const profileKey = 'wyrmforge.player-name.v1';
const cookieKey = 'wyrmforge_player_name';
const pendingKey = 'wyrmforge.hall-of-fame.pending.v1';
let currentName = 'Wyrm Wanderer';
export function getPlayerName() {
    try {
        const cookie = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieKey}=`));
        const name = cookie ? decodeURIComponent(cookie.slice(cookieKey.length + 1)) : localStorage.getItem(profileKey);
        if (name && !validateName(name)) return setPlayerName(name);
    } catch { }
    return setPlayerName(currentName);
}
export function setPlayerName(value) {
    if (validateName(value)) return currentName;
    currentName = value.trim();
    try {
        const base = new URL('.', document.baseURI);
        document.cookie = `${cookieKey}=${encodeURIComponent(currentName)};Path=${base.pathname};Max-Age=31536000;SameSite=Lax${base.protocol === 'https:' ? ';Secure' : ''}`;
        localStorage.removeItem(profileKey);
    } catch { }
    return currentName;
}
function pending() {
    try { const rows = JSON.parse(localStorage.getItem(pendingKey) ?? '[]'); return Array.isArray(rows) ? rows : []; } catch { return []; }
}
function savePending(rows) { try { localStorage.setItem(pendingKey, JSON.stringify(rows)); } catch { } }
let syncing;
export function recordRun(score, version) {
    if (!Number.isSafeInteger(score) || score < 1 || score > 2000000) return;
    const nickname = getPlayerName();
    saveLocal(nickname, score);
    savePending([...pending(), { id: crypto.randomUUID(), nickname, score, version }].slice(-20));
    void flush();
}
export function flush() {
    return syncing ??= syncPending().finally(() => { syncing = null; });
}
async function syncPending() {
    for (const row of pending()) {
        const result = await publish(row.nickname, row.score, row.version, row.id);
        if (result === 'invalid') { savePending(pending().filter(item => item.id !== row.id)); continue; }
        if (result !== 'sent') return result;
        savePending(pending().filter(item => item.id !== row.id));
    }
    return 'sent';
}

const key = 'wyrmforge.hall-of-fame.local.v1';
const legends = [
    { name: 'ASHEN WARDEN', score: 1850, type: 'LEGEND · DEMO' },
    { name: 'STORM SCRIBE', score: 1320, type: 'LEGEND · DEMO' },
    { name: 'FROST WAYFARER', score: 740, type: 'LEGEND · DEMO' },
    { name: 'VOID SPARK', score: 310, type: 'LEGEND · DEMO' }
];
async function endpoint() {
    const response = await fetch(new URL('playtest-collector-config.json', document.baseURI), { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw Error('No feedback collector config');
    const config = await response.json();
    const uri = new URL(config.endpoint);
    if (uri.protocol !== 'https:' || uri.pathname !== '/v1/reports' || uri.search || uri.hash) throw Error('Untrusted collector URL');
    uri.pathname = '/v1/leaderboard';
    return uri.href;
}
function local() {
    try {
        const saved = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(saved) ? saved.filter(x => x && !validateName(x.name) && Number.isInteger(x.score))
            .slice(-12).map(x => ({ name: x.name, score: x.score, type: 'LOCAL ONLY' })) : [];
    } catch { return []; }
}
function saveLocal(name, score) {
    try { localStorage.setItem(key, JSON.stringify([...local(), { name, score }].slice(-12))); } catch { }
}
export async function load() {
    let community = [];
    try {
        const url = await endpoint();
        const response = await fetch(url, { mode: 'cors', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(6000) });
        if (response.ok) {
            const result = await response.json();
            if (Array.isArray(result.entries)) community = result.entries
                .filter(x => !validateName(x.name) && Number.isInteger(x.score))
                .map(x => ({ name: x.name, score: x.score, type: 'COMMUNITY · UNVERIFIED' }));
        }
    } catch { /* The local board remains functional offline. */ }
    return [...community, ...legends, ...local().filter(row => !community.some(entry => entry.name === row.name && entry.score === row.score))].sort((a,b) => b.score - a.score).slice(0,19);
}
export async function publish(nickname, score, version, id = crypto.randomUUID()) {
    if (validateName(nickname) || !Number.isSafeInteger(score) || score < 1 || score > 2000000) return 'invalid';
    try {
        const url = await endpoint();
        const response = await fetch(url, {
            method: 'POST', mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(6000), cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consent: true, id, nickname, score, version })
        });
        if (response.status === 429) return 'rate_limited';
        if (response.status === 202) {
            const receipt = await response.json();
            if (receipt?.accepted === true) return 'sent';
        }
    } catch { /* Keep only a device-local copy if the network is unavailable. */ }
    return 'local';
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { void flush(); });
    window.setInterval(() => { if (document.visibilityState === 'visible' && pending().length) void flush(); }, 60000);
}
