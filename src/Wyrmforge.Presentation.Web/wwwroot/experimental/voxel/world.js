export const MATERIAL = Object.freeze({ AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, BEDROCK: 4 });
export const COLORS = Object.freeze(['#17202b', '#4b9c48', '#875534', '#858992', '#7942ad']);
export const CHUNK_SIZE = 16;
export const DEPTH = 32;
const chunkKey = (cx, cy) => `${cx},${cy}`;
const floorDiv = (n, d) => Math.floor(n / d);
const mod = (n, d) => ((n % d) + d) % d;
function hash(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
export class VoxelWorld {
  constructor(seed = 42) {
    this.seed = seed;
    this.chunks = new Map();
    this.dirty = new Set();
    this.revision = 0;
  }
  key(cx, cy) { return chunkKey(cx, cy); }
  getChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (chunk) return chunk;
    const cells = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * DEPTH);
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = cx * CHUNK_SIZE + lx;
        const y = cy * CHUNK_SIZE + ly;
        const height = 22 + (hash(x >> 2, y >> 2, this.seed) % 3);
        for (let z = 0; z < DEPTH; z++) {
          let material = MATERIAL.AIR;
          if (z < 3) material = MATERIAL.BEDROCK;
          else if (z < height - 6) material = MATERIAL.STONE;
          else if (z < height - 1) material = MATERIAL.DIRT;
          else if (z < height) material = MATERIAL.GRASS;
          cells[(ly * CHUNK_SIZE + lx) * DEPTH + z] = material;
        }
      }
    }
    chunk = { cx, cy, cells, revision: 0 };
    this.chunks.set(key, chunk);
    return chunk;
  }
  locate(x, y, z) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z) || z < 0 || z >= DEPTH) return null;
    const cx = floorDiv(x, CHUNK_SIZE), cy = floorDiv(y, CHUNK_SIZE);
    const index = (mod(y, CHUNK_SIZE) * CHUNK_SIZE + mod(x, CHUNK_SIZE)) * DEPTH + z;
    return { cx, cy, index };
  }
  get(x, y, z) {
    const p = this.locate(x, y, z);
    return p ? this.getChunk(p.cx, p.cy).cells[p.index] : MATERIAL.AIR;
  }
  set(x, y, z, material) {
    const p = this.locate(x, y, z);
    if (!p || !Number.isInteger(material) || material < 0 || material > MATERIAL.BEDROCK) return false;
    const chunk = this.getChunk(p.cx, p.cy);
    if (chunk.cells[p.index] === MATERIAL.BEDROCK || chunk.cells[p.index] === material) return false;
    chunk.cells[p.index] = material;
    chunk.revision++;
    this.revision++;
    this.dirty.add(chunkKey(p.cx, p.cy));
    if (mod(x, CHUNK_SIZE) === 0) this.dirty.add(chunkKey(p.cx - 1, p.cy));
    if (mod(x, CHUNK_SIZE) === CHUNK_SIZE - 1) this.dirty.add(chunkKey(p.cx + 1, p.cy));
    if (mod(y, CHUNK_SIZE) === 0) this.dirty.add(chunkKey(p.cx, p.cy - 1));
    if (mod(y, CHUNK_SIZE) === CHUNK_SIZE - 1) this.dirty.add(chunkKey(p.cx, p.cy + 1));
    return true;
  }
  top(x, y) {
    const p = this.locate(x, y, 0);
    const chunk = this.getChunk(p.cx, p.cy);
    for (let z = DEPTH - 1; z >= 0; z--) {
      const material = chunk.cells[p.index + z];
      if (material !== MATERIAL.AIR) return { z, material };
    }
    return { z: -1, material: MATERIAL.AIR };
  }
  explode(x, y, z, radius) {
    let changed = 0;
    const r2 = radius * radius;
    for (let yy = Math.floor(y - radius); yy <= Math.ceil(y + radius); yy++) {
      for (let xx = Math.floor(x - radius); xx <= Math.ceil(x + radius); xx++) {
        for (let zz = Math.max(0, Math.floor(z - radius)); zz <= Math.min(DEPTH - 1, Math.ceil(z + radius)); zz++) {
          const dx = xx - x, dy = yy - y, dz = zz - z;
          if (dx * dx + dy * dy + dz * dz <= r2 && this.set(xx, yy, zz, MATERIAL.AIR)) changed++;
        }
      }
    }
    return changed;
  }
  consumeDirty() {
    const keys = [...this.dirty];
    this.dirty.clear();
    return keys;
  }
}
