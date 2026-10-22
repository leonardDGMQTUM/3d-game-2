// Third-person explorer: movement, physics against the heightfield, animation.
import * as THREE from 'three';
import { buildExplorer } from './models.js';
import { WATER_LEVEL } from '../world/worldgen.js';
import { clamp, lerp, wrapAngle } from '../core/noise.js';

const WALK = 4.4;
const SPRINT = 8.2;
const SNEAK = 2.1;
const SWIM = 2.6;
const SWIM_FAST = 3.8;
const JUMP = 6.8;
const GRAVITY = 20;
const RADIUS = 0.35;
const SWIM_DEPTH = 1.25;

export class Player {
  constructor(scene) {
    this.model = buildExplorer();
    scene.add(this.model);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.facing = 0;
    this.onGround = false;
    this.swimming = false;
    this.sneaking = false;
    this.sprinting = false;
    this.stamina = 1;
    this.exhausted = false;
    this.phase = 0;
    this.speed = 0;
    this.time = 0;
    this.noise = 1; // how loud we are (scales animal alert radius)
  }

  place(x, z, heightAt) {
    this.pos.set(x, Math.max(heightAt(x, z), WATER_LEVEL - SWIM_DEPTH), z);
    this.vel.set(0, 0, 0);
    this.model.position.copy(this.pos);
  }

  update(dt, input, camYaw, terrain) {
    this.time += dt;
    const heightAt = terrain.heightAt;

    if (input.pressed('KeyC')) this.sneaking = !this.sneaking;

    // Desired direction relative to the camera.
    const mx = input.axisX();
    const mz = input.axisZ();
    const fwdX = -Math.sin(camYaw);
    const fwdZ = -Math.cos(camYaw);
    const rightX = Math.cos(camYaw);
    const rightZ = -Math.sin(camYaw);
    let dx = fwdX * mz + rightX * mx;
    let dz = fwdZ * mz + rightZ * mx;
    const len = Math.hypot(dx, dz);
    const moving = len > 0.05;
    if (len > 1) {
      dx /= len;
      dz /= len;
    }

    const ground = heightAt(this.pos.x, this.pos.z);
    const depth = WATER_LEVEL - ground;
    this.swimming = depth > SWIM_DEPTH && this.pos.y <= WATER_LEVEL - SWIM_DEPTH + 0.3;

    // Stamina and sprint
    const wantSprint = input.sprint() && moving && !this.sneaking;
    if (this.stamina < 0.02) this.exhausted = true;
    if (this.exhausted && this.stamina > 0.3) this.exhausted = false;
    this.sprinting = wantSprint && !this.exhausted;
    if (this.sprinting) this.stamina = Math.max(0, this.stamina - dt * (this.swimming ? 0.12 : 0.16));
    else this.stamina = Math.min(1, this.stamina + dt * 0.22);

    let speed;
    if (this.swimming) speed = this.sprinting ? SWIM_FAST : SWIM;
    else if (this.sneaking) speed = SNEAK;
    else speed = this.sprinting ? SPRINT : WALK;
    if (!this.swimming && depth > 0.45) speed *= 0.7; // wading

    const tx = dx * speed;
    const tz = dz * speed;
    const k = this.onGround || this.swimming ? 1 - Math.exp(-12 * dt) : 1 - Math.exp(-2.5 * dt);
    this.vel.x = lerp(this.vel.x, tx, k);
    this.vel.z = lerp(this.vel.z, tz, k);

    // Vertical
    if (this.swimming) {
      const target = WATER_LEVEL - SWIM_DEPTH + Math.sin(this.time * 2) * 0.04;
      this.pos.y = lerp(this.pos.y, target, 1 - Math.exp(-6 * dt));
      this.vel.y = 0;
      this.onGround = false;
    } else {
      if (this.onGround && input.pressed('Space')) {
        this.vel.y = JUMP;
        this.onGround = false;
      }
      this.vel.y -= GRAVITY * dt;
    }

    // Horizontal move with a slope limit: very steep rises block you.
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    if (this.canStep(this.pos.x, this.pos.z, nx, nz, heightAt)) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else if (this.canStep(this.pos.x, this.pos.z, nx, this.pos.z, heightAt)) {
      this.pos.x = nx;
      this.vel.z *= 0.5;
    } else if (this.canStep(this.pos.x, this.pos.z, this.pos.x, nz, heightAt)) {
      this.pos.z = nz;
      this.vel.x *= 0.5;
    } else {
      this.vel.x = 0;
      this.vel.z = 0;
    }

    // Trees and boulders
    for (const c of terrain.collidersNear(this.pos.x, this.pos.z)) {
      const ox = this.pos.x - c.x;
      const oz = this.pos.z - c.z;
      const d = Math.hypot(ox, oz);
      const min = c.r + RADIUS;
      if (d < min && d > 1e-4) {
        this.pos.x = c.x + (ox / d) * min;
        this.pos.z = c.z + (oz / d) * min;
      }
    }

    if (!this.swimming) {
      this.pos.y += this.vel.y * dt;
      const g = heightAt(this.pos.x, this.pos.z);
      if (this.pos.y <= g) {
        this.pos.y = g;
        this.vel.y = 0;
        this.onGround = true;
      } else if (this.onGround && this.vel.y <= 0 && this.pos.y - g < 0.6) {
        this.pos.y = g; // stick to the ground when walking downhill
        this.vel.y = 0;
      } else {
        this.onGround = false;
      }
      // Entering deep water from above
      if (WATER_LEVEL - g > SWIM_DEPTH && this.pos.y < WATER_LEVEL - SWIM_DEPTH) {
        this.pos.y = WATER_LEVEL - SWIM_DEPTH;
        this.vel.y = 0;
      }
    }

    // Facing
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.3) {
      const target = Math.atan2(this.vel.x, this.vel.z);
      this.facing += wrapAngle(target - this.facing) * Math.min(1, dt * 12);
    }

    this.noise = this.sprinting ? 1.7 : this.sneaking ? 0.45 : moving ? 1 : 0.7;
    this.animate(dt);
  }

  canStep(x0, z0, x1, z1, heightAt) {
    const h0 = heightAt(x0, z0);
    const h1 = heightAt(x1, z1);
    if (WATER_LEVEL - h1 > SWIM_DEPTH) return true; // swimming over anything
    const dist = Math.hypot(x1 - x0, z1 - z0);
    if (dist < 1e-5) return true;
    if (!this.onGround && !this.swimming) return h1 < this.pos.y + 0.3 || h1 - h0 < dist * 1.4;
    return h1 - h0 < dist * 1.4 + 0.02;
  }

  animate(dt) {
    const u = this.model.userData;
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.facing;

    const s = clamp(this.speed / WALK, 0, 1.6);
    this.phase += dt * (3 + this.speed * 1.6);
    const sw = Math.sin(this.phase);
    const damp = 1 - Math.exp(-12 * dt);

    let legSwing = sw * 0.75 * Math.min(s, 1.2);
    let armSwing = -sw * 0.6 * Math.min(s, 1.2);
    let torsoTilt = 0;
    let bodyY = 0;
    let bodyZ = 0;
    let bodyTilt = 0;
    let armRaise = 0;

    if (this.swimming) {
      bodyTilt = 1.1;
      bodyY = 0.75;
      bodyZ = -0.9;
      legSwing = Math.sin(this.time * 6) * 0.4;
      armSwing = Math.sin(this.time * 3) * 1.4;
      armRaise = -1.5;
    } else if (!this.onGround) {
      legSwing = 0.5;
      armSwing = -0.4;
      armRaise = -0.6;
    } else if (this.sneaking) {
      bodyY = -0.22;
      torsoTilt = 0.35;
      legSwing *= 0.6;
    } else if (this.speed < 0.2) {
      // idle breathing
      torsoTilt = Math.sin(this.time * 1.6) * 0.02;
    }
    if (this.sprinting) torsoTilt = 0.18;

    u.legL.rotation.x = lerp(u.legL.rotation.x, legSwing, damp);
    u.legR.rotation.x = lerp(u.legR.rotation.x, -legSwing, damp);
    u.armL.rotation.x = lerp(u.armL.rotation.x, armSwing + armRaise, damp);
    u.armR.rotation.x = lerp(u.armR.rotation.x, -armSwing + armRaise, damp);
    u.torso.rotation.x = lerp(u.torso.rotation.x, torsoTilt, damp);
    u.body.position.y = lerp(u.body.position.y, bodyY + (this.onGround && s > 0.1 ? Math.abs(sw) * 0.05 : 0), damp);
    u.body.position.z = lerp(u.body.position.z, bodyZ, damp);
    u.body.rotation.x = lerp(u.body.rotation.x, bodyTilt, damp);
  }
}
