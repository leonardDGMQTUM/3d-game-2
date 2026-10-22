// Pure terrain + biome functions. No three.js here: given (x, z) these return
// the ground height and the biome, deterministically from the seed.
import { Simplex2, mulberry32, smoothstep, clamp } from '../core/noise.js';

export const WATER_LEVEL = 0;

export const BIOME = {
  OCEAN: 0,
  BEACH: 1,
  WETLAND: 2,
  GRASSLAND: 3,
  MEADOW: 4,
  FOREST: 5,
  CONIFER: 6,
  ALPINE: 7,
  ROCK: 8,
  SNOW: 9,
};

export const BIOME_NAMES = [
  'Open water',
  'Coastal sands',
  'Wetland',
  'Grassland',
  'Dry meadow',
  'Broadleaf woodland',
  'Conifer forest',
  'Cloud slopes',
  'Highland rock',
  'Snowfields',
];

export class WorldGen {
  constructor(seed) {
    this.seed = seed >>> 0;
    const rng = mulberry32(this.seed);
    this.warpN = new Simplex2(rng);
    this.contN = new Simplex2(rng);
    this.hillN = new Simplex2(rng);
    this.ridgeN = new Simplex2(rng);
    this.mtnN = new Simplex2(rng);
    this.detailN = new Simplex2(rng);
    this.moistN = new Simplex2(rng);
    this.varN = new Simplex2(rng);
  }

  fbm(n, x, z, octaves) {
    let sum = 0;
    let amp = 1;
    let f = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      // Offset each octave so they never line up (avoids a spike at the origin).
      sum += n.noise(x * f + i * 17.31, z * f - i * 9.73) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  }

  ridged(n, x, z, octaves) {
    let sum = 0;
    let amp = 1;
    let f = 1;
    let norm = 0;
    let prev = 1;
    for (let i = 0; i < octaves; i++) {
      const nv = n.noise(x * f + i * 23.17, z * f + i * 11.41);
      let v = 1.02 - Math.sqrt(nv * nv + 0.012); // a softened |n| keeps crests climbable
      v *= v;
      sum += v * amp * prev;
      norm += amp;
      prev = v;
      amp *= 0.45;
      f *= 2.1;
    }
    return sum / norm;
  }

  // "Continentalness": < 0 is sea, > 0 is land. The spawn area is nudged up so
  // a new expedition always starts on solid ground.
  continent(x, z, wx, wz) {
    const d2 = x * x + z * z;
    return (
      this.fbm(this.contN, wx * 0.001, wz * 0.001, 4) * 1.6 +
      0.06 +
      0.45 * Math.exp(-d2 / (2 * 260 * 260))
    );
  }

  height(x, z) {
    const wx = x + this.warpN.noise(x * 0.0021, z * 0.0021) * 45;
    const wz = z + this.warpN.noise(x * 0.0021 + 57.1, z * 0.0021 - 23.9) * 45;
    const c = this.continent(x, z, wx, wz);
    const land = smoothstep(-0.1, 0.3, c);

    let h = c * 28;
    h += this.fbm(this.hillN, wx * 0.0065, wz * 0.0065, 4) * 9 * (0.3 + 0.7 * land);

    const mmask = smoothstep(0.25, 0.7, c * 0.8 + this.mtnN.noise(x * 0.0016, z * 0.0016) * 0.45);
    if (mmask > 0) {
      h += Math.pow(this.ridged(this.ridgeN, wx * 0.0026, wz * 0.0026, 4), 1.5) * 85 * mmask;
    }
    h += this.detailN.noise(x * 0.06, z * 0.06) * 0.35;
    return h;
  }

  moisture(x, z) {
    return clamp(0.5 + 0.5 * this.fbm(this.moistN, x * 0.0028, z * 0.0028, 3) * 1.6, 0, 1);
  }

  biome(x, z, h) {
    const v = this.varN.noise(x * 0.02, z * 0.02);
    if (h < WATER_LEVEL - 0.3) return BIOME.OCEAN;
    const m = this.moisture(x, z);
    if (h < 1.6 + v * 0.6) return m > 0.62 ? BIOME.WETLAND : BIOME.BEACH;
    if (h > 64 + v * 5) return BIOME.SNOW;
    if (h > 50 + v * 5) return BIOME.ROCK;
    if (h > 34 + v * 4) return BIOME.ALPINE;
    if (h < 5 && m > 0.6) return BIOME.WETLAND;
    if (m > 0.56) return h > 20 ? BIOME.CONIFER : BIOME.FOREST;
    if (m < 0.4) return BIOME.MEADOW;
    return BIOME.GRASSLAND;
  }

  // Find a pleasant starting point near the origin.
  findSpawn() {
    for (let r = 0; r < 600; r += 8) {
      const steps = Math.max(1, Math.floor(r / 4));
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const h = this.height(x, z);
        if (h < 3 || h > 22) continue;
        const slope = Math.abs(this.height(x + 2, z) - h) + Math.abs(this.height(x, z + 2) - h);
        if (slope > 1.2) continue;
        const b = this.biome(x, z, h);
        if (b === BIOME.GRASSLAND || b === BIOME.MEADOW || b === BIOME.FOREST) return { x, z };
      }
    }
    return { x: 0, z: 0 };
  }
}
