// The boot veil is the single owner of first-frame readiness. It is also reused
// for the first transition from Welcome/Character Creation into the actual town.
// No lab, Hunt, or alternate route is forced to wait for town artwork.
(() => {
    const splash = document.getElementById('wyrmforge-ignition');
    const status = document.getElementById('ignition-status');
    const retry = document.getElementById('ignition-retry');
    const app = document.getElementById('app');
    let townEntry = false;
    let townWaitStarted = false;
    let generation = 0;

    const nextPaint = () => new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)));

    function until(predicate) {
        return new Promise((resolve, reject) => {
            const observer = new MutationObserver(check);
            function check() {
                try {
                    if (!predicate()) return;
                    observer.disconnect();
                    resolve();
                } catch (error) {
                    observer.disconnect();
                    reject(error);
                }
            }
            observer.observe(app, {
                childList: true, subtree: true, attributes: true,
                attributeFilter: ['data-town-navigation-settled', 'data-town-foreground-ready',
                    'data-town-png-ready', 'src'],
            });
            check();
        });
    }

    async function decoded(image) {
        if (!image.complete) {
            await new Promise((resolve, reject) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', () => reject(new Error('Town artwork failed to load.')), { once: true });
            });
        }
        if (!image.naturalWidth) throw new Error('Town artwork is missing or damaged.');
        if (typeof image.decode === 'function') await image.decode();
    }

    async function townReady(scene) {
        await until(() => !scene.isConnected || scene.dataset.townNavigationSettled === 'true');
        if (!scene.isConnected) return;
        // The existing C# foreground mount cuts transparent depth layers from the
        // decoded panorama; do not show the unlayered town before that work settles.
        await until(() => !scene.isConnected || !scene.querySelector('.refuge-town-png-cutout') ||
            scene.dataset.townForegroundReady === 'true');
        if (!scene.isConnected) return;
        const base = scene.querySelector('.refuge-town-night-base');
        if (!base) throw new Error('The approved Refuge panorama was not rendered.');
        const images = [...scene.querySelectorAll('img[src]')];
        await Promise.all(images.map(decoded));
        // SVG depth masks can reference a separate asset; include these in readiness.
        const svgSources = [...scene.querySelectorAll('svg image[href]')]
            .map(image => image.getAttribute('href')).filter(Boolean);
        await Promise.all([...new Set(svgSources)].map(url => {
            const image = new Image();
            image.src = new URL(url, document.baseURI).href;
            return decoded(image);
        }));
    }

    async function reveal() {
        document.body.classList.remove('igniting');
        // The complete town is allowed to composite behind the opaque veil before
        // the veil fades. Decoded images alone are not a painted iPhone Safari frame.
        await nextPaint();
        splash.classList.add('ignition-complete');
        splash.setAttribute('aria-hidden', 'true');
    }

    function fail(error) {
        console.error('Refuge startup not ready.', error);
        splash.classList.add('ignition-failed');
        status.textContent = 'THE REFUGE COULD NOT LOAD';
        retry.hidden = false;
    }

    async function revealInitial() {
        await until(() => app.querySelector('.refuge-canonical-scene, .arrival-reference-art, .character-creation, .game-shell, main'));
        const scene = app.querySelector('.refuge-canonical-scene');
        const welcome = app.querySelector('.arrival-reference-art');
        if (scene) {
            status.textContent = 'PREPARING THE REFUGE';
            await townReady(scene);
        } else if (welcome) {
            status.textContent = 'PREPARING THE ARRIVAL';
            await decoded(welcome);
        }
        await reveal();
    }

    function beginTown() {
        generation++;
        townEntry = true;
        townWaitStarted = false;
        splash.classList.remove('ignition-complete', 'ignition-failed');
        splash.setAttribute('aria-hidden', 'false');
        document.body.classList.add('igniting');
        retry.hidden = true;
        status.textContent = 'PREPARING THE REFUGE';
    }

    function townRendered() {
        if (!townEntry || townWaitStarted) return;
        const scene = app.querySelector('.refuge-canonical-scene');
        if (!scene) return;
        townWaitStarted = true;
        const current = generation;
        townReady(scene).then(async () => {
            if (current !== generation) return;
            await reveal();
            if (current === generation) {
                townEntry = false;
                townWaitStarted = false;
            }
        }).catch(error => {
            if (current === generation) fail(error);
        });
    }

    window.wyrmforgeStartup = { revealInitial, beginTown, townRendered };
})();
