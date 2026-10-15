// Small deterministic pixel painter used to author WyrmForge runtime sprites.
export function hex(color) {
    if (Array.isArray(color)) return color.length === 4 ? color : [...color, 255];
    const value = color.replace('#', '');
    const n = parseInt(value.length === 3 ? value.split('').map(c => c + c).join('') : value.slice(0, 6), 16);
    const alpha = value.length === 8 ? parseInt(value.slice(6), 16) : 255;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

export function mix(a, b, t) {
    const x = hex(a), y = hex(b);
    return [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * t)).concat(Math.round(x[3] + (y[3] - x[3]) * t));
}

export function rng(seed) {
    let state = (seed >>> 0) || 0x9e3779b9;
    return () => {
        state ^= state << 13; state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5; state >>>= 0;
        return state / 4294967296;
    };
}

export class Bitmap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8Array(width * height * 4);
    }

    inside(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }

    get(x, y) {
        if (!this.inside(x, y)) return [0, 0, 0, 0];
        const o = (y * this.width + x) * 4;
        return [this.data[o], this.data[o + 1], this.data[o + 2], this.data[o + 3]];
    }

    alpha(x, y) { return this.inside(x, y) ? this.data[(y * this.width + x) * 4 + 3] : 0; }

    set(x, y, color) {
        x = Math.round(x); y = Math.round(y);
        if (this.wrap) {
            x = ((x % this.width) + this.width) % this.width;
            y = ((y % this.height) + this.height) % this.height;
        }
        if (!this.inside(x, y)) return;
        const c = hex(color);
        const o = (y * this.width + x) * 4;
        if (c[3] === 0) { this.data.fill(0, o, o + 4); return; }
        if (c[3] >= 255 || this.data[o + 3] === 0) {
            this.data.set(c, o);
            return;
        }
        const a = c[3] / 255;
        for (let i = 0; i < 3; i++) this.data[o + i] = Math.round(this.data[o + i] * (1 - a) + c[i] * a);
        this.data[o + 3] = Math.max(this.data[o + 3], c[3]);
    }

    clear(x, y) {
        if (this.inside(x, y)) this.data.fill(0, (y * this.width + x) * 4, (y * this.width + x) * 4 + 4);
    }

    rect(x, y, w, h, color) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
        return this;
    }

    ellipse(cx, cy, rx, ry, color) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const dx = (x + .5 - cx) / Math.max(.5, rx), dy = (y + .5 - cy) / Math.max(.5, ry);
                if (dx * dx + dy * dy <= 1) this.set(x, y, color);
            }
        return this;
    }

    line(x0, y0, x1, y1, color, width = 1) {
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
        for (let s = 0; s <= steps; s++) {
            const x = x0 + (x1 - x0) * s / steps, y = y0 + (y1 - y0) * s / steps;
            if (width <= 1) this.set(Math.round(x), Math.round(y), color);
            else this.rect(Math.round(x - (width - 1) / 2), Math.round(y - (width - 1) / 2), width, width, color);
        }
        return this;
    }

    poly(points, color) {
        const ys = points.map(p => p[1]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
            const sy = y + .5, xs = [];
            for (let i = 0; i < points.length; i++) {
                const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
                if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + (sy - ay) * (bx - ax) / (by - ay));
            }
            xs.sort((a, b) => a - b);
            for (let k = 0; k + 1 < xs.length; k += 2)
                for (let x = Math.ceil(xs[k] - .5); x < Math.ceil(xs[k + 1] - .5); x++) this.set(x, y, color);
        }
        return this;
    }

    // One-pixel dark outline around every opaque pixel, the main readability tool for small sprites.
    outline(color, diagonal = false) {
        const marks = [];
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
            if (this.alpha(x, y) > 0) continue;
            const near = this.alpha(x - 1, y) > 96 || this.alpha(x + 1, y) > 96 || this.alpha(x, y - 1) > 96 || this.alpha(x, y + 1) > 96 ||
                (diagonal && (this.alpha(x - 1, y - 1) > 96 || this.alpha(x + 1, y + 1) > 96 || this.alpha(x + 1, y - 1) > 96 || this.alpha(x - 1, y + 1) > 96));
            if (near) marks.push([x, y]);
        }
        for (const [x, y] of marks) this.set(x, y, color);
        return this;
    }

    // Keeps the authored silhouette but recolors its pixels with a function (used for hit/frozen variants).
    recolor(fn) {
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
            const c = this.get(x, y);
            if (c[3] === 0) continue;
            const next = fn(c, x, y);
            if (next) this.data.set(hex(next), (y * this.width + x) * 4);
        }
        return this;
    }

    // Top-left key light: pixels whose upper-left neighbour is empty get highlighted, lower-right get shadowed.
    rim(light, shadow, lightAlpha = .45, shadowAlpha = .4) {
        const copy = this.clone();
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
            if (copy.alpha(x, y) === 0) continue;
            const c = copy.get(x, y);
            if (copy.alpha(x - 1, y - 1) === 0 || copy.alpha(x, y - 1) === 0)
                this.data.set(mix(c, light, lightAlpha), (y * this.width + x) * 4);
            else if (shadow && (copy.alpha(x + 1, y + 1) === 0 || copy.alpha(x + 1, y) === 0))
                this.data.set(mix(c, shadow, shadowAlpha), (y * this.width + x) * 4);
        }
        return this;
    }

    blit(src, dx, dy, flipX = false) {
        for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
            const c = src.get(flipX ? src.width - 1 - x : x, y);
            if (c[3]) this.set(dx + x, dy + y, c);
        }
        return this;
    }

    clone() {
        const copy = new Bitmap(this.width, this.height);
        copy.data.set(this.data);
        return copy;
    }

    flipped() { return new Bitmap(this.width, this.height).blit(this, 0, 0, true); }

    opaqueBounds() {
        let minX = this.width, minY = this.height, maxX = -1, maxY = -1;
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++)
            if (this.alpha(x, y)) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    count(predicate = c => c[3] > 0) {
        let n = 0;
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) if (predicate(this.get(x, y))) n++;
        return n;
    }
}

// Shelf-packs named bitmaps into one atlas and returns frame rectangles plus anchors.
export function packAtlas(entries, maxWidth = 1024, padding = 2) {
    const sorted = [...entries].sort((a, b) => b.bitmap.height - a.bitmap.height || a.name.localeCompare(b.name));
    let x = padding, y = padding, shelf = 0, width = 0;
    const frames = {};
    for (const entry of sorted) {
        const { width: w, height: h } = entry.bitmap;
        if (x + w + padding > maxWidth) { x = padding; y += shelf + padding; shelf = 0; }
        frames[entry.name] = { x, y, w, h, ax: entry.anchor?.[0] ?? Math.floor(w / 2), ay: entry.anchor?.[1] ?? h - 1 };
        if (entry.meta) Object.assign(frames[entry.name], entry.meta);
        x += w + padding;
        shelf = Math.max(shelf, h);
        width = Math.max(width, x);
    }
    const atlas = new Bitmap(Math.max(4, width), y + shelf + padding);
    for (const entry of sorted) atlas.blit(entry.bitmap, frames[entry.name].x, frames[entry.name].y);
    return { atlas, frames };
}
