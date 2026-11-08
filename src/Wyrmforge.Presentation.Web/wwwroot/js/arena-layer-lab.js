// Opt-in, read-only renderer diagnostics for physical iPhone Safari Hunts.
// ?layerLab=1 shows independent render-layer switches. Never changes C# game or voxel data.
export const LAYER_OPTIONS = Object.freeze([
    ['gpu', 'WebGL GPU composite', 'Turn off the GPU renderer and use the existing Canvas2D fallback'],
    ['incremental', 'Incremental crater repaint', 'OFF: repaint the whole ground whenever terrain changes, including future craters (slower diagnostic workaround)'],
    ['excavation', 'Excavated microvoxels', 'Repaint original grass/road instead of post-impact terrain'],
    ['faces', 'Voxel side faces', 'Hide vertical dirt/stone cliff and crater faces'],
    ['decals', 'Baked ground decals', 'Hide authored litter, roots and ground decoration'],
    ['bakedShadows', 'Baked terrain shadows', 'Hide top-face contact shadow and depth cues'],
    ['albedo', 'Ground albedo texture', 'Show neutral ground instead of textured terrain'],
    ['normals', 'GPU ground normal map', 'Disable normal-map contribution to lighting'],
    ['emissive', 'GPU ground glow', 'Disable cracks/heat/bedrock emissive map and fallback glow'],
    ['crackVeins', 'Heat-crack veins', 'Hide only the C#-generated angular crack lines and their halo, preserving lava, crater heat and bedrock glow'],
    ['damageFx', 'Post-impact particles/heat', 'Disable post-impact cosmetic damage FX only'],
    ['groundFx', 'Pre-composite ground overlays', 'Hide telegraphs, dust and other Canvas ground overlays'],
    ['postGpuFx', 'Post-GPU ground overlays', 'Hide effects drawn after the lit GPU composite'],
    ['scenery', 'Trees, torches and scenery', 'Hide scenery captures; does not remove physical collision'],
    ['actors', 'Actors and enemies', 'Hide actor captures; gameplay and enemy damage continue'],
]);

const VALID = new Set(LAYER_OPTIONS.map(([key]) => key));
const RASTER_SWITCHES = new Set(['incremental', 'excavation', 'faces', 'decals', 'bakedShadows']);

/** GPU/overlay switches must NOT silently repair the terrain canvas: doing so hides the culprit. */
export function layerLabRequiresTerrainRebuild(key) { return RASTER_SWITCHES.has(key); }
const disabled = new Set();
let view = 'lit';
let generation = 0;

export function layerLabRequested(search = globalThis.location?.search ?? '') {
    return new URLSearchParams(search).get('layerLab') === '1';
}

const active = layerLabRequested();

export function layerLabEnabled(key) {
    return !active || !disabled.has(key);
}

/** Preserve the actual GPU instance: using && with a final boolean turns the renderer into true. */
export function selectHuntGpuWorld(lighting, gpuWorld) {
    return lighting && layerLabEnabled('gpu') ? gpuWorld ?? null : null;
}

export function layerLabView() { return active ? view : 'lit'; }
export function layerLabGeneration() { return generation; }

export function setLayerLabEnabled(key, enabled) {
    if (!VALID.has(key)) throw new RangeError('Unknown layer: ' + key);
    if (!active) return;
    if (enabled) disabled.delete(key);
    else disabled.add(key);
    generation++;
}

export function setLayerLabView(value) {
    if (!['lit', 'albedo', 'normals', 'geometry', 'shadow-visibility', 'object-mask'].includes(value))
        throw new RangeError('Unknown GPU inspection pass: ' + value);
    if (active) { view = value; generation++; }
}

export function resetLayerLab() {
    if (!active) return;
    disabled.clear();
    view = 'lit';
    generation++;
}

export function layerLabSnapshot() {
    return { active, disabled: [...disabled], gpuView: layerLabView(), generation };
}

/** Deliberately separate DOM from the game canvas: it remains usable in iOS Safari with no desktop devtools. */
export function mountLayerLab(onChange, onCapture = null) {
    if (!active || typeof document === 'undefined') return null;
    const panel = document.createElement('section');
    panel.setAttribute('aria-label', 'Hunt render layers diagnostic controls');
    panel.style.cssText = 'position:fixed;right:8px;top:calc(env(safe-area-inset-top, 0px) + 64px);' +
        'width:min(318px,85vw);max-height:69dvh;overflow:auto;z-index:2147483646;' +
        'background:rgba(16,15,25,.96);border:1px solid #b49a67;border-radius:10px;' +
        'padding:10px;color:#faf4e8;font:13px/1.35 system-ui,sans-serif;box-shadow:0 2px 20px #000b;' +
        'touch-action:pan-y;overscroll-behavior:contain;';
    const stop = event => event.stopPropagation();
    for (const name of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click'])
        panel.addEventListener(name, stop);

    const top = document.createElement('button');
    top.type = 'button';
    top.style.cssText = 'width:100%;background:#373148;color:#fff;padding:9px 8px;text-align:left;border-radius:6px;border:0;font:600 14px system-ui;';
    panel.appendChild(top);
    const details = document.createElement('div');
    details.style.cssText = 'padding-top:8px;';
    panel.appendChild(details);
    let expanded = true;
    const refreshTitle = () => {
        top.textContent = (disabled.size ? 'OFF: ' + [...disabled].join(', ') : 'LAYERS: all on') +
            (view !== 'lit' ? ' · view=' + view : '') + (expanded ? ' ▴' : ' ▾');
        details.hidden = !expanded;
    };
    top.addEventListener('click', () => { expanded = !expanded; refreshTitle(); });

    const hint = document.createElement('p');
    hint.textContent = 'Hide one layer at a time. For angular ground marks, turn off Heat-crack veins first. No changes to damage or physics.';
    hint.style.cssText = 'margin:2px 0 8px;color:#d6c9b6;font-size:12px;';
    details.appendChild(hint);

    const gpuLabel = document.createElement('label');
    gpuLabel.textContent = 'GPU inspection pass ';
    gpuLabel.style.cssText = 'display:block;margin-bottom:9px;font-weight:600;';
    const select = document.createElement('select');
    select.style.cssText = 'display:block;width:100%;padding:7px;background:#272433;color:#fff;border:1px solid #99886e;border-radius:4px;';
    for (const [value, name] of [['lit', 'Lit (normal Hunt)'], ['albedo', 'Unlit albedo'], ['normals', 'GPU normals'],
        ['geometry', 'Geometry/wireframe'], ['shadow-visibility', 'Shadow visibility'], ['object-mask', 'Object mask']]) {
        const option = document.createElement('option');
        option.value = value; option.textContent = name;
        select.appendChild(option);
    }
    select.value = view;
    select.addEventListener('change', () => { setLayerLabView(select.value); onChange(false); refreshTitle(); });
    gpuLabel.appendChild(select);
    details.appendChild(gpuLabel);

    const boxes = new Map();
    for (const [key, label, explanation] of LAYER_OPTIONS) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;gap:9px;align-items:flex-start;padding:7px 2px;border-top:1px solid #ffffff20;';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.checked = layerLabEnabled(key);
        checkbox.style.cssText = 'min-width:20px;width:20px;height:20px;accent-color:#e3ac54;';
        checkbox.addEventListener('change', () => {
            setLayerLabEnabled(key, checkbox.checked);
            onChange(layerLabRequiresTerrainRebuild(key));
            refreshTitle();
        });
        const text = document.createElement('span');
        const strong = document.createElement('strong');
        strong.textContent = label;
        strong.style.cssText = 'display:block;';
        const small = document.createElement('span');
        small.textContent = explanation;
        small.style.cssText = 'display:block;color:#c6bdb1;font-size:11px;';
        text.append(strong, small);
        row.append(checkbox, text);
        boxes.set(key, checkbox);
        details.appendChild(row);
    }

    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'REBUILD GROUND NOW';
    refresh.style.cssText = 'margin-top:10px;width:100%;padding:11px 6px;background:#284a50;color:#fff;border:1px solid #6faeb3;border-radius:5px;font-weight:700;';
    refresh.addEventListener('click', () => onChange(true));
    details.appendChild(refresh);

    let evidenceUrl = null;
    if (onCapture) {
        const capture = document.createElement('button');
        capture.type = 'button';
        capture.textContent = 'CAPTURE GLITCH EVIDENCE';
        capture.style.cssText = 'margin-top:10px;width:100%;padding:11px 6px;background:#355e40;color:#fff;' +
            'border:1px solid #9fcc9f;border-radius:5px;font-weight:700;';
        details.appendChild(capture);
        const status = document.createElement('p');
        status.style.cssText = 'font-size:12px;margin:5px 0;color:#ddd;';
        status.textContent = 'After brown squares appear, capture BEFORE pressing Rebuild Ground.';
        details.appendChild(status);
        const download = document.createElement('a');
        download.textContent = 'DOWNLOAD EVIDENCE (.json)';
        download.style.cssText = 'display:none;padding:10px;color:#f8d584;text-decoration:underline;font-weight:700;';
        details.appendChild(download);
        capture.addEventListener('click', async () => {
            capture.disabled = true;
            capture.textContent = 'CAPTURING…';
            status.textContent = 'Capturing terrain cache, independent repaint and authoritative revision…';
            download.style.display = 'none';
            try {
                const report = await onCapture();
                if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
                evidenceUrl = URL.createObjectURL(new Blob([JSON.stringify(report)], { type: 'application/json' }));
                download.href = evidenceUrl;
                download.download = 'wyrmforge-terrain-' + report.timestamp.replace(/[:.]/g, '-') + '.json';
                download.style.display = 'block';
                const pixel = report.pixelComparison;
                status.textContent = 'Captured. Cache vs independent: ' +
                    (pixel ? pixel.mismatched + '/' + pixel.total + ' differing pixels' : 'comparison unavailable') +
                    '. C# frame: ' + (report.authoritativeComparison?.status ?? 'unavailable') +
                    '. DOWNLOAD and share the JSON here.';
            } catch (error) {
                status.textContent = 'Capture failed: ' + String(error);
            } finally {
                capture.disabled = false;
                capture.textContent = 'CAPTURE GLITCH EVIDENCE';
            }
        });
    }

    const reset = document.createElement('button');
    reset.type = 'button'; reset.textContent = 'RESTORE ALL LAYERS';
    reset.style.cssText = 'margin-top:9px;width:100%;padding:11px 6px;background:#66543a;color:white;border:1px solid #ddbd88;border-radius:5px;font-weight:700;';
    reset.addEventListener('click', () => {
        const rebuild = [...disabled].some(layerLabRequiresTerrainRebuild);
        resetLayerLab();
        for (const [key, checkbox] of boxes) checkbox.checked = layerLabEnabled(key);
        select.value = view;
        onChange(rebuild);
        refreshTitle();
    });
    details.appendChild(reset);

    const diagnostic = document.createElement('p');
    diagnostic.textContent = 'GPU/overlay switches no longer repaint the terrain. Turn Incremental crater repaint OFF to test future impacts. REBUILD GROUND NOW resets only the rendered terrain.';
    diagnostic.style.cssText = 'font-size:11px;color:#d6c9b6;';
    details.appendChild(diagnostic);

    document.body.appendChild(panel);
    refreshTitle();
    return { dispose() { if (evidenceUrl) URL.revokeObjectURL(evidenceUrl); panel.remove(); }, snapshot: layerLabSnapshot };
}
