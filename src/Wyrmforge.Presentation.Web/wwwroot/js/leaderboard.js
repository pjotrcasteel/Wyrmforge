// Public opt-in community scores; fictional seed characters NEVER enter the database.
// No passive score upload, player identity, browser fingerprint, or telemetry.
const key = 'wyrmforge.hall-of-fame.local.v1';
const legends = [
    { name: 'ASHEN WARDEN', score: 1850, type: 'LEGEND · DEMO' },
    { name: 'STORM SCRIBE', score: 1320, type: 'LEGEND · DEMO' },
    { name: 'FROST WAYFARER', score: 740, type: 'LEGEND · DEMO' },
    { name: 'VOID SPARK', score: 310, type: 'LEGEND · DEMO' }
];
async function endpoint() {
    const response = await fetch(new URL('playtest-collector-config.json', document.baseURI), { cache: 'no-store', credentials: 'omit' });
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
        return Array.isArray(saved) ? saved.filter(x => x && typeof x.name === 'string' && Number.isInteger(x.score))
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
        const response = await fetch(url, { mode: 'cors', cache: 'no-store', credentials: 'omit' });
        if (response.ok) {
            const result = await response.json();
            if (Array.isArray(result.entries)) community = result.entries
                .filter(x => typeof x.name === 'string' && Number.isInteger(x.score))
                .map(x => ({ name: x.name, score: x.score, type: 'COMMUNITY · UNVERIFIED' }));
        }
    } catch { /* The local board remains functional offline. */ }
    return [...community, ...legends, ...local()].sort((a,b) => b.score - a.score).slice(0,19);
}
export async function publish(nickname, score, version) {
    if (!/^[A-Za-z0-9 _-]{2,18}$/.test(nickname) || !Number.isSafeInteger(score) || score < 1 || score > 2000000) return 'invalid';
    const id = crypto.randomUUID();
    try {
        const url = await endpoint();
        const response = await fetch(url, {
            method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consent: true, id, nickname, score, version })
        });
        if (response.status === 429) return 'rate_limited';
        if (response.status === 202) {
            const receipt = await response.json();
            if (receipt?.accepted === true) return 'sent';
        }
    } catch { /* Keep only a device-local copy if the network is unavailable. */ }
    saveLocal(nickname, score);
    return 'local';
}
