// Sky dome, sun & moon light, stars and the day/night cycle.
import * as THREE from 'three';
import { smoothstep, mulberry32 } from '../core/noise.js';

const C = (h) => new THREE.Color(h);
const addScaled = (out, c, k) => {
  out.r += c.r * k;
  out.g += c.g * k;
  out.b += c.b * k;
  return out;
};
const DAY_TOP = C('#3d7fd6');
const DAY_HOR = C('#b8daf2');
const DUSK_TOP = C('#3a4677');
const DUSK_HOR = C('#f0a66a');
const NIGHT_TOP = C('#0a1024');
const NIGHT_HOR = C('#1f2b4d');
const SUN_LOW = C('#ffb070');
const SUN_HIGH = C('#fff4e0');
const MOON = C('#a9bcff');
const GROUND = C('#5a4b3a');

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const skyFrag = /* glsl */ `
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform vec3 glowColor;
uniform vec3 sunColor;
uniform vec3 sunDir;
uniform float glow;
uniform float night;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.45));
  float sd = max(dot(d, sunDir), 0.0);
  col += glowColor * pow(sd, 5.0) * glow * (1.0 - smoothstep(0.0, 0.6, h));
  float above = smoothstep(-0.03, 0.02, h);
  col += sunColor * (smoothstep(0.9988, 0.9995, sd) * 5.0 + pow(sd, 90.0) * 0.5) * above * (1.0 - night * 0.9);
  float md = max(dot(d, -sunDir), 0.0);
  col += vec3(0.85, 0.9, 1.0) * smoothstep(0.99935, 0.9997, md) * night * 1.4 * above;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.uniforms = {
      topColor: { value: DAY_TOP.clone() },
      horizonColor: { value: DAY_HOR.clone() },
      glowColor: { value: DUSK_HOR.clone() },
      sunColor: { value: SUN_HIGH.clone() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      glow: { value: 0 },
      night: { value: 0 },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // Stars
    const rng = mulberry32(99);
    const n = 1400;
    const sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rng() * 2 - 1;
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      sp[i * 3] = Math.cos(a) * r * 850;
      sp[i * 3 + 1] = Math.abs(u) * 850;
      sp[i * 3 + 2] = Math.sin(a) * r * 850;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -60;
    sc.right = 60;
    sc.top = 60;
    sc.bottom = -60;
    sc.near = 1;
    sc.far = 320;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5a4b3a, 0.8);
    scene.add(this.hemi);

    this.fogColor = new THREE.Color();
    this.state = { night: 0, day: 1, sunElev: 1 };
  }

  setShadows(on) {
    this.sun.castShadow = on;
  }

  // t: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
  update(t, camera, focus) {
    const ang = (t - 0.25) * Math.PI * 2;
    const sunDir = this.uniforms.sunDir.value;
    sunDir.set(Math.cos(ang), Math.sin(ang), 0.35).normalize();
    const elev = sunDir.y;

    const day = smoothstep(0.0, 0.35, elev);
    const night = smoothstep(0.05, -0.22, elev);
    const dusk = Math.max(0, 1 - day - night);

    const top = this.uniforms.topColor.value;
    const hor = this.uniforms.horizonColor.value;
    top.setRGB(0, 0, 0);
    addScaled(top, DAY_TOP, day);
    addScaled(top, DUSK_TOP, dusk);
    addScaled(top, NIGHT_TOP, night);
    hor.setRGB(0, 0, 0);
    addScaled(hor, DAY_HOR, day + dusk * 0.3);
    addScaled(hor, DUSK_HOR, dusk * 0.7);
    addScaled(hor, NIGHT_HOR, night);
    this.uniforms.glow.value = dusk * 1.2;
    this.uniforms.night.value = night;
    this.uniforms.sunColor.value.copy(SUN_LOW).lerp(SUN_HIGH, day);

    this.dome.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    this.stars.rotation.z = t * Math.PI * 2;
    this.starMat.opacity = night * 0.9;

    // Directional light: the sun by day, the moon by night.
    if (elev > -0.04) {
      this.sun.position.copy(sunDir).multiplyScalar(150).add(focus);
      this.sun.color.copy(SUN_LOW).lerp(SUN_HIGH, day);
      this.sun.intensity = 2.6 * smoothstep(-0.04, 0.22, elev);
    } else {
      this.sun.position.copy(sunDir).multiplyScalar(-150).add(focus);
      this.sun.color.copy(MOON);
      this.sun.intensity = 0.45 * night;
    }
    this.sun.target.position.copy(focus);

    this.hemi.intensity = 0.8 + 0.55 * day + 0.25 * dusk;
    this.hemi.color.copy(top).lerp(DAY_HOR, 0.5);
    this.hemi.groundColor.setRGB(0.12, 0.1, 0.08).lerp(GROUND, day);

    this.fogColor.copy(hor);
    this.state.night = night;
    this.state.day = day;
    this.state.dusk = dusk;
    this.state.sunElev = elev;
    this.state.sunDir = sunDir;
    return this.state;
  }
}
