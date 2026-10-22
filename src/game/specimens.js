// Collectible plant and fungus specimens: models, placement and glow markers.
import * as THREE from 'three';
import { part, jitter, merge, G, flatMaterial } from '../world/geo.js';
import { logGeo } from '../world/vegetation.js';
import { PLANTS } from './species-data.js';

function foxglove() {
  const p = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.push(part(G.box(0.16, 0.03, 0.5), '#4f7a35', { x: Math.sin(a) * 0.22, y: 0.06, z: Math.cos(a) * 0.22, ry: a, rx: -0.25 }));
  }
  p.push(part(G.cyl(0.025, 0.035, 1.4, 4), '#5a8040', { y: 0.7 }));
  for (let i = 0; i < 11; i++) {
    const y = 0.75 + i * 0.065;
    const a = (i % 3) * 0.5 - 0.5;
    p.push(part(G.cone(0.065 - i * 0.003, 0.15, 6), i % 2 ? '#b05fb8' : '#c070c4', {
      x: Math.sin(a) * 0.07,
      y,
      z: Math.cos(a) * 0.07,
      rx: Math.PI - 0.5,
    }));
  }
  return merge(p);
}

function willow() {
  const p = [
    part(G.cyl(0.35, 0.6, 3.6, 7), '#6b5a45', { y: 1.8 }),
    part(G.cyl(0.12, 0.2, 1.8, 5), '#6b5a45', { x: 0.7, y: 3.6, rz: -0.6 }),
    part(G.cyl(0.12, 0.2, 1.8, 5), '#6b5a45', { x: -0.6, y: 3.7, z: 0.3, rz: 0.6 }),
  ];
  const crown = part(G.ico(2.4, 1), '#8fae6a', { y: 4.8, sy: 0.75 });
  jitter(crown, 0.4, 21);
  p.push(crown);
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + (i % 2) * 0.1;
    const r = 2.0 + (i % 3) * 0.35;
    const len = 2.4 + (i % 4) * 0.4;
    p.push(part(G.box(0.1, len, 0.1), i % 2 ? '#9cbc72' : '#a9c77f', {
      x: Math.sin(a) * r,
      y: 4.6 - len / 2,
      z: Math.cos(a) * r,
    }));
  }
  return merge(p);
}

function yew() {
  const p = [part(G.cyl(0.18, 0.3, 1.6, 6), '#7a3f2a', { y: 0.8 })];
  const layers = [
    [1.5, 1.8],
    [1.2, 2.6],
    [0.8, 3.3],
  ];
  layers.forEach(([r, y], i) => {
    const c = part(G.ico(r, 0), i % 2 ? '#1f4a2a' : '#245430', { y, sy: 0.8 });
    jitter(c, 0.3, 30 + i);
    p.push(c);
  });
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const y = 1.4 + (i % 5) * 0.4;
    const r = 1.35 - (y - 1.4) * 0.3;
    p.push(part(G.ico(0.09, 0), '#d42a2a', { x: Math.sin(a) * r, y, z: Math.cos(a) * r }));
  }
  return merge(p);
}

function wormwood() {
  const p = [];
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39;
    const r = 0.05 + (i % 4) * 0.07;
    const h = 0.7 + (i % 5) * 0.12;
    p.push(part(G.cone(0.09, h, 4), i % 2 ? '#8fae4a' : '#a3bd57', {
      x: Math.sin(a) * r,
      y: h / 2,
      z: Math.cos(a) * r,
      rx: Math.cos(a) * 0.25,
      rz: -Math.sin(a) * 0.25,
    }));
  }
  for (let i = 0; i < 14; i++) {
    const a = i * 1.7;
    const r = 0.1 + (i % 3) * 0.1;
    p.push(part(G.ico(0.035, 0), '#e0c94a', { x: Math.sin(a) * r, y: 0.75 + (i % 4) * 0.1, z: Math.cos(a) * r }));
  }
  return merge(p);
}

function periwinkle() {
  const mound = part(G.ico(0.42, 0), '#2f6e36', { y: 0.12, sy: 0.55 });
  jitter(mound, 0.08, 40);
  const p = [mound];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    const r = 0.18 + (i % 2) * 0.1;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const y = 0.3 - r * 0.25;
    for (let k = 0; k < 5; k++) {
      const pa = (k / 5) * Math.PI * 2;
      p.push(part(G.cyl(0.045, 0.045, 0.012, 5), '#e886b0', { x: x + Math.sin(pa) * 0.045, y, z: z + Math.cos(pa) * 0.045 }));
    }
    p.push(part(G.cyl(0.02, 0.02, 0.02, 5), '#b02c5c', { x, y: y + 0.006, z }));
  }
  return merge(p);
}

function penicillium() {
  const p = [];
  const spots = [
    [0.6, 0.48, 0.18],
    [-0.3, 0.55, 0.05],
    [-1.0, 0.45, -0.18],
    [0.1, 0.42, -0.25],
  ];
  spots.forEach(([x, y, z], i) => {
    p.push(part(G.ico(0.2, 0), '#e8f0e8', { x, y, z, sy: 0.35 }));
    p.push(part(G.ico(0.16, 0), i % 2 ? '#3f9a8a' : '#4aa28c', { x, y: y + 0.03, z, sy: 0.4 }));
  });
  return merge([logGeo(), ...p]);
}

function amanita() {
  const p = [];
  const shrooms = [
    [0, 0, 1],
    [0.3, 0.15, 0.7],
    [-0.22, 0.25, 0.85],
  ];
  shrooms.forEach(([x, z, s], i) => {
    p.push(part(G.cyl(0.05 * s, 0.07 * s, 0.32 * s, 6), '#f0ece0', { x, y: 0.16 * s, z }));
    p.push(part(G.cyl(0.08 * s, 0.08 * s, 0.03 * s, 6), '#f0ece0', { x, y: 0.22 * s, z }));
    p.push(part(G.dome(0.2 * s, 8), '#d7261e', { x, y: 0.3 * s, z, sy: 0.75 }));
    for (let k = 0; k < 6; k++) {
      const a = k * 1.1 + i;
      const r = (0.06 + (k % 2) * 0.07) * s;
      p.push(part(G.ico(0.022 * s, 0), '#fffaf0', {
        x: x + Math.sin(a) * r,
        y: 0.3 * s + Math.sqrt(Math.max(0, 0.04 * s * s - r * r)) * 0.75 + 0.005,
        z: z + Math.cos(a) * r,
      }));
    }
  });
  return merge(p);
}

function cinchona() {
  const p = [part(G.cyl(0.18, 0.3, 3.2, 6), '#8a4a3a', { y: 1.6 })];
  const crowns = [
    [0, 3.6, 0, 1.5],
    [0.9, 3.1, 0.3, 1.0],
    [-0.8, 3.2, -0.3, 1.0],
  ];
  crowns.forEach(([x, y, z, r], i) => {
    const c = part(G.ico(r, 0), i % 2 ? '#3d6e3a' : '#447a40', { x, y, z });
    jitter(c, 0.25, 50 + i);
    p.push(c);
  });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.2;
    const y = 3.0 + (i % 4) * 0.4;
    const r = 1.35 - Math.abs(y - 3.6) * 0.4;
    p.push(part(G.ico(0.16, 0), i % 2 ? '#f0a0c0' : '#f7c2d6', { x: Math.sin(a) * r, y, z: Math.cos(a) * r }));
  }
  return merge(p);
}

function snowdrop() {
  const p = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    const r = 0.06 + (i % 2) * 0.1;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const h = 0.22 + (i % 3) * 0.04;
    p.push(part(G.cyl(0.008, 0.01, h, 3), '#5d8a4a', { x, y: h / 2, z }));
    p.push(part(G.box(0.03, h * 0.8, 0.008), '#6f9a86', { x: x + 0.03, y: h * 0.4, z, rz: -0.15 }));
    p.push(part(G.box(0.03, 0.01, 0.06), '#5d8a4a', { x, y: h, z: z + 0.03 }));
    for (let k = 0; k < 3; k++) {
      const pa = (k / 3) * Math.PI * 2;
      p.push(part(G.ico(0.025, 0), '#fbfbf8', {
        x: x + Math.sin(pa) * 0.018,
        y: h - 0.04,
        z: z + 0.06 + Math.cos(pa) * 0.018,
        sy: 1.8,
      }));
    }
  }
  return merge(p);
}

const BUILDERS = { foxglove, willow, yew, wormwood, periwinkle, penicillium, amanita, cinchona, snowdrop };

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Specimens {
  constructor() {
    this.material = flatMaterial({ roughness: 0.75 });
    this.geos = {};
    for (const s of PLANTS) this.geos[s.id] = BUILDERS[s.id]();
    this.glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: new THREE.Color('#ffe7a0'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    });
    this.active = new Set();
    this.forced = [];
    this.time = 0;
  }

  // Guarantee a specimen at a spot (used to put a first find near spawn).
  addForced(x, z, speciesId) {
    this.forced.push({ x, z, speciesId });
  }

  populate(chunk, world, heightAt, rng) {
    const { ox, oz, size } = chunk;
    const found = [];
    const tries = 16;
    for (let i = 0; i < tries; i++) {
      const x = ox + 4 + rng() * (size - 8);
      const z = oz + 4 + rng() * (size - 8);
      const h = heightAt(x, z);
      const biome = world.biome(x, z, h);
      const roll = rng();
      let acc = 0;
      for (const s of PLANTS) {
        if (!s.biomes.includes(biome)) continue;
        if (s.minHeight && h < s.minHeight) continue;
        acc += s.rarity;
        if (roll < acc) {
          found.push({ x, z, h, id: s.id });
          break;
        }
      }
    }
    for (const f of this.forced) {
      if (f.x >= ox && f.x < ox + size && f.z >= oz && f.z < oz + size) {
        found.push({ x: f.x, z: f.z, h: heightAt(f.x, f.z), id: f.speciesId });
      }
    }

    const items = [];
    const colliders = [];
    for (const f of found) {
      const sp = PLANTS.find((s) => s.id === f.id);
      const mesh = new THREE.Mesh(this.geos[f.id], this.material);
      mesh.position.set(f.x - ox, f.h - 0.05, f.z - oz);
      mesh.rotation.y = rng() * Math.PI * 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const top = this.geos[f.id].boundingBox.max.y;
      const glow = new THREE.Sprite(this.glowMaterial);
      glow.scale.setScalar(sp.tree ? 2.2 : 1.3);
      glow.position.set(f.x - ox, f.h + top + 0.5, f.z - oz);
      glow.userData.baseY = glow.position.y;
      glow.userData.phase = rng() * 6.28;
      const item = { species: sp, x: f.x, y: f.h, z: f.z, mesh, glow, chunk };
      items.push(item);
      this.active.add(item);
      if (sp.tree) colliders.push({ x: f.x, z: f.z, r: sp.tree });
    }
    return { items, colliders };
  }

  removeItems(items) {
    for (const it of items) this.active.delete(it);
  }

  update(dt, discovered, reducedMotion) {
    this.time += dt;
    for (const it of this.active) {
      const seen = discovered.has(it.species.id);
      it.glow.visible = !seen;
      if (!seen) {
        const bob = reducedMotion ? 0 : Math.sin(this.time * 1.8 + it.glow.userData.phase) * 0.15;
        it.glow.position.y = it.glow.userData.baseY + bob;
      }
    }
  }

  nearest(x, z, maxExtra = 0) {
    let best = null;
    let bestD = Infinity;
    for (const it of this.active) {
      const d = Math.hypot(it.x - x, it.z - z);
      if (d < it.species.reach + maxExtra && d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  nearestUndiscovered(x, z, discovered) {
    let best = null;
    let bestD = Infinity;
    for (const it of this.active) {
      if (discovered.has(it.species.id)) continue;
      const d = Math.hypot(it.x - x, it.z - z);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best ? { item: best, dist: bestD } : null;
  }
}
