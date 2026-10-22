// Trees, rocks, grass and flowers, scattered per chunk with instancing.
import * as THREE from 'three';
import { BIOME } from './worldgen.js';
import { part, jitter, merge, G, flatMaterial } from './geo.js';

function pineGeo() {
  return merge([
    part(G.cyl(0.18, 0.28, 2.2, 6), '#6b4a2f', { y: 1.1 }),
    part(G.cone(1.7, 2.8, 7), '#2f5d34', { y: 2.8 }),
    part(G.cone(1.3, 2.3, 7), '#356b3a', { y: 4.0, ry: 0.4 }),
    part(G.cone(0.85, 1.9, 7), '#3d7742', { y: 5.1, ry: 0.9 }),
  ]);
}

function oakGeo() {
  const canopy = [
    part(G.ico(1.7, 1), '#4f8a3a', { y: 3.8 }),
    part(G.ico(1.25, 0), '#5a9640', { x: 1.0, y: 3.3, z: 0.3 }),
    part(G.ico(1.15, 0), '#477f35', { x: -0.9, y: 3.4, z: -0.4 }),
    part(G.ico(1.0, 0), '#56913d', { x: 0.1, y: 4.7, z: -0.2 }),
  ];
  canopy.forEach((c, i) => jitter(c, 0.35, i + 3));
  return merge([
    part(G.cyl(0.22, 0.36, 2.8, 7), '#6e4f33', { y: 1.4 }),
    part(G.cyl(0.08, 0.12, 1.4, 5), '#6e4f33', { x: 0.5, y: 2.6, rz: -0.8 }),
    ...canopy,
  ]);
}

function birchGeo() {
  const canopy = [
    part(G.ico(1.1, 1), '#8fbf4f', { y: 4.9, sy: 1.5 }),
    part(G.ico(0.8, 0), '#9ccc5a', { x: 0.5, y: 4.1, z: 0.2 }),
  ];
  canopy.forEach((c, i) => jitter(c, 0.25, i + 11));
  return merge([
    part(G.cyl(0.11, 0.16, 4.6, 6), '#e9e5dc', { y: 2.3 }),
    part(G.box(0.2, 0.06, 0.2), '#2b2b2b', { y: 1.2 }),
    part(G.box(0.18, 0.05, 0.18), '#2b2b2b', { y: 2.4, ry: 0.5 }),
    part(G.box(0.16, 0.05, 0.16), '#2b2b2b', { y: 3.3, ry: 1.1 }),
    ...canopy,
  ]);
}

function palmGeo() {
  const parts = [];
  let x = 0;
  for (let i = 0; i < 5; i++) {
    parts.push(part(G.cyl(0.16, 0.2, 1.1, 6), '#8b6b46', { x, y: 0.55 + i * 1.05, rz: -0.08 * i }));
    x += 0.09 * i;
  }
  const top = { x, y: 5.6 };
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.push(
      part(G.box(0.5, 0.05, 2.4), i % 2 ? '#4f9a3a' : '#5aa843', {
        x: top.x + Math.sin(a) * 1.0,
        y: top.y - 0.35,
        z: Math.cos(a) * 1.0,
        rx: 0.45,
        ry: a,
      }),
    );
  }
  parts.push(part(G.ico(0.16, 0), '#6b4a2a', { x: top.x + 0.2, y: top.y - 0.3, z: 0.1 }));
  parts.push(part(G.ico(0.16, 0), '#6b4a2a', { x: top.x - 0.15, y: top.y - 0.35, z: -0.15 }));
  return merge(parts);
}

function rockGeo(seed) {
  const g = part(G.dodeca(1), '#8a857c', { sy: 0.7 });
  jitter(g, 0.45, seed);
  return merge([g]);
}

function bushGeo() {
  const a = part(G.ico(0.8, 0), '#4a7d36', { y: 0.45, sy: 0.75 });
  const b = part(G.ico(0.55, 0), '#558a3d', { x: 0.5, y: 0.35, z: 0.2 });
  jitter(a, 0.2, 5);
  jitter(b, 0.15, 6);
  return merge([a, b]);
}

function grassGeo() {
  return merge([
    part(G.cone(0.07, 0.6, 3), '#6a9e3f', { y: 0.3, rz: 0.15 }),
    part(G.cone(0.06, 0.5, 3), '#7aae48', { x: 0.1, y: 0.25, z: 0.05, rz: -0.25 }),
    part(G.cone(0.06, 0.55, 3), '#5f9238', { x: -0.06, y: 0.27, z: 0.1, rx: 0.25 }),
    part(G.cone(0.05, 0.45, 3), '#82b84e', { x: 0.02, y: 0.22, z: -0.1, rx: -0.3 }),
  ]);
}

function flowerGeo(color) {
  const parts = [];
  const spots = [
    [0, 0],
    [0.18, 0.1],
    [-0.12, 0.16],
    [0.05, -0.18],
  ];
  spots.forEach(([x, z], i) => {
    const h = 0.28 + i * 0.05;
    parts.push(part(G.cyl(0.012, 0.012, h, 3), '#5d8f3a', { x, y: h / 2, z }));
    parts.push(part(G.ico(0.07, 0), color, { x, y: h, z }));
  });
  return merge(parts);
}

function reedGeo() {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 2.1;
    const r = 0.12 + (i % 3) * 0.08;
    const h = 1.3 + (i % 3) * 0.25;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    parts.push(part(G.cyl(0.018, 0.025, h, 3), '#7a8a4a', { x, y: h / 2, z }));
    if (i % 2 === 0) parts.push(part(G.cyl(0.05, 0.05, 0.22, 5), '#6b4a2a', { x, y: h - 0.05, z }));
  }
  return merge(parts);
}

export function logGeo() {
  return merge([
    part(G.cyl(0.32, 0.32, 3.2, 7), '#6b4c33', { y: 0.28, rz: Math.PI / 2 }),
    part(G.cyl(0.26, 0.26, 0.02, 7), '#b8935f', { x: 1.61, y: 0.28, rz: Math.PI / 2 }),
    part(G.cyl(0.26, 0.26, 0.02, 7), '#b8935f', { x: -1.61, y: 0.28, rz: Math.PI / 2 }),
    part(G.cyl(0.05, 0.08, 0.6, 4), '#6b4c33', { x: 0.6, y: 0.6, z: 0.15, rx: 0.5 }),
  ]);
}

// Density per biome: expected placements per candidate point.
const TABLE = {
  [BIOME.FOREST]: { oak: 0.1, birch: 0.035, pine: 0.015, bush: 0.07, grass: 0.22, flowerW: 0.02, log: 0.008, rock: 0.01 },
  [BIOME.CONIFER]: { pine: 0.14, birch: 0.025, bush: 0.035, grass: 0.1, rock: 0.02, log: 0.008 },
  [BIOME.GRASSLAND]: { oak: 0.012, pine: 0.004, birch: 0.004, bush: 0.03, grass: 0.45, flowerY: 0.05, flowerW: 0.03, rock: 0.01 },
  [BIOME.MEADOW]: { grass: 0.32, flowerY: 0.08, flowerV: 0.08, flowerW: 0.03, bush: 0.02, rock: 0.015, oak: 0.003 },
  [BIOME.WETLAND]: { reed: 0.3, grass: 0.2, bush: 0.04, birch: 0.006 },
  [BIOME.BEACH]: { rock: 0.012, palm: 0.009, grass: 0.03 },
  [BIOME.ALPINE]: { grass: 0.28, rock: 0.05, pine: 0.025, flowerV: 0.04, flowerW: 0.02 },
  [BIOME.ROCK]: { rock: 0.07, grass: 0.04 },
  [BIOME.SNOW]: { rock: 0.02 },
};

// kind -> collider radius (relative to scale), sinking, shadow casting
const KINDS = {
  pine: { r: 0.45, sink: 0.2, cast: true, scale: [0.75, 1.35] },
  oak: { r: 0.5, sink: 0.2, cast: true, scale: [0.8, 1.3] },
  birch: { r: 0.3, sink: 0.2, cast: true, scale: [0.8, 1.2] },
  palm: { r: 0.3, sink: 0.1, cast: true, scale: [0.8, 1.2] },
  rock: { r: 0.85, sink: 0.35, cast: true, scale: [0.4, 2.2], tilt: true, minColl: 0.9 },
  bush: { r: 0, sink: 0.1, cast: true, scale: [0.7, 1.4] },
  grass: { r: 0, sink: 0.05, cast: false, scale: [0.7, 1.4], foliage: true },
  flowerY: { r: 0, sink: 0.02, cast: false, scale: [0.8, 1.3], foliage: true },
  flowerW: { r: 0, sink: 0.02, cast: false, scale: [0.8, 1.3], foliage: true },
  flowerV: { r: 0, sink: 0.02, cast: false, scale: [0.8, 1.3], foliage: true },
  reed: { r: 0, sink: 0.05, cast: false, scale: [0.8, 1.3], foliage: true },
  log: { r: 0, sink: 0.05, cast: true, scale: [0.8, 1.2] },
};

const CANDIDATES = 900;

export class Vegetation {
  constructor() {
    this.material = flatMaterial();
    this.uniforms = { uTime: { value: 0 }, uSway: { value: 1 } };
    this.foliageMaterial = flatMaterial({ side: THREE.DoubleSide });
    this.foliageMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.uSway = this.uniforms.uSway;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uSway;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
          #else
            float ph = 0.0;
          #endif
          float sway = sin(uTime * 1.6 + ph) * 0.07 * uSway * max(position.y, 0.0);
          transformed.x += sway;
          transformed.z += sway * 0.6;`,
        );
    };
    this.geos = {
      pine: pineGeo(),
      oak: oakGeo(),
      birch: birchGeo(),
      palm: palmGeo(),
      rock: rockGeo(7),
      bush: bushGeo(),
      grass: grassGeo(),
      flowerY: flowerGeo('#f2cf3b'),
      flowerW: flowerGeo('#f4f1e8'),
      flowerV: flowerGeo('#9a6ad0'),
      reed: reedGeo(),
      log: logGeo(),
    };
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
  }

  update(dt, reducedMotion) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uSway.value = reducedMotion ? 0.35 : 1;
  }

  // Returns { meshes, colliders } for one chunk. Positions are chunk-local.
  populate(chunk, world, heightAt, rng) {
    const { ox, oz, size } = chunk;
    const placements = {};
    const colliders = [];

    for (let i = 0; i < CANDIDATES; i++) {
      const x = ox + rng() * size;
      const z = oz + rng() * size;
      const h = heightAt(x, z);
      const biome = world.biome(x, z, h);
      const table = TABLE[biome];
      if (!table) continue;
      let roll = rng();
      let kind = null;
      for (const k in table) {
        roll -= table[k];
        if (roll < 0) {
          kind = k;
          break;
        }
      }
      if (!kind) continue;
      const info = KINDS[kind];
      // Keep trees off steep ground and out of the water.
      if (info.r > 0 && kind !== 'rock') {
        const s = Math.abs(heightAt(x + 1.5, z) - h) + Math.abs(heightAt(x, z + 1.5) - h);
        if (s > 1.6 || h < 0.6) continue;
      }
      if (h < 0.1 && kind !== 'rock') continue;
      const s = info.scale[0] + rng() * (info.scale[1] - info.scale[0]);
      (placements[kind] ||= []).push({ x, z, h, s, ry: rng() * Math.PI * 2, t: rng() });
      if (info.r > 0 && (!info.minColl || s >= info.minColl)) {
        colliders.push({ x, z, r: info.r * s });
      }
    }

    const meshes = [];
    for (const kind in placements) {
      const list = placements[kind];
      const info = KINDS[kind];
      const mesh = new THREE.InstancedMesh(
        this.geos[kind],
        info.foliage ? this.foliageMaterial : this.material,
        list.length,
      );
      list.forEach((p, i) => {
        this.dummy.position.set(p.x - ox, p.h - info.sink * p.s, p.z - oz);
        if (info.tilt) this.dummy.rotation.set(p.t * 0.6, p.ry, (p.t - 0.5) * 0.6);
        else this.dummy.rotation.set(0, p.ry, 0);
        this.dummy.scale.setScalar(p.s);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
        const b = 0.82 + p.t * 0.32;
        this.color.setRGB(b, b * (0.97 + p.t * 0.06), b * 0.95);
        mesh.setColorAt(i, this.color);
      });
      mesh.castShadow = info.cast;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      meshes.push(mesh);
    }
    return { meshes, colliders };
  }
}
