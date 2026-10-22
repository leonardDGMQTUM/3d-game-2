// Infinite terrain, streamed in square chunks around the player.
import * as THREE from 'three';
import { BIOME, WATER_LEVEL } from './worldgen.js';
import { hash3, mulberry32, smoothstep } from '../core/noise.js';

export const CHUNK_SIZE = 64;
export const CHUNK_RES = 32;
export const STEP = CHUNK_SIZE / CHUNK_RES;
const GRID = CHUNK_RES + 3; // heights incl. a one-cell border for normals

const BIOME_COLORS = {
  [BIOME.OCEAN]: '#c9b98a',
  [BIOME.BEACH]: '#e3d29e',
  [BIOME.WETLAND]: '#566f3a',
  [BIOME.GRASSLAND]: '#6fa04a',
  [BIOME.MEADOW]: '#a0b85a',
  [BIOME.FOREST]: '#4a8236',
  [BIOME.CONIFER]: '#3c6a35',
  [BIOME.ALPINE]: '#7d935a',
  [BIOME.ROCK]: '#827c74',
  [BIOME.SNOW]: '#eef3f6',
};
const COL = Object.fromEntries(Object.entries(BIOME_COLORS).map(([k, v]) => [k, new THREE.Color(v)]));
const ROCK = new THREE.Color('#7b766f');
const DEEP = new THREE.Color('#2e4a52');
const MAP_WATER = [58, 127, 176];

const key = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
const toSRGB = (c) => Math.round(255 * Math.min(1, c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));

export class ChunkManager {
  constructor(scene, world, vegetation, specimens) {
    this.scene = scene;
    this.world = world;
    this.vegetation = vegetation;
    this.specimens = specimens;
    this.chunks = new Map();
    this.radius = 3;
    this.queue = [];
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      metalness: 0,
    });
    this.heightAt = this.heightAt.bind(this);
  }

  setRadius(r) {
    this.radius = r;
  }

  gridH(i, j) {
    const cx = Math.floor(i / CHUNK_RES);
    const cz = Math.floor(j / CHUNK_RES);
    const c = this.chunks.get(key(cx, cz));
    if (c && c.heights) {
      return c.heights[(j - cz * CHUNK_RES + 1) * GRID + (i - cx * CHUNK_RES + 1)];
    }
    return this.world.height(i * STEP, j * STEP);
  }

  // Height of the rendered triangle surface (matches what you see exactly).
  heightAt(x, z) {
    const gx = x / STEP;
    const gz = z / STEP;
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    const fx = gx - i;
    const fz = gz - j;
    const hb = this.gridH(i + 1, j);
    const hc = this.gridH(i, j + 1);
    if (fx + fz <= 1) {
      const ha = this.gridH(i, j);
      return ha + (hb - ha) * fx + (hc - ha) * fz;
    }
    const hd = this.gridH(i + 1, j + 1);
    return hd + (hc - hd) * (1 - fx) + (hb - hd) * (1 - fz);
  }

  biomeAt(x, z) {
    const h = this.heightAt(x, z);
    return this.world.biome(x, z, h);
  }

  // Ensure chunks around (px, pz) exist; spend at most `budgetMs` building.
  update(px, pz, budgetMs = 6) {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const r = this.radius;

    if (pcx !== this.lastCx || pcz !== this.lastCz || this.lastR !== r) {
      this.lastCx = pcx;
      this.lastCz = pcz;
      this.lastR = r;
      this.queue = [];
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz > (r + 0.5) * (r + 0.5)) continue;
          const k = key(pcx + dx, pcz + dz);
          if (!this.chunks.has(k)) this.queue.push({ cx: pcx + dx, cz: pcz + dz, d: dx * dx + dz * dz });
        }
      }
      this.queue.sort((a, b) => b.d - a.d);
      for (const [k, c] of this.chunks) {
        const dx = c.cx - pcx;
        const dz = c.cz - pcz;
        if (dx * dx + dz * dz > (r + 1.5) * (r + 1.5)) {
          this.disposeChunk(c);
          this.chunks.delete(k);
        }
      }
    }

    const start = performance.now();
    while (this.queue.length && performance.now() - start < budgetMs) {
      const q = this.queue.pop();
      if (!this.chunks.has(key(q.cx, q.cz))) this.buildChunk(q.cx, q.cz);
    }
    return this.queue.length;
  }

  buildChunk(cx, cz) {
    const N = CHUNK_RES;
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;
    const world = this.world;

    const heights = new Float32Array(GRID * GRID);
    for (let gj = 0; gj < GRID; gj++) {
      for (let gi = 0; gi < GRID; gi++) {
        heights[gj * GRID + gi] = world.height(ox + (gi - 1) * STEP, oz + (gj - 1) * STEP);
      }
    }

    const V = (N + 1) * (N + 1);
    const pos = new Float32Array(V * 3);
    const nor = new Float32Array(V * 3);
    const col = new Float32Array(V * 3);
    const map = document.createElement('canvas');
    map.width = map.height = N + 1;
    const mctx = map.getContext('2d');
    const img = mctx.createImageData(N + 1, N + 1);
    const c = new THREE.Color();

    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const v = j * (N + 1) + i;
        const g = (j + 1) * GRID + (i + 1);
        const h = heights[g];
        const x = ox + i * STEP;
        const z = oz + j * STEP;
        pos[v * 3] = i * STEP;
        pos[v * 3 + 1] = h;
        pos[v * 3 + 2] = j * STEP;

        let nx = heights[g - 1] - heights[g + 1];
        let ny = 2 * STEP;
        let nz = heights[g - GRID] - heights[g + GRID];
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl;
        ny /= nl;
        nz /= nl;
        nor[v * 3] = nx;
        nor[v * 3 + 1] = ny;
        nor[v * 3 + 2] = nz;

        const biome = world.biome(x, z, h);
        c.copy(COL[biome]);
        if (biome === BIOME.OCEAN) {
          c.lerp(DEEP, smoothstep(0, 14, WATER_LEVEL - h));
        } else if (biome !== BIOME.SNOW && biome !== BIOME.BEACH) {
          c.lerp(ROCK, smoothstep(0.8, 0.6, ny));
        } else if (biome === BIOME.SNOW) {
          c.lerp(ROCK, smoothstep(0.7, 0.5, ny));
        }
        const hsh = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        const jit = 0.94 + 0.12 * (hsh - Math.floor(hsh));
        c.multiplyScalar(jit);
        col[v * 3] = c.r;
        col[v * 3 + 1] = c.g;
        col[v * 3 + 2] = c.b;

        // Minimap pixel with a little hill-shading.
        const shade = Math.max(0.55, Math.min(1.25, 0.95 + (nx - nz) * 0.9));
        let r = toSRGB(c.r) * shade;
        let gg = toSRGB(c.g) * shade;
        let b = toSRGB(c.b) * shade;
        if (h < WATER_LEVEL) {
          const t = 0.55 + 0.4 * smoothstep(0, 10, WATER_LEVEL - h);
          r = r * (1 - t) + MAP_WATER[0] * t;
          gg = gg * (1 - t) + MAP_WATER[1] * t;
          b = b * (1 - t) + MAP_WATER[2] * t;
        }
        const p = (j * (N + 1) + i) * 4;
        img.data[p] = r;
        img.data[p + 1] = gg;
        img.data[p + 2] = b;
        img.data[p + 3] = 255;
      }
    }
    mctx.putImageData(img, 0, 0);

    const idx = new Uint16Array(N * N * 6);
    let t = 0;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i;
        const b = a + 1;
        const cc = a + N + 1;
        const d = cc + 1;
        idx[t++] = a;
        idx[t++] = cc;
        idx[t++] = b;
        idx[t++] = b;
        idx[t++] = cc;
        idx[t++] = d;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();

    const group = new THREE.Group();
    group.position.set(ox, 0, oz);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);

    const chunk = { cx, cz, ox, oz, size: CHUNK_SIZE, heights, group, mesh, map, colliders: [], specimens: [] };
    this.chunks.set(key(cx, cz), chunk);

    const rng = mulberry32(hash3(cx, cz, world.seed));
    const veg = this.vegetation.populate(chunk, world, this.heightAt, rng);
    for (const m of veg.meshes) group.add(m);
    chunk.vegMeshes = veg.meshes;
    chunk.colliders.push(...veg.colliders);

    const sp = this.specimens.populate(chunk, world, this.heightAt, mulberry32(hash3(cx, cz, world.seed ^ 0xabcdef)));
    for (const it of sp.items) {
      group.add(it.mesh);
      group.add(it.glow);
    }
    chunk.specimens = sp.items;
    chunk.colliders.push(...sp.colliders);

    this.scene.add(group);
    return chunk;
  }

  disposeChunk(c) {
    this.scene.remove(c.group);
    c.mesh.geometry.dispose();
    for (const m of c.vegMeshes) m.dispose();
    this.specimens.removeItems(c.specimens);
  }

  collidersNear(x, z, range = 6) {
    const out = [];
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = this.chunks.get(key(cx + dx, cz + dz));
        if (!c) continue;
        for (const col of c.colliders) {
          if (Math.abs(col.x - x) < range && Math.abs(col.z - z) < range) out.push(col);
        }
      }
    }
    return out;
  }

  isReadyAround(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    return this.chunks.has(key(cx, cz));
  }

  clear() {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    this.queue = [];
    this.lastCx = undefined;
  }
}
