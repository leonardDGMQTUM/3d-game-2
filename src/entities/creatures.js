// Wildlife: spawning around the player, simple wander/flee AI and animation.
import * as THREE from 'three';
import { BIOME, WATER_LEVEL } from '../world/worldgen.js';
import { buildDeer, buildRabbit, buildFox, buildFrog, buildSwift } from './models.js';
import { wrapAngle } from '../core/noise.js';
import { SPECIES_BY_ID } from '../game/species-data.js';

const GROUND = {
  deer: {
    build: () => buildDeer(Math.random() < 0.4),
    walk: 1.5,
    run: 9,
    alert: 15,
    observe: 24,
    herd: [2, 4],
    biomes: [BIOME.GRASSLAND, BIOME.MEADOW, BIOME.FOREST, BIOME.CONIFER],
    max: 7,
    stride: 4,
  },
  rabbit: {
    build: buildRabbit,
    walk: 0.9,
    run: 7.5,
    alert: 8,
    observe: 13,
    herd: [1, 3],
    biomes: [BIOME.GRASSLAND, BIOME.MEADOW],
    max: 7,
    hop: 0.25,
  },
  fox: {
    build: buildFox,
    walk: 1.6,
    run: 8.5,
    alert: 11,
    observe: 17,
    herd: [1, 1],
    biomes: [BIOME.FOREST, BIOME.GRASSLAND, BIOME.MEADOW, BIOME.CONIFER],
    max: 2,
    stride: 7,
  },
  frog: {
    build: buildFrog,
    walk: 0.5,
    run: 3.2,
    alert: 3.5,
    observe: 7,
    herd: [2, 4],
    biomes: [BIOME.WETLAND, BIOME.BEACH, BIOME.GRASSLAND],
    max: 8,
    hop: 0.18,
    maxH: 3.5,
    minH: 0.15,
    aquatic: true,
  },
};

export class Creatures {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.flocks = [];
    this.spawnTimer = 0;
    this.tmp = new THREE.Vector3();
  }

  clear() {
    for (const c of this.list) this.scene.remove(c.model);
    for (const f of this.flocks) for (const b of f.birds) this.scene.remove(b.model);
    this.list = [];
    this.flocks = [];
  }

  count(id) {
    let n = 0;
    for (const c of this.list) if (c.id === id) n++;
    return n;
  }

  trySpawn(player, terrain, world, sky) {
    // Ground animals
    const ids = Object.keys(GROUND);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const cfg = GROUND[id];
    let cap = cfg.max;
    if (id === 'fox' && sky.state.day > 0.8) cap = 1; // foxes favour dusk and night
    if (this.count(id) < cap) {
      const a = Math.random() * Math.PI * 2;
      const r = 45 + Math.random() * 60;
      const x = player.pos.x + Math.cos(a) * r;
      const z = player.pos.z + Math.sin(a) * r;
      const h = terrain.heightAt(x, z);
      const b = world.biome(x, z, h);
      const ok =
        cfg.biomes.includes(b) && h > (cfg.minH ?? 0.8) && h < (cfg.maxH ?? 45) && (!cfg.aquatic || this.nearWater(x, z, terrain));
      if (ok) {
        const n = cfg.herd[0] + Math.floor(Math.random() * (cfg.herd[1] - cfg.herd[0] + 1));
        for (let i = 0; i < n; i++) this.spawn(id, x + (Math.random() - 0.5) * 6, z + (Math.random() - 0.5) * 6, terrain);
      }
    }

    // Swift flocks on clear days
    if (this.flocks.length < 2 && sky.state.day > 0.5 && Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 60;
      const cx = player.pos.x + Math.cos(a) * r;
      const cz = player.pos.z + Math.sin(a) * r;
      const flock = {
        center: new THREE.Vector3(cx, Math.max(0, terrain.heightAt(cx, cz)) + 24 + Math.random() * 12, cz),
        drift: new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(2),
        birds: [],
      };
      const n = 6 + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) {
        const model = buildSwift();
        this.scene.add(model);
        flock.birds.push({
          id: 'swift',
          model,
          a: Math.random() * Math.PI * 2,
          r: 10 + Math.random() * 14,
          w: (0.5 + Math.random() * 0.4) * (i % 3 === 0 ? -1 : 1),
          h: (Math.random() - 0.5) * 8,
          ph: Math.random() * 6,
          pos: model.position,
        });
      }
      this.flocks.push(flock);
    }
  }

  nearWater(x, z, terrain) {
    for (let a = 0; a < 6.28; a += 0.8) {
      if (terrain.heightAt(x + Math.cos(a) * 8, z + Math.sin(a) * 8) < WATER_LEVEL + 0.1) return true;
    }
    return false;
  }

  spawn(id, x, z, terrain) {
    const cfg = GROUND[id];
    const model = cfg.build();
    model.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    const y = terrain.heightAt(x, z);
    model.position.set(x, y, z);
    this.scene.add(model);
    this.list.push({
      id,
      cfg,
      model,
      pos: model.position,
      heading: Math.random() * Math.PI * 2,
      target: Math.random() * Math.PI * 2,
      state: Math.random() < 0.5 ? 'graze' : 'wander',
      timer: 1 + Math.random() * 4,
      speed: 0,
      phase: Math.random() * 6,
      hopT: 0,
      fleeing: 0,
    });
  }

  update(dt, player, terrain, world, sky) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.2;
      this.trySpawn(player, terrain, world, sky);
    }

    const px = player.pos.x;
    const pz = player.pos.z;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      const dx = c.pos.x - px;
      const dz = c.pos.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist > 170) {
        this.scene.remove(c.model);
        this.list.splice(i, 1);
        continue;
      }
      this.think(c, dt, dist, dx, dz, player);
      this.move(c, dt, terrain);
      this.animate(c, dt);
    }

    for (let f = this.flocks.length - 1; f >= 0; f--) {
      const flock = this.flocks[f];
      flock.center.x += flock.drift.x * dt;
      flock.center.z += flock.drift.y * dt;
      const d = Math.hypot(flock.center.x - px, flock.center.z - pz);
      const leaving = d > 220 || sky.state.day < 0.2;
      if (leaving) flock.center.y += dt * 8;
      if ((leaving && flock.center.y > 160) || d > 300) {
        for (const b of flock.birds) this.scene.remove(b.model);
        this.flocks.splice(f, 1);
        continue;
      }
      for (const b of flock.birds) {
        b.a += (b.w * 9 * dt) / b.r * 3;
        const x = flock.center.x + Math.cos(b.a) * b.r;
        const z = flock.center.z + Math.sin(b.a) * b.r;
        const y = flock.center.y + b.h + Math.sin(b.a * 2 + b.ph) * 2;
        const m = b.model;
        const vx = x - m.position.x;
        const vz = z - m.position.z;
        m.position.set(x, y, z);
        m.rotation.y = Math.atan2(vx, vz);
        m.rotation.z = -Math.sign(b.w) * 0.5;
        const flap = Math.sin(performance.now() * 0.025 + b.ph);
        m.userData.wingL.rotation.z = flap * 0.5;
        m.userData.wingR.rotation.z = -flap * 0.5;
      }
    }
  }

  think(c, dt, dist, dx, dz, player) {
    const alert = c.cfg.alert * player.noise;
    if (dist < alert) {
      c.state = 'flee';
      c.fleeing = 2.5 + Math.random() * 2;
      c.target = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.8;
    }
    c.timer -= dt;
    if (c.state === 'flee') {
      c.fleeing -= dt;
      if (c.fleeing <= 0 && dist > alert * 1.3) {
        c.state = 'wander';
        c.timer = 2 + Math.random() * 3;
      }
    } else if (c.timer <= 0) {
      if (c.state === 'wander') {
        c.state = Math.random() < 0.6 ? 'graze' : 'idle';
        c.timer = 2 + Math.random() * 5;
      } else {
        c.state = 'wander';
        c.target = c.heading + (Math.random() - 0.5) * 2.4;
        c.timer = 2 + Math.random() * 4;
      }
    }
  }

  move(c, dt, terrain) {
    const cfg = c.cfg;
    const want = c.state === 'flee' ? cfg.run : c.state === 'wander' ? cfg.walk : 0;
    c.speed += (want - c.speed) * Math.min(1, dt * 4);
    c.heading += wrapAngle(c.target - c.heading) * Math.min(1, dt * (c.state === 'flee' ? 6 : 2));

    if (c.speed > 0.05) {
      const nx = c.pos.x + Math.sin(c.heading) * c.speed * dt;
      const nz = c.pos.z + Math.cos(c.heading) * c.speed * dt;
      const h = terrain.heightAt(nx, nz);
      const tooLow = h < (cfg.aquatic ? WATER_LEVEL - 0.6 : WATER_LEVEL + 0.4);
      const tooSteep = h - c.pos.y > c.speed * dt * 1.5 + 0.05 && !cfg.hop;
      if (tooLow || tooSteep) {
        c.target = c.heading + Math.PI * (0.6 + Math.random() * 0.8);
      } else {
        c.pos.x = nx;
        c.pos.z = nz;
      }
    }
    const g = terrain.heightAt(c.pos.x, c.pos.z);
    let y = Math.max(g, cfg.aquatic ? WATER_LEVEL - 0.15 : g);
    if (cfg.hop && c.speed > 0.1) {
      c.hopT += dt * (2.5 + c.speed * 0.9);
      y += Math.abs(Math.sin(c.hopT * Math.PI)) * cfg.hop * (0.6 + c.speed * 0.15);
    }
    c.pos.y = y;
    c.model.rotation.y = c.heading;
  }

  animate(c, dt) {
    const u = c.model.userData;
    c.phase += dt * c.speed * (c.cfg.stride ?? 4);
    const s = Math.sin(c.phase);
    if (u.legs && u.legs.length === 4) {
      const amp = Math.min(0.7, c.speed * 0.25);
      u.legs[0].rotation.x = s * amp;
      u.legs[3].rotation.x = s * amp;
      u.legs[1].rotation.x = -s * amp;
      u.legs[2].rotation.x = -s * amp;
    }
    if (u.head) {
      const down = c.state === 'graze' ? 1.1 : c.state === 'idle' ? -0.1 : 0;
      const target = (u.headBase ?? 0) + down * (c.id === 'deer' ? 1 : 0.4);
      u.head.rotation.x += (target - u.head.rotation.x) * Math.min(1, dt * 3);
    }
    if (u.tail) u.tail.rotation.y = Math.sin(c.phase * 0.5) * 0.3;
    if (u.body && c.cfg.hop) {
      const nose = c.speed > 0.1 ? Math.sin(c.hopT * Math.PI * 2) * 0.15 : 0;
      u.body.rotation.x = nose;
    }
  }

  // Best animal to observe: in range, near the centre of view, not fleeing.
  observable(camera, player, discovered) {
    const fwd = this.tmp;
    camera.getWorldDirection(fwd);
    let best = null;
    let bestScore = Infinity;
    const consider = (c, range, cone) => {
      const dx = c.pos.x - camera.position.x;
      const dy = c.pos.y + 0.4 - camera.position.y;
      const dz = c.pos.z - camera.position.z;
      const dc = Math.hypot(dx, dy, dz);
      const dp = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z);
      if (dp > range) return;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fwd.x + dy * fwd.y + dz * fwd.z) / dc)));
      if (ang > cone) return;
      const score = ang * 10 + dp * 0.05 + (discovered.has(c.id) ? 5 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    };
    for (const c of this.list) {
      if (c.state === 'flee') continue;
      consider(c, c.cfg.observe, 0.45);
    }
    for (const f of this.flocks) for (const b of f.birds) consider(b, 70, 0.22);
    return best ? { creature: best, species: SPECIES_BY_ID[best.id] } : null;
  }

  nearestUndiscovered(x, z, discovered) {
    let best = null;
    let bestD = Infinity;
    for (const c of this.list) {
      if (discovered.has(c.id)) continue;
      const d = Math.hypot(c.pos.x - x, c.pos.z - z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (!discovered.has('swift')) {
      for (const f of this.flocks) {
        const d = Math.hypot(f.center.x - x, f.center.z - z);
        if (d < bestD) {
          bestD = d;
          best = { id: 'swift', pos: f.center };
        }
      }
    }
    return best ? { creature: best, dist: bestD } : null;
  }
}
