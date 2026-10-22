// Third-person orbit camera that keeps out of the ground.
import * as THREE from 'three';
import { clamp } from './noise.js';
import { WATER_LEVEL } from '../world/worldgen.js';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.32;
    this.dist = 7;
    this.targetDist = 7;
    this.target = new THREE.Vector3();
    this.smoothDist = 7;
  }

  look(dx, dy, sens, invertY) {
    this.yaw -= dx * 0.0022 * sens;
    this.pitch += dy * 0.0022 * sens * (invertY ? -1 : 1);
    this.pitch = clamp(this.pitch, -0.35, 1.3);
  }

  zoom(steps) {
    this.targetDist = clamp(this.targetDist + steps * 0.9, 2.5, 16);
  }

  snap(focus) {
    this.target.copy(focus);
    this.target.y += 1.55;
  }

  // `trees` (optional): nearby trunk colliders; the camera avoids their canopies.
  update(dt, focus, heightAt, smooth, trees = []) {
    const follow = 1 - Math.exp(-(smooth ? 6 : 14) * dt);
    this.target.x += (focus.x - this.target.x) * follow;
    this.target.y += (focus.y + 1.55 - this.target.y) * follow;
    this.target.z += (focus.z - this.target.z) * follow;

    this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 8);
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    // Pull in if the terrain is between the player and the camera.
    let d = this.dist;
    for (let i = 1; i <= 6; i++) {
      const t = (i / 6) * this.dist;
      const x = this.target.x + dir.x * t;
      const y = this.target.y + dir.y * t;
      const z = this.target.z + dir.z * t;
      const g = heightAt(x, z);
      let blocked = y < g + 0.4;
      if (!blocked && y - g > 2.3) {
        for (const c of trees) {
          if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r * 3.6) ** 2) {
            blocked = true;
            break;
          }
        }
      }
      if (blocked) {
        d = Math.max(1.2, t * 0.85);
        break;
      }
    }
    this.smoothDist += (d - this.smoothDist) * Math.min(1, dt * (d < this.smoothDist ? 20 : 4));

    const cam = this.camera.position;
    cam.copy(this.target).addScaledVector(dir, this.smoothDist);
    const floor = Math.max(heightAt(cam.x, cam.z) + 0.4, WATER_LEVEL + 0.35);
    if (cam.y < floor) cam.y = floor;
    this.camera.lookAt(this.target);
  }
}
