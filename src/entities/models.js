// Low-poly character and animal models, built from boxes with pivot joints.
import * as THREE from 'three';

const mats = new Map();
function mat(color) {
  if (!mats.has(color)) {
    mats.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 }));
  }
  return mats.get(color);
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function pivot(x, y, z, ...children) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  children.forEach((c) => g.add(c));
  return g;
}

// The naturalist. Faces +Z. Feet at y = 0.
export function buildExplorer() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = '#e2b48c';
  const jacket = '#5b6e3a';
  const trousers = '#6b5a42';
  const boots = '#3a2a1e';

  const legL = pivot(0.12, 0.9, 0, box(0.17, 0.62, 0.19, trousers, 0, -0.31, 0), box(0.19, 0.24, 0.27, boots, 0, -0.74, 0.04));
  const legR = pivot(-0.12, 0.9, 0, box(0.17, 0.62, 0.19, trousers, 0, -0.31, 0), box(0.19, 0.24, 0.27, boots, 0, -0.74, 0.04));

  const torso = new THREE.Group();
  torso.position.y = 0.9;
  torso.add(box(0.48, 0.62, 0.29, jacket, 0, 0.31, 0));
  torso.add(box(0.5, 0.07, 0.31, '#3d2f22', 0, 0.04, 0)); // belt
  torso.add(box(0.14, 0.2, 0.02, '#4b5a2e', 0.12, 0.38, 0.155)); // pocket
  torso.add(box(0.14, 0.2, 0.02, '#4b5a2e', -0.12, 0.38, 0.155));
  // Backpack with a bedroll
  torso.add(box(0.38, 0.46, 0.2, '#6b4a2f', 0, 0.32, -0.24));
  const roll = cyl(0.09, 0.09, 0.44, '#a33b2b', 0, 0.62, -0.25);
  roll.rotation.z = Math.PI / 2;
  torso.add(roll);
  // Vasculum: a botanist's collecting tin, slung at the hip
  const tin = cyl(0.08, 0.08, 0.32, '#9aa5a0', 0.3, 0.06, 0.02);
  tin.rotation.z = Math.PI / 2;
  torso.add(tin);

  const head = new THREE.Group();
  head.position.y = 0.66;
  head.add(box(0.3, 0.3, 0.3, skin, 0, 0.15, 0));
  head.add(box(0.05, 0.05, 0.02, '#2a1f18', 0.07, 0.18, 0.151));
  head.add(box(0.05, 0.05, 0.02, '#2a1f18', -0.07, 0.18, 0.151));
  head.add(box(0.31, 0.08, 0.31, '#4a3424', 0, 0.27, -0.01)); // hair
  head.add(cyl(0.3, 0.3, 0.035, '#b08a5a', 0, 0.33, 0, 12)); // hat brim
  head.add(cyl(0.17, 0.19, 0.17, '#b08a5a', 0, 0.42, 0, 10)); // crown
  head.add(cyl(0.195, 0.195, 0.04, '#5a3d24', 0, 0.36, 0, 10)); // band
  torso.add(head);

  const armL = pivot(0.31, 0.56, 0, box(0.13, 0.56, 0.15, jacket, 0, -0.26, 0), box(0.11, 0.11, 0.12, skin, 0, -0.58, 0));
  const armR = pivot(-0.31, 0.56, 0, box(0.13, 0.56, 0.15, jacket, 0, -0.26, 0), box(0.11, 0.11, 0.12, skin, 0, -0.58, 0));
  torso.add(armL, armR);

  body.add(legL, legR, torso);
  root.userData = { body, torso, head, legL, legR, armL, armR };
  return root;
}

// ---------- Animals (all face +Z, feet at y = 0) ----------

function legs4(group, color, w, h, fx, bx, sx, y) {
  const out = [];
  for (const [x, z] of [
    [sx, fx],
    [-sx, fx],
    [sx, bx],
    [-sx, bx],
  ]) {
    const p = pivot(x, y, z, box(w, h, w, color, 0, -h / 2, 0));
    group.add(p);
    out.push(p);
  }
  return out;
}

export function buildDeer(stag) {
  const g = new THREE.Group();
  const coat = '#8a5a3b';
  g.add(box(0.5, 0.5, 1.3, coat, 0, 1.1, 0));
  g.add(box(0.42, 0.12, 1.1, '#b08a64', 0, 0.86, 0)); // pale belly
  g.add(box(0.36, 0.34, 0.12, '#e8dcc8', 0, 1.15, -0.64)); // rump patch
  const neck = pivot(0, 1.25, 0.55, box(0.24, 0.6, 0.26, coat, 0, 0.25, 0.08));
  neck.rotation.x = 0.45;
  const head = pivot(0, 0.55, 0.12, box(0.24, 0.24, 0.42, coat, 0, 0, 0.15), box(0.14, 0.12, 0.08, '#2a1f18', 0, -0.03, 0.38));
  head.add(box(0.06, 0.16, 0.04, coat, 0.13, 0.15, -0.02));
  head.add(box(0.06, 0.16, 0.04, coat, -0.13, 0.15, -0.02));
  if (stag) {
    for (const s of [1, -1]) {
      const a = cyl(0.025, 0.035, 0.55, '#d8c8a8', 0.1 * s, 0.38, -0.02, 5);
      a.rotation.z = -0.4 * s;
      head.add(a);
      const t1 = cyl(0.02, 0.025, 0.25, '#d8c8a8', 0.2 * s, 0.45, 0.08, 4);
      t1.rotation.x = 0.8;
      head.add(t1);
      const t2 = cyl(0.02, 0.025, 0.22, '#d8c8a8', 0.24 * s, 0.6, 0.02, 4);
      t2.rotation.z = -0.9 * s;
      head.add(t2);
    }
  }
  head.rotation.x = -0.45;
  neck.add(head);
  g.add(neck);
  g.add(box(0.1, 0.16, 0.06, coat, 0, 1.25, -0.68));
  const legs = legs4(g, '#6e4630', 0.11, 0.86, 0.48, -0.48, 0.16, 0.88);
  g.userData = { legs, head: neck, headBase: 0.45 };
  return g;
}

export function buildRabbit() {
  const g = new THREE.Group();
  const fur = '#8c7a66';
  const body = new THREE.Group();
  body.add(box(0.24, 0.22, 0.38, fur, 0, 0.2, 0));
  body.add(box(0.18, 0.18, 0.2, fur, 0, 0.3, 0.2));
  body.add(box(0.03, 0.03, 0.02, '#111', 0.07, 0.33, 0.3));
  body.add(box(0.03, 0.03, 0.02, '#111', -0.07, 0.33, 0.3));
  const earL = box(0.05, 0.22, 0.03, '#9a8672', 0.05, 0.48, 0.17);
  const earR = box(0.05, 0.22, 0.03, '#9a8672', -0.05, 0.48, 0.17);
  earL.rotation.x = -0.25;
  earR.rotation.x = -0.25;
  body.add(earL, earR);
  body.add(box(0.09, 0.09, 0.08, '#f4efe6', 0, 0.24, -0.22));
  body.add(box(0.07, 0.08, 0.16, fur, 0.1, 0.06, -0.1));
  body.add(box(0.07, 0.08, 0.16, fur, -0.1, 0.06, -0.1));
  g.add(body);
  g.userData = { body, legs: [] };
  g.scale.setScalar(1.15);
  return g;
}

export function buildFox() {
  const g = new THREE.Group();
  const fur = '#c8642a';
  g.add(box(0.26, 0.26, 0.72, fur, 0, 0.42, 0));
  g.add(box(0.2, 0.08, 0.6, '#f0e2cc', 0, 0.3, 0.02));
  const head = pivot(0, 0.52, 0.4, box(0.24, 0.2, 0.22, fur, 0, 0, 0.06), box(0.12, 0.1, 0.18, '#e9d8c0', 0, -0.04, 0.24));
  head.add(box(0.05, 0.04, 0.04, '#1a1a1a', 0, -0.02, 0.34));
  head.add(box(0.07, 0.12, 0.04, '#7a3a1a', 0.08, 0.15, 0.02));
  head.add(box(0.07, 0.12, 0.04, '#7a3a1a', -0.08, 0.15, 0.02));
  g.add(head);
  const tail = pivot(0, 0.45, -0.36, box(0.14, 0.14, 0.5, fur, 0, -0.04, -0.25), box(0.12, 0.12, 0.14, '#f4efe6', 0, -0.06, -0.55));
  tail.rotation.x = 0.35;
  g.add(tail);
  const legs = legs4(g, '#3a2418', 0.07, 0.32, 0.26, -0.26, 0.09, 0.32);
  g.userData = { legs, head, headBase: 0, tail };
  return g;
}

export function buildFrog() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const skin = '#7a8a3a';
  body.add(box(0.18, 0.09, 0.22, skin, 0, 0.07, 0));
  body.add(box(0.14, 0.07, 0.09, '#869646', 0, 0.09, 0.13));
  body.add(box(0.045, 0.045, 0.045, '#d8b030', 0.05, 0.13, 0.12));
  body.add(box(0.045, 0.045, 0.045, '#d8b030', -0.05, 0.13, 0.12));
  body.add(box(0.06, 0.04, 0.16, '#5f6e2c', 0.11, 0.03, -0.06));
  body.add(box(0.06, 0.04, 0.16, '#5f6e2c', -0.11, 0.03, -0.06));
  g.add(body);
  g.userData = { body, legs: [] };
  g.scale.setScalar(1.6);
  return g;
}

export function buildSwift() {
  const g = new THREE.Group();
  const dark = '#2a2622';
  g.add(box(0.1, 0.08, 0.32, dark, 0, 0, 0));
  g.add(box(0.06, 0.03, 0.04, '#d8d0c4', 0, -0.02, 0.15));
  const wingL = pivot(0.05, 0, 0.02, box(0.6, 0.02, 0.1, dark, 0.3, 0, -0.06));
  const wingR = pivot(-0.05, 0, 0.02, box(0.6, 0.02, 0.1, dark, -0.3, 0, -0.06));
  wingL.rotation.y = 0.45;
  wingR.rotation.y = -0.45;
  g.add(wingL, wingR);
  g.add(box(0.12, 0.02, 0.14, dark, 0, 0, -0.2));
  g.userData = { wingL, wingR };
  g.scale.setScalar(1.8);
  return g;
}
