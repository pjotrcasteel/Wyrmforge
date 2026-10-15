import { drawView } from './render.mjs';
const [reference, cleaned, hurt, critical] = await Promise.all(['motion.json', 'cleaned-motion.json', 'hurt-motion.json', 'critical-motion.json'].map(file => fetch(file).then(response => response.json())));
let data = cleaned;
const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
const phaseControl = document.querySelector('#phase'), cameraControl = document.querySelector('#camera');
let playing = true, phase = 0, cycles = 0, last = performance.now();
document.querySelector('#motion').addEventListener('change', event => { data = ({reference, cleaned, hurt, critical})[event.target.value] || cleaned; });
document.querySelector('#play').addEventListener('click', event => { playing = !playing; event.target.textContent = playing ? 'Pause' : 'Play'; });
phaseControl.addEventListener('input', () => { phase = Math.min(.999999, Number(phaseControl.value)); playing = false; document.querySelector('#play').textContent = 'Play'; });
function draw(now) {
    if (playing) {
        const next = phase + Math.min(100, now - last) / (1000 * data.duration);
        cycles += Math.floor(next);
        phase = next % 1;
    }
    last = now;
    const width = Math.round(canvas.getBoundingClientRect().width), height = width > 700 ? 390 : 420;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const chosen = cameraControl.value;
    const views = chosen === 'all' && width > 700 ? ['side', 'front', 'game'] : [chosen === 'all' ? 'game' : chosen];
    let frame;
    views.forEach((view, i) => { frame = drawView(ctx, data, phase, { x: i * width / views.length, y: 0, width: width / views.length, height,
        yaw: view === 'side' ? 90 : view === 'front' ? 0 : 45, pitch: view === 'game' ? 25 : 8,
        label: view === 'game' ? 'Game camera' : view === 'side' ? 'Side' : 'Front',
        travel: document.querySelector('#travel').checked, contacts: document.querySelector('#contacts').checked, cycles }); });
    phaseControl.value = phase;
    document.querySelector('#frame').textContent = `${frame + 1}/${data.frames.length}`;
    window.__motionStudyReady = true;
    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
