// Drifting clouds and night-time fireflies.
import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';

const CLOUD_RANGE = 520;

export class Clouds {
  constructor(scene) {
    const rng = mulberry32(4242);
    this.clouds = [];
    const puffs = [];
    for (let i = 0; i < 34; i++) {
      const c = { x: (rng() * 2 - 1) * CLOUD_RANGE, z: (rng() * 2 - 1) * CLOUD_RANGE, y: 130 + rng() * 50, puffs: [] };
      const n = 3 + Math.floor(rng() * 4);
      for (let k = 0; k < n; k++) {
        c.puffs.push({ dx: (k - n / 2) * 9 + rng() * 6, dy: rng() * 4, dz: (rng() - 0.5) * 10, s: 7 + rng() * 7 });
      }
      this.clouds.push(c);
      puffs.push(...c.puffs);
    }
    const geo = new THREE.IcosahedronGeometry(1, 1);
    this.mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, fog: false, transparent: true, opacity: 0.92 });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, puffs.length);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.dummy = new THREE.Object3D();
    this.wind = new THREE.Vector2(2.2, 0.8);
  }

  update(dt, focus, night) {
    let i = 0;
    for (const c of this.clouds) {
      c.x += this.wind.x * dt;
      c.z += this.wind.y * dt;
      // Wrap clouds around the player so the sky never empties.
      let rx = c.x - focus.x;
      let rz = c.z - focus.z;
      if (rx > CLOUD_RANGE) c.x -= CLOUD_RANGE * 2;
      if (rx < -CLOUD_RANGE) c.x += CLOUD_RANGE * 2;
      if (rz > CLOUD_RANGE) c.z -= CLOUD_RANGE * 2;
      if (rz < -CLOUD_RANGE) c.z += CLOUD_RANGE * 2;
      for (const p of c.puffs) {
        this.dummy.position.set(c.x + p.dx, c.y + p.dy, c.z + p.dz);
        this.dummy.scale.set(p.s, p.s * 0.55, p.s * 0.8);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i++, this.dummy.matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mat.opacity = 0.92 - night * 0.45;
  }
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// A swarm of fireflies that gathers around the player on warm nights.
export class Fireflies {
  constructor(scene) {
    this.count = 70;
    const rng = mulberry32(777);
    this.seeds = [];
    const pos = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      this.seeds.push({ a: rng() * 6.28, r: 3 + rng() * 14, h: 0.4 + rng() * 2.2, sp: 0.2 + rng() * 0.5, ph: rng() * 6.28 });
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({
      color: new THREE.Color('#d8ff6a'),
      size: 0.35,
      map: dotTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.time = 0;
    this.strength = 0;
    this.center = new THREE.Vector3();
  }

  // `active` is 0..1: how suitable the current spot and time are.
  update(dt, focus, heightAt, active) {
    this.time += dt;
    this.strength += (active - this.strength) * Math.min(1, dt * 0.8);
    this.center.lerp(focus, Math.min(1, dt * 0.5));
    if (this.center.distanceToSquared(focus) > 900) this.center.copy(focus);
    const pos = this.geo.attributes.position;
    for (let i = 0; i < this.count; i++) {
      const s = this.seeds[i];
      const a = s.a + this.time * s.sp * 0.3;
      const x = this.center.x + Math.cos(a) * s.r + Math.sin(this.time * s.sp + s.ph) * 1.5;
      const z = this.center.z + Math.sin(a) * s.r + Math.cos(this.time * s.sp * 1.3 + s.ph) * 1.5;
      const y = heightAt(x, z) + s.h + Math.sin(this.time * 0.9 + s.ph) * 0.4;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    // Each firefly flashes on its own rhythm.
    const flash = 0.55 + 0.45 * Math.sin(this.time * 2.3);
    this.mat.opacity = this.strength * flash;
    this.points.visible = this.strength > 0.02;
  }
}
