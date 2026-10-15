const manifest = await fetch('./atlas.json').then(response => response.json());
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const direction = document.querySelector('#direction');
const scaleControl = document.querySelector('#scale');
const animate = document.querySelector('#animate');
const mageAnimation = document.querySelector('#mage-animation');
const images = new Map();
await Promise.all([manifest.mage.file, manifest.mageWalk.file, manifest.mageCast.file, manifest.scavenger.file, manifest.props.file, manifest.terrain.file].map(async file => {
    const image = new Image();
    image.src = file;
    await image.decode();
    images.set(file, image);
}));
let paused = false;
let elapsed = 0;
let previousTime = performance.now();
document.querySelector('#pause').addEventListener('click', event => {
    paused = !paused;
    event.target.textContent = paused ? 'Play' : 'Pause';
});
function sprite(atlas, index, x, y, scale) {
    const frame = atlas.frames[index];
    const [sx, sy, width, height] = frame.source;
    const [px, py] = frame.pivot;
    ctx.drawImage(images.get(atlas.file), sx, sy, width, height, Math.round(x - px * scale), Math.round(y - py * scale), Math.round(width * scale), Math.round(height * scale));
}
function draw(time) {
    if (!paused) elapsed += Math.min(time - previousTime, 100);
    previousTime = time;
    const width = Math.round(canvas.getBoundingClientRect().width);
    const height = Math.max(400, Math.round(width * 2 / 3));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const mud = images.get(manifest.terrain.file);
    for (let y = 0; y < height; y += 256) for (let x = 0; x < width; x += 256) ctx.drawImage(mud, x, y, 256, 256);
    ctx.fillStyle = '#0d14133d';
    ctx.fillRect(0, 0, width, height);
    const props = manifest.props;
    const items = [
        [props, 1, 390, 235, .34], [props, 3, 520, 225, .32], [props, 2, 675, 235, .34],
        [props, 0, 110, 285, .49], [props, 0, 820, 295, .47], [props, 5, 645, 305, .22],
        [props, 4, 190, 485, .33]
    ];
    for (const item of items) {
        item[2] *= width / 960;
        item[3] *= height / 640;
        item[4] *= Math.max(.65, width / 960);
    }
    const size = Number(scaleControl.value);
    const mageIndex = manifest.mage.frames.findIndex(frame => frame.name === direction.value);
    const selectedMage = mageAnimation.value === 'walk' ? manifest.mageWalk : mageAnimation.value === 'cast' ? manifest.mageCast : manifest.mage;
    const mageFrame = selectedMage === manifest.mage ? mageIndex : Math.floor(elapsed * selectedMage.fps / 1000) % selectedMage.frames.length;
    direction.disabled = selectedMage !== manifest.mage;
    items.push([selectedMage, mageFrame, width * .45, height * .74, selectedMage.scale * size]);
    const frameIndex = animate.checked ? Math.floor(elapsed / 130) % 8 : 0;
    items.push([manifest.scavenger, frameIndex, width * .72, height * .67, manifest.scavenger.scale * size]);
    items.push([manifest.scavenger, (frameIndex + 4) % 8, width * .25, height * .54, manifest.scavenger.scale * size]);
    items.sort((a, b) => a[3] - b[3]);
    for (const item of items) sprite(...item);
    document.querySelector('#size').value = `${Math.round(80 * size)} px`;
    window.__artPreviewReady = true;
    window.__artPreviewFrame = frameIndex;
    window.__magePreviewFrame = mageFrame;
    window.__magePreviewMode = mageAnimation.value;
    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
