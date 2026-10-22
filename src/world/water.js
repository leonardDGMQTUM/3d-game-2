// A single animated water sheet that follows the player.
import * as THREE from 'three';
import { WATER_LEVEL } from './worldgen.js';

const vert = /* glsl */ `
uniform float time;
varying vec3 vWorld;
#include <fog_pars_vertex>
float wave(vec2 p) {
  return sin(p.x * 0.15 + time) * 0.08 + cos(p.y * 0.2 + time * 1.3) * 0.06 + sin((p.x + p.y) * 0.5 + time * 2.1) * 0.025;
}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.y += wave(wp.xz);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */ `
uniform float time;
uniform vec3 waterColor;
uniform vec3 skyColor;
uniform vec3 sunColor;
uniform vec3 sunDir;
uniform float sunStrength;
varying vec3 vWorld;
#include <fog_pars_fragment>
void main() {
  vec2 p = vWorld.xz;
  float dx = cos(p.x * 0.15 + time) * 0.012 + cos((p.x + p.y) * 0.5 + time * 2.1) * 0.0125
           + sin(p.x * 1.7 + p.y * 0.6 + time * 2.7) * 0.03;
  float dz = -sin(p.y * 0.2 + time * 1.3) * 0.012 + cos((p.x + p.y) * 0.5 + time * 2.1) * 0.0125
           + cos(p.y * 1.9 - p.x * 0.4 + time * 2.3) * 0.03;
  vec3 n = normalize(vec3(-dx, 1.0, -dz));
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 col = mix(waterColor, skyColor, 0.25 + fres * 0.6);
  vec3 r = reflect(-sunDir, n);
  float spec = pow(max(dot(r, v), 0.0), 120.0) * sunStrength;
  col += sunColor * spec * 1.5;
  gl_FragColor = vec4(col, mix(0.72, 0.95, fres));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class Water {
  constructor(scene, size) {
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        time: { value: 0 },
        waterColor: { value: new THREE.Color('#2a6f8f') },
        skyColor: { value: new THREE.Color('#b8daf2') },
        sunColor: { value: new THREE.Color('#ffffff') },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        sunStrength: { value: 1 },
      },
    ]);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 96, 96), mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = WATER_LEVEL;
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    this.setSize(size);
    scene.add(this.mesh);
    this.day = new THREE.Color('#2a6f8f');
    this.nightC = new THREE.Color('#0e2233');
  }

  setSize(size) {
    this.mesh.scale.set(size, size, 1);
  }

  update(dt, focus, sky) {
    this.uniforms.time.value += dt;
    this.mesh.position.x = Math.round(focus.x / 16) * 16;
    this.mesh.position.z = Math.round(focus.z / 16) * 16;
    const s = sky.state;
    this.uniforms.skyColor.value.copy(sky.uniforms.horizonColor.value);
    this.uniforms.sunColor.value.copy(sky.sun.color);
    this.uniforms.sunDir.value.copy(sky.sun.position).sub(focus).normalize();
    this.uniforms.sunStrength.value = s.night > 0.5 ? 0.3 : s.day + s.dusk * 0.8;
    this.uniforms.waterColor.value.copy(this.day).lerp(this.nightC, s.night);
  }
}
