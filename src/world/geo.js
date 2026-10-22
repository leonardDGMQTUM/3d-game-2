// Helpers for building low-poly, vertex-coloured models out of primitives.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const tmpColor = new THREE.Color();

// Take a primitive, transform it and paint it a flat colour.
export function part(geometry, color, t = {}) {
  let g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g === geometry) g = geometry.clone();
  g.deleteAttribute('uv');
  if (t.sx || t.sy || t.sz) g.scale(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
  if (t.rx) g.rotateX(t.rx);
  if (t.rz) g.rotateZ(t.rz);
  if (t.ry) g.rotateY(t.ry);
  g.translate(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  tmpColor.set(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = tmpColor.r;
    arr[i * 3 + 1] = tmpColor.g;
    arr[i * 3 + 2] = tmpColor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// Displace vertices by a hash of their position, so that duplicated corners
// of a non-indexed mesh move together and faces stay sealed.
export function jitter(g, amount, seed = 1) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = Math.round(x * 1000) * 73856093 ^ Math.round(y * 1000) * 19349663 ^ Math.round(z * 1000) * 83492791 ^ seed;
    const h1 = Math.sin(k * 0.0001) * 43758.5453;
    const h2 = Math.sin(k * 0.00013 + 1.7) * 24634.6345;
    const h3 = Math.sin(k * 0.00017 + 3.1) * 12345.6789;
    pos.setXYZ(
      i,
      x + (h1 - Math.floor(h1) - 0.5) * amount,
      y + (h2 - Math.floor(h2) - 0.5) * amount,
      z + (h3 - Math.floor(h3) - 0.5) * amount,
    );
  }
  pos.needsUpdate = true;
  return g;
}

export function merge(parts) {
  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.computeBoundingBox();
  for (const p of parts) p.dispose();
  return g;
}

export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg),
  cone: (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg),
  ico: (r, detail = 0) => new THREE.IcosahedronGeometry(r, detail),
  dodeca: (r) => new THREE.DodecahedronGeometry(r, 0),
  dome: (r, seg = 8) => new THREE.SphereGeometry(r, seg, 4, 0, Math.PI * 2, 0, Math.PI / 2),
};

// Shared flat-shaded material for vertex-coloured models.
export function flatMaterial(opts = {}) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.9,
    metalness: 0,
    ...opts,
  });
}
