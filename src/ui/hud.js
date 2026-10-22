// On-screen HUD: compass, clock, minimap, interaction prompt, toasts.
import { CHUNK_SIZE } from '../world/terrain.js';
import { BIOME_NAMES } from '../world/worldgen.js';
import { wrapAngle } from '../core/noise.js';

const $ = (id) => document.getElementById(id);
const DIRS = [
  ['N', 0],
  ['NE', 45],
  ['E', 90],
  ['SE', 135],
  ['S', 180],
  ['SW', 225],
  ['W', 270],
  ['NW', 315],
];
const COMPASS_SPAN = Math.PI * 0.9; // radians visible across the strip

export class Hud {
  constructor() {
    this.root = $('hud');
    this.strip = $('compass-strip');
    this.compassTarget = $('compass-target');
    this.clock = $('clock');
    this.count = $('journal-count');
    this.biome = $('biome-name');
    this.prompt = $('prompt');
    this.promptText = $('prompt-text');
    this.ring = $('prompt-ring-fill');
    this.stamina = $('stamina');
    this.staminaFill = $('stamina-fill');
    this.badges = $('badges');
    this.toasts = $('toasts');
    this.minimap = $('minimap');
    this.mctx = this.minimap.getContext('2d');
    this.senseReadout = $('sense-readout');
    this.marks = DIRS.map(([label]) => {
      const el = document.createElement('span');
      el.className = label.length === 1 ? 'major' : 'minor';
      el.textContent = label;
      this.strip.appendChild(el);
      return el;
    });
    this.ticks = [];
    for (let d = 0; d < 360; d += 15) {
      if (d % 45 === 0) continue;
      const el = document.createElement('i');
      this.strip.appendChild(el);
      this.ticks.push([el, d]);
    }
    this.lastBiome = -1;
    this.lastBadges = '';
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
  }

  // bearing: clockwise radians from north
  updateCompass(bearing, target) {
    const w = this.strip.clientWidth || 360;
    const place = (el, deg) => {
      const rel = wrapAngle((deg * Math.PI) / 180 - bearing);
      const x = (rel / COMPASS_SPAN) * w + w / 2;
      const visible = Math.abs(rel) < COMPASS_SPAN / 2;
      el.style.transform = `translateX(${x}px) translateX(-50%)`;
      el.style.opacity = visible ? 1 - Math.abs(rel) / (COMPASS_SPAN / 2) * 0.6 : 0;
    };
    this.marks.forEach((el, i) => place(el, DIRS[i][1]));
    this.ticks.forEach(([el, d]) => place(el, d));
    if (target) {
      this.compassTarget.classList.remove('hidden');
      const rel = wrapAngle(target.bearing - bearing);
      const clamped = Math.max(-COMPASS_SPAN / 2, Math.min(COMPASS_SPAN / 2, rel));
      const x = (clamped / COMPASS_SPAN) * w + w / 2;
      this.compassTarget.style.transform = `translateX(${x}px) translateX(-50%)`;
      this.compassTarget.classList.toggle('edge', clamped !== rel);
      this.senseReadout.classList.remove('hidden');
      this.senseReadout.textContent = `${target.label} · ${Math.round(target.dist)} m`;
    } else {
      this.compassTarget.classList.add('hidden');
      this.senseReadout.classList.add('hidden');
    }
  }

  updateStatus(t, found, total, biome) {
    const mins = Math.floor(t * 24 * 60);
    const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
    const mm = String(Math.floor(mins % 60 / 10) * 10).padStart(2, '0');
    const icon = t > 0.27 && t < 0.73 ? '☀' : '☾';
    this.clock.textContent = `${icon} ${hh}:${mm}`;
    this.count.textContent = `${found} / ${total}`;
    if (biome !== this.lastBiome) {
      this.lastBiome = biome;
      this.biome.textContent = BIOME_NAMES[biome] ?? '';
    }
  }

  setPrompt(text, progress = null) {
    if (!text) {
      this.prompt.classList.add('hidden');
      return;
    }
    this.prompt.classList.remove('hidden');
    if (this.promptText.textContent !== text) this.promptText.textContent = text;
    const circ = 2 * Math.PI * 15;
    this.prompt.classList.toggle('has-progress', progress !== null);
    this.ring.style.strokeDashoffset = String(circ * (1 - (progress ?? 0)));
  }

  setStamina(v, exhausted) {
    this.stamina.classList.toggle('hidden', v > 0.995);
    this.stamina.classList.toggle('exhausted', exhausted);
    this.staminaFill.style.transform = `scaleX(${v})`;
  }

  setBadges(list) {
    const key = list.join('|');
    if (key === this.lastBadges) return;
    this.lastBadges = key;
    this.badges.innerHTML = '';
    for (const b of list) {
      const el = document.createElement('span');
      el.textContent = b;
      this.badges.appendChild(el);
    }
  }

  toast(title, body, kind = 'info', ms = 6000) {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    const h = document.createElement('strong');
    h.textContent = title;
    el.appendChild(h);
    if (body) {
      const p = document.createElement('p');
      p.innerHTML = body;
      el.appendChild(p);
    }
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 400);
    }, ms);
  }

  drawMinimap(terrain, player, bearing, target, show) {
    this.minimap.classList.toggle('hidden', !show);
    if (!show) return;
    const ctx = this.mctx;
    const W = this.minimap.width;
    const range = 120; // metres from centre to edge
    const scale = W / 2 / range;
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath();
    ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#3a7fb0';
    ctx.fillRect(0, 0, W, W);
    ctx.imageSmoothingEnabled = true;
    for (const c of terrain.chunks.values()) {
      const x = (c.ox - player.pos.x) * scale + W / 2;
      const y = (c.oz - player.pos.z) * scale + W / 2;
      const s = CHUNK_SIZE * scale;
      if (x > W || y > W || x + s < 0 || y + s < 0) continue;
      ctx.drawImage(c.map, x, y, s + 0.6, s + 0.6);
    }
    if (target) {
      const tx = (target.x - player.pos.x) * scale + W / 2;
      const ty = (target.z - player.pos.z) * scale + W / 2;
      const r = W / 2 - 8;
      const dx = tx - W / 2;
      const dy = ty - W / 2;
      const l = Math.hypot(dx, dy);
      const k = l > r ? r / l : 1;
      ctx.fillStyle = '#ffd66b';
      ctx.strokeStyle = '#3b2a10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2 + dx * k, W / 2 + dy * k, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Player arrow (north is up)
    ctx.translate(W / 2, W / 2);
    ctx.rotate(bearing);
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = '#1d1a14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(30, 24, 16, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', W / 2, 15);
  }
}
