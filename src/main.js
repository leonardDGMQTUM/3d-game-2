// Materia Medica — entry point. Wires the world, player, UI and game loop.
import * as THREE from 'three';
import { WorldGen, BIOME, WATER_LEVEL } from './world/worldgen.js';
import { ChunkManager, CHUNK_SIZE } from './world/terrain.js';
import { Vegetation } from './world/vegetation.js';
import { Sky } from './world/sky.js';
import { Water } from './world/water.js';
import { Clouds, Fireflies } from './world/effects.js';
import { Player } from './entities/player.js';
import { Creatures } from './entities/creatures.js';
import { Specimens } from './game/specimens.js';
import { SPECIES, SPECIES_BY_ID, PLANTS } from './game/species-data.js';
import { Input } from './core/input.js';
import { CameraRig } from './core/camera.js';
import { Ambience } from './core/audio.js';
import { loadSettings, saveSettings, loadSave, writeSave } from './core/settings.js';
import { Hud } from './ui/hud.js';
import { Journal } from './ui/journal.js';

const $ = (id) => document.getElementById(id);
const FIREFLY_BIOMES = [BIOME.GRASSLAND, BIOME.MEADOW, BIOME.FOREST, BIOME.WETLAND];

class Game {
  constructor() {
    this.canvas = $('game');
    this.settings = loadSettings();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xb8daf2, 60, 200);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1500);
    this.rig = new CameraRig(this.camera);

    this.sky = new Sky(this.scene);
    this.water = new Water(this.scene, 400);
    this.clouds = new Clouds(this.scene);
    this.fireflies = new Fireflies(this.scene);
    this.vegetation = new Vegetation();
    this.specimens = new Specimens();
    this.creatures = new Creatures(this.scene);
    this.player = new Player(this.scene);
    this.lantern = new THREE.PointLight(0xffc27a, 0, 16, 2);
    this.scene.add(this.lantern);

    this.input = new Input(this.canvas);
    this.audio = new Ambience();
    this.hud = new Hud();
    this.journal = new Journal(() => this.closeJournal());

    this.mode = 'title';
    this.returnTo = 'title';
    this.discovered = new Set();
    this.time = 0.34;
    this.target = null;
    this.senseCooldown = 0;
    this.obs = { key: null, progress: 0 };
    this.saveTimer = 0;
    this.pausedAt = 0;
    this.prevTouchInteract = false;
    this.titleAngle = 0;
    this.lastFrame = performance.now();

    this.save = loadSave();
    const urlSeed = Number(new URLSearchParams(location.search).get('seed'));
    this.urlSeed = Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed >>> 0 : null;
    this.createWorld(this.save?.seed ?? this.urlSeed ?? this.randomSeed());

    this.bindUI();
    this.applySettings();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    if (window.matchMedia?.('(pointer: coarse)').matches) {
      document.body.classList.add('touch');
      this.input.setupTouch($('touch-ui'));
    }
    this.renderer.setAnimationLoop(() => this.frame());
  }

  randomSeed() {
    return (Math.random() * 2 ** 31) >>> 0 || 1;
  }

  createWorld(seed) {
    if (this.terrain) this.terrain.clear();
    this.creatures.clear();
    this.seed = seed;
    this.world = new WorldGen(seed);
    this.specimens.forced = [];
    this.terrain = new ChunkManager(this.scene, this.world, this.vegetation, this.specimens);
    this.terrain.setRadius(this.settings.renderDistance);
    this.spawn = this.world.findSpawn();
    this.placeFirstFind();
    $('seed-label').textContent = String(seed);
    const h = this.world.height(this.spawn.x, this.spawn.z);
    this.player.place(this.spawn.x, this.spawn.z, (x, z) => this.world.height(x, z));
    this.titleFocus = new THREE.Vector3(this.spawn.x, Math.max(h, 0), this.spawn.z);
  }

  // Put one easy specimen a short walk north of the spawn point.
  placeFirstFind() {
    for (let r = 10; r < 60; r += 4) {
      for (let a = -0.8; a <= 0.8; a += 0.4) {
        const x = this.spawn.x + Math.sin(a) * r;
        const z = this.spawn.z - Math.cos(a) * r;
        const h = this.world.height(x, z);
        const b = this.world.biome(x, z, h);
        const sp = PLANTS.find((s) => s.biomes.includes(b) && !s.tree && (!s.minHeight || h >= s.minHeight));
        if (sp && h > 0.8) {
          this.specimens.addForced(x, z, sp.id);
          return;
        }
      }
    }
    this.specimens.addForced(this.spawn.x, this.spawn.z - 12, 'foxglove');
  }

  // ---------- UI wiring ----------
  bindUI() {
    const show = (id, on) => $(id).classList.toggle('hidden', !on);
    $('btn-continue').classList.toggle('hidden', !this.save);
    $('btn-continue').addEventListener('click', () => this.startGame(true));
    $('btn-new').addEventListener('click', () => {
      if (this.save && !confirm('Start a new expedition? Your current journal will be replaced.')) return;
      this.startGame(false);
    });
    $('btn-title-settings').addEventListener('click', () => this.openPanel('settings', 'title'));
    $('btn-title-help').addEventListener('click', () => this.openPanel('help', 'title'));
    $('btn-resume').addEventListener('click', () => this.resume());
    $('btn-pause-journal').addEventListener('click', () => this.openJournal());
    $('btn-pause-settings').addEventListener('click', () => this.openPanel('settings', 'paused'));
    $('btn-pause-help').addEventListener('click', () => this.openPanel('help', 'paused'));
    $('btn-pause-title').addEventListener('click', () => {
      this.writeSave();
      show('pause-menu', false);
      this.toTitle();
    });
    for (const id of ['settings', 'help']) {
      $(id).querySelector('[data-close]').addEventListener('click', () => this.closePanel(id));
    }

    this.canvas.addEventListener('click', () => {
      if (this.mode === 'play' && !this.input.locked) this.input.requestLock();
    });

    this.input.onLockChange = (locked) => {
      if (!locked && this.mode === 'play' && !this.input.isTouch) this.pause();
    };
    this.input.onKey = (code) => this.onKey(code);

    // Settings form
    const form = $('settings-form');
    const fmt = {
      sensitivity: (v) => `${(+v).toFixed(1)}×`,
      renderDistance: (v) => ['', '', 'Near', 'Mid', 'Far', 'Max'][v],
      resolution: (v) => `${Math.round(v * 100)}%`,
      dayLength: (v) => `${v}`,
      volume: (v) => `${Math.round(v * 100)}%`,
    };
    for (const el of form.elements) {
      if (!el.name) continue;
      const key = el.name;
      if (el.type === 'checkbox') el.checked = !!this.settings[key];
      else el.value = this.settings[key];
      const out = el.parentElement.querySelector('output');
      if (out) out.textContent = fmt[key](el.value);
      el.addEventListener('input', () => {
        this.settings[key] = el.type === 'checkbox' ? el.checked : Number(el.value);
        if (out) out.textContent = fmt[key](el.value);
        this.applySettings();
        saveSettings(this.settings);
      });
    }
  }

  applySettings() {
    const s = this.settings;
    this.terrain.setRadius(s.renderDistance);
    const far = (s.renderDistance + 0.4) * CHUNK_SIZE;
    this.scene.fog.far = far;
    this.scene.fog.near = far * 0.3;
    this.water.setSize(far * 2.6);
    this.sky.setShadows(s.shadows);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * s.resolution);
    this.audio.setVolume(s.volume);
    document.body.classList.toggle('reduced-motion', s.reducedMotion);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onKey(code) {
    const m = this.mode;
    if (code === 'Escape') {
      if (m === 'play') this.pause();
      else if (m === 'paused' && performance.now() - this.pausedAt > 300) this.resume();
      else if (m === 'journal') this.closeJournal();
      else if (m === 'settings' || m === 'help') this.closePanel(m);
    } else if (code === 'KeyJ') {
      if (m === 'play' || m === 'paused') this.openJournal();
      else if (m === 'journal') this.closeJournal();
    } else if (code === 'KeyH') {
      if (m === 'play') this.openPanel('help', 'play');
      else if (m === 'help') this.closePanel('help');
    } else if (code === 'KeyM' && m === 'play') {
      this.settings.minimap = !this.settings.minimap;
      saveSettings(this.settings);
      const cb = $('settings-form').elements.minimap;
      if (cb) cb.checked = this.settings.minimap;
    }
  }

  setMode(mode) {
    this.mode = mode;
    const playing = mode === 'play';
    this.hud.show(mode !== 'title' && mode !== 'loading');
    $('touch-ui').classList.toggle('hidden', !(playing && this.input.isTouch));
    this.input.enabled = playing;
  }

  startGame(continuing) {
    this.audio.start();
    if (continuing && this.save) {
      if (this.save.seed !== this.seed) this.createWorld(this.save.seed);
      this.discovered = new Set(this.save.discovered || []);
      this.time = this.save.time ?? 0.34;
      const p = this.save.pos;
      if (p) this.player.place(p.x, p.z, (x, z) => this.world.height(x, z));
      this.rig.yaw = this.save.yaw ?? 0;
    } else {
      const fresh = !this.save && !this.started;
      if (!fresh) this.createWorld(this.urlSeed ?? this.randomSeed());
      this.discovered = new Set();
      this.time = 0.34;
      this.rig.yaw = 0;
    }
    this.started = true;
    $('title-screen').classList.add('hidden');
    this.setMode('loading');
    $('loading').classList.remove('hidden');
    this.input.requestLock();
  }

  finishLoading() {
    $('loading').classList.add('hidden');
    this.player.place(this.player.pos.x, this.player.pos.z, this.terrain.heightAt);
    this.rig.snap(this.player.pos);
    this.setMode('play');
    this.writeSave();
    if (this.discovered.size === 0) {
      this.hud.toast(
        'Your expedition begins',
        this.input.isTouch
          ? 'Something glows just to the north. Walk over and tap <b>E</b> to sample it.'
          : 'Something glows just to the north. Walk over and press <kbd>E</kbd> to sample it. Press <kbd>H</kbd> any time for controls.',
        'info',
        9000,
      );
    } else {
      this.hud.toast('Welcome back', `${this.discovered.size} of ${SPECIES.length} species catalogued so far.`, 'info', 5000);
    }
  }

  pause() {
    this.setMode('paused');
    this.pausedAt = performance.now();
    $('pause-menu').classList.remove('hidden');
    this.input.exitLock();
    this.writeSave();
  }

  resume() {
    $('pause-menu').classList.add('hidden');
    this.setMode('play');
    this.input.requestLock();
  }

  toTitle() {
    this.save = loadSave();
    $('btn-continue').classList.toggle('hidden', !this.save);
    $('title-screen').classList.remove('hidden');
    this.setMode('title');
    this.input.exitLock();
  }

  openJournal(focusId) {
    this.returnTo = this.mode === 'paused' ? 'paused' : 'play';
    $('pause-menu').classList.add('hidden');
    this.setMode('journal');
    this.input.exitLock();
    this.journal.open(this.discovered, focusId);
  }

  closeJournal() {
    this.journal.close();
    if (this.returnTo === 'paused') {
      this.setMode('paused');
      $('pause-menu').classList.remove('hidden');
    } else {
      this.resume();
    }
  }

  openPanel(id, from) {
    this.returnTo = from;
    if (from === 'paused') $('pause-menu').classList.add('hidden');
    if (from === 'title') $('title-screen').classList.add('hidden');
    $(id).classList.remove('hidden');
    if (from === 'play') this.input.exitLock();
    this.setMode(id);
    if (from === 'title') this.hud.show(false);
  }

  closePanel(id) {
    $(id).classList.add('hidden');
    if (this.returnTo === 'title') {
      $('title-screen').classList.remove('hidden');
      this.setMode('title');
    } else if (this.returnTo === 'paused') {
      $('pause-menu').classList.remove('hidden');
      this.setMode('paused');
    } else {
      this.resume();
    }
  }

  writeSave() {
    if (!this.started) return;
    writeSave({
      seed: this.seed,
      discovered: [...this.discovered],
      pos: { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z },
      yaw: this.rig.yaw,
      time: this.time,
    });
  }

  discover(species) {
    if (this.discovered.has(species.id)) return;
    this.discovered.add(species.id);
    this.audio.chime();
    // First sentence (don't split on abbreviations like "D. lanata").
    const teaser = species.medicine.split(/(?<=[a-z0-9)"]\.)\s/)[0];
    this.hud.toast(
      `New entry: ${species.name}`,
      `<i>${species.sci}</i> — ${teaser} <br><kbd>J</kbd> to read the full notes.`,
      'discovery',
      9000,
    );
    if (this.target && this.target.id === species.id) this.target = null;
    if (this.discovered.size === SPECIES.length) {
      setTimeout(
        () =>
          this.hud.toast(
            'Materia Medica complete!',
            'Every species is catalogued. The world goes on forever — keep exploring as long as you like.',
            'discovery',
            12000,
          ),
        1500,
      );
    }
    this.writeSave();
  }

  // ---------- Per-frame ----------
  frame() {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    const s = this.settings;

    if (this.mode === 'title') this.updateTitle(dt);
    else if (this.mode === 'loading') this.updateLoading();
    else if (this.mode === 'play') this.updatePlay(dt);

    const focus = this.mode === 'title' ? this.titleFocus : this.player.pos;
    const simDt = this.mode === 'play' || this.mode === 'title' ? dt : 0;
    const skyState = this.sky.update(this.time, this.camera, focus);
    this.scene.fog.color.copy(this.sky.fogColor);
    this.renderer.setClearColor(this.sky.fogColor);
    this.water.update(simDt, focus, this.sky);
    this.clouds.update(simDt, focus, skyState.night);
    this.vegetation.update(simDt, s.reducedMotion);
    this.specimens.update(simDt, s.glow ? this.discovered : ALL_IDS, s.reducedMotion);
    this.lantern.intensity = this.mode === 'title' ? 0 : skyState.night * 26;
    this.lantern.position.set(this.player.pos.x, this.player.pos.y + 2.4, this.player.pos.z);

    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  updateTitle(dt) {
    this.terrain.update(this.titleFocus.x, this.titleFocus.z, 8);
    this.titleAngle += dt * (this.settings.reducedMotion ? 0.015 : 0.04);
    const r = 46;
    const f = this.titleFocus;
    this.camera.position.set(f.x + Math.cos(this.titleAngle) * r, 0, f.z + Math.sin(this.titleAngle) * r);
    const ground = this.terrain.heightAt(this.camera.position.x, this.camera.position.z);
    this.camera.position.y = Math.max(ground, f.y, WATER_LEVEL) + 16;
    this.camera.lookAt(f.x, f.y + 4, f.z);
    this.player.model.visible = false;
  }

  updateLoading() {
    const remaining = this.terrain.update(this.player.pos.x, this.player.pos.z, 30);
    const total = this.terrain.chunks.size + remaining;
    $('loading-fill').style.width = `${Math.round((this.terrain.chunks.size / Math.max(1, total)) * 100)}%`;
    this.rig.snap(this.player.pos);
    this.rig.update(0.016, this.player.pos, this.terrain.heightAt, true);
    if (remaining === 0) this.finishLoading();
  }

  updatePlay(dt) {
    const s = this.settings;
    const p = this.player;
    p.model.visible = true;
    this.time = (this.time + dt / (s.dayLength * 60)) % 1;

    const [mx, my] = this.input.consumeMouse();
    this.rig.look(mx, my, s.sensitivity, s.invertY);
    this.rig.zoom(this.input.consumeWheel());

    this.terrain.update(p.pos.x, p.pos.z, 5);
    p.update(dt, this.input, this.rig.yaw, this.terrain);
    this.rig.update(dt, p.pos, this.terrain.heightAt, s.reducedMotion, this.terrain.collidersNear(p.pos.x, p.pos.z, 18));
    this.creatures.update(dt, p, this.terrain, this.world, this.sky);

    const ground = this.terrain.heightAt(p.pos.x, p.pos.z);
    const biome = this.world.biome(p.pos.x, p.pos.z, ground);
    const night = this.sky.state.night;
    const ffActive = night > 0.55 && FIREFLY_BIOMES.includes(biome) && !p.swimming ? 1 : 0;
    this.fireflies.update(dt, p.pos, this.terrain.heightAt, ffActive);

    this.updateInteraction(dt);
    this.updateSense(dt);

    // HUD
    const bearing = -this.rig.yaw;
    this.hud.updateCompass(bearing, this.target ? this.targetInfo() : null);
    this.hud.updateStatus(this.time, this.discovered.size, SPECIES.length, biome);
    this.hud.setStamina(p.stamina, p.exhausted);
    const badges = [];
    if (p.sneaking) badges.push('Sneaking');
    if (p.swimming) badges.push('Swimming');
    this.hud.setBadges(badges);
    this.hud.drawMinimap(this.terrain, p, bearing, this.target, s.minimap);

    this.audio.update(dt, { night, day: this.sky.state.day, altitude: p.pos.y, swimming: p.swimming });

    this.saveTimer += dt;
    if (this.saveTimer > 10) {
      this.saveTimer = 0;
      this.writeSave();
    }
  }

  updateInteraction(dt) {
    const p = this.player;
    const touchE = this.input.touch.interact;
    const tapped = this.input.pressed('KeyE') || (touchE && !this.prevTouchInteract);
    this.prevTouchInteract = touchE;
    const holding = this.input.interact();

    // 1. Plants & fungi within reach
    const item = this.specimens.nearest(p.pos.x, p.pos.z);
    if (item) {
      const sp = item.species;
      const known = this.discovered.has(sp.id);
      this.hud.setPrompt(known ? `${sp.name} — E: read notes` : `Unrecorded ${sp.kind === 'fungus' ? 'fungus' : 'plant'} — E: take a sample`);
      if (tapped) {
        if (known) this.openJournal(sp.id);
        else this.discover(sp);
      }
      this.obs.progress = 0;
      return;
    }

    // 2. Animals in view (or fireflies all around at night)
    let obsKey = null;
    let species = null;
    const seen = this.creatures.observable(this.camera, p, this.discovered);
    if (seen) {
      obsKey = seen.creature;
      species = seen.species;
    } else if (this.fireflies.strength > 0.5) {
      obsKey = 'fireflies';
      species = SPECIES_BY_ID.firefly;
    }
    if (!species) {
      this.hud.setPrompt(null);
      this.obs.progress = 0;
      return;
    }
    const known = this.discovered.has(species.id);
    if (known) {
      this.hud.setPrompt(`${species.name} — E: read notes`);
      if (tapped) this.openJournal(species.id);
      return;
    }
    if (this.obs.key !== obsKey) {
      this.obs.key = obsKey;
      this.obs.progress = 0;
    }
    if (holding) this.obs.progress += dt / 1.6;
    else this.obs.progress = Math.max(0, this.obs.progress - dt);
    const label = species.id === 'firefly' ? 'Lights in the dark' : 'Unrecorded animal';
    this.hud.setPrompt(holding ? `Observing… stay calm` : `${label} — hold E to observe`, this.obs.progress);
    if (this.obs.progress >= 1) {
      this.obs.progress = 0;
      this.discover(species);
    }
  }

  updateSense(dt) {
    this.senseCooldown -= dt;
    const p = this.player;
    if (this.input.pressed('KeyQ') && this.senseCooldown <= 0) {
      this.senseCooldown = 2;
      const a = this.specimens.nearestUndiscovered(p.pos.x, p.pos.z, this.discovered);
      const b = this.creatures.nearestUndiscovered(p.pos.x, p.pos.z, this.discovered);
      let pick = null;
      if (a && (!b || a.dist < b.dist * 1.2)) {
        pick = { id: a.item.species.id, ref: a.item, label: 'Unrecorded specimen' };
      } else if (b) {
        pick = { id: b.creature.id, ref: b.creature, label: 'Unrecorded animal' };
      }
      if (pick) {
        this.target = { ...pick, until: 60 };
        this.hud.toast('You sense something…', 'Follow the ◆ on your compass and minimap.', 'info', 4000);
      } else if (!this.discovered.has('firefly') && this.sky.state.night > 0.5) {
        this.hud.toast('The night is alive', 'Try standing in grassland or woodland and looking around you.', 'info', 6000);
      } else {
        const missing = SPECIES.filter((s) => !this.discovered.has(s.id)).slice(0, 3);
        const tip = missing.length ? `Try: ${missing.map((s) => s.habitat.toLowerCase()).join(' · ')}.` : 'You have found everything!';
        this.hud.toast('Nothing new nearby', tip, 'info', 6000);
      }
    }
    if (this.target) {
      this.target.until -= dt;
      const r = this.target.ref;
      this.target.x = r.x ?? r.pos.x;
      this.target.z = r.z ?? r.pos.z;
      const d = Math.hypot(this.target.x - p.pos.x, this.target.z - p.pos.z);
      this.target.dist = d;
      if (this.target.until <= 0 || this.discovered.has(this.target.id) || d > 400) this.target = null;
    }
  }

  targetInfo() {
    const t = this.target;
    const dx = t.x - this.player.pos.x;
    const dz = t.z - this.player.pos.z;
    return { bearing: Math.atan2(dx, -dz), dist: t.dist ?? 0, label: t.label };
  }
}

const ALL_IDS = new Set(SPECIES.map((s) => s.id));

window.game = new Game();
