// The initial ceremony and welcome-to-town transition share one real readiness gate.
// This module never runs a game simulation and never gates development/lab routes.
const READY_TIMEOUT_MS = 90000;

function observeUntil(predicate, root = document, timeoutMs = READY_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let observer;
        let timeout;
        const finish = (error, value) => {
            if (settled) return;
            settled = true;
            observer?.disconnect();
            clearTimeout(timeout);
            if (error) reject(error);
            else resolve(value);
        };
        const inspect = () => {
            if (settled) return;
            try {
                const value = predicate();
                if (value) finish(null, value);
            } catch (error) {
                finish(error);
            }
        };
        observer = new MutationObserver(inspect);
        observer.observe(root, {
            subtree: true, childList: true, attributes: true,
            attributeFilter: ['src', 'href', 'data-wyrmforge-home-loaded',
                'data-town-navigation-ready', 'data-town-cutouts-status', 'data-town-png-ready']
        });
        timeout = setTimeout(() => finish(new Error('Town scene did not become ready; retry is available.')), timeoutMs);
        inspect();
    });
}

export function isTownStructureReady(scene) {
    if (!scene || scene.getAttribute('data-town-navigation-ready') !== 'true') return false;
    if (!scene.querySelector('.refuge-town-night-base')) return false;
    const cutouts = scene.querySelectorAll('[data-town-cutout]');
    if (cutouts.length > 0 && !['ready', 'fallback'].includes(scene.dataset.townCutoutsStatus))
        return false;
    if (scene.querySelector('[data-town-v2-canvas]') &&
        /loading/i.test(scene.querySelector('[data-town-v2-status]')?.textContent ?? 'loading'))
        return false;
    return true;
}

export async function decodeImage(image) {
    // complete === true also describes a broken resource: always check naturalWidth.
    if (image.complete && image.naturalWidth === 0)
        throw new Error('A required town texture failed to load: ' + (image.currentSrc || image.src));
    if (typeof image.decode === 'function') {
        await image.decode();
    } else if (!image.complete) {
        await new Promise((resolve, reject) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', () => reject(new Error('A required town texture failed to load.')),
                { once: true });
        });
    }
    if (!image.naturalWidth) throw new Error('A required town texture could not be decoded.');
}

function townSources(scene) {
    const images = [...scene.querySelectorAll('img[src]')].filter(img => img.getAttribute('src'));
    const svgSources = [...new Set([...scene.querySelectorAll('svg image[href], svg image[xlink\\:href]')]
        .map(node => node.getAttribute('href') || node.getAttribute('xlink:href'))
        .filter(href => href && !href.startsWith('#')))];
    return { images, svgSources };
}

async function decodeSvgSources(sources) {
    await Promise.all(sources.map(async src => {
        const image = new Image();
        image.src = src;
        await decodeImage(image);
    }));
}

function sourceFingerprint(scene) {
    const { images, svgSources } = townSources(scene);
    return [...images.map(img => img.currentSrc || img.src), ...svgSources].join('|');
}

function afterPaint() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export async function waitForTownScene(root = document) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const scene = await observeUntil(() => {
            const current = root.querySelector('.refuge-canonical-scene');
            return isTownStructureReady(current) ? current : null;
        }, root);
        const before = sourceFingerprint(scene);
        const { images, svgSources } = townSources(scene);
        await Promise.all([...images.map(decodeImage), decodeSvgSources(svgSources)]);
        await afterPaint();
        if (scene.isConnected && isTownStructureReady(scene) && before === sourceFingerprint(scene))
            return;
    }
    throw new Error('Town artwork continued to change during the first complete render.');
}

export async function waitForInitialScene(root = document) {
    // Home restores progression before choosing between the welcome illustration,
    // character creation and the already-unlocked town. Do not reveal stale art.
    await observeUntil(() => root.querySelector('[data-wyrmforge-home-loaded="true"]'), root);
    const scene = await observeUntil(() =>
        root.querySelector('.refuge-canonical-scene, .arrival-reference-art, .character-creation, .menu-nexus, .game-screen'),
        root);
    if (scene.matches('.refuge-canonical-scene')) {
        await waitForTownScene(root);
    } else if (scene.matches('.arrival-reference-art')) {
        await decodeImage(scene);
        await afterPaint();
    } else {
        await afterPaint();
    }
}

export async function waitForTownOrCreation(root = document) {
    const scene = await observeUntil(() =>
        root.querySelector('.refuge-canonical-scene, .character-creation'), root);
    if (scene.matches('.refuge-canonical-scene')) await waitForTownScene(root);
    else await afterPaint();
}
