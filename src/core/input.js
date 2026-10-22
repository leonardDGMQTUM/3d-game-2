// Keyboard, mouse (pointer lock) and touch input, unified.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.locked = false;
    this.lockedAt = 0;
    this.enabled = false;
    this.touch = { x: 0, z: 0, sprint: false, interact: false };
    this.onKey = null;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
      if (this.enabled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      this.onKey?.(e.code, e);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('mousemove', (e) => {
      // Pointer lock when available; otherwise drag with the left button.
      if (!this.locked && !(this.enabled && !this.isTouch && e.buttons & 1 && e.target === canvas)) return;
      // Browsers sometimes report a huge jump right after locking; ignore it.
      if (performance.now() - this.lockedAt < 120) return;
      const clampD = (v) => Math.max(-120, Math.min(120, v));
      this.mouseDX += clampD(e.movementX);
      this.mouseDY += clampD(e.movementY);
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.lockedAt = performance.now();
      this.onLockChange?.(this.locked);
    });
  }

  requestLock() {
    if (this.isTouch) return;
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch {
      /* not available */
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  down(code) {
    return this.keys.has(code);
  }

  pressed(code) {
    return this.justPressed.has(code);
  }

  axisX() {
    let v = this.touch.x;
    if (this.down('KeyD') || this.down('ArrowRight')) v += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) v -= 1;
    return Math.max(-1, Math.min(1, v));
  }

  axisZ() {
    let v = this.touch.z;
    if (this.down('KeyW') || this.down('ArrowUp')) v += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) v -= 1;
    return Math.max(-1, Math.min(1, v));
  }

  sprint() {
    return this.down('ShiftLeft') || this.down('ShiftRight') || this.touch.sprint;
  }

  interact() {
    return this.down('KeyE') || this.touch.interact;
  }

  consumeMouse() {
    const d = [this.mouseDX, this.mouseDY];
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  endFrame() {
    this.justPressed.clear();
  }

  // Simple virtual joystick (left) + drag-to-look (right) for touch screens.
  setupTouch(root) {
    this.isTouch = true;
    const stick = root.querySelector('#touch-stick');
    const knob = root.querySelector('#touch-knob');
    let stickId = null;
    let lookId = null;
    let sx = 0;
    let sy = 0;
    let lx = 0;
    let ly = 0;
    const R = 50;

    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      if (e.clientX < window.innerWidth * 0.45 && stickId === null) {
        stickId = e.pointerId;
        sx = e.clientX;
        sy = e.clientY;
        stick.style.left = `${sx - 60}px`;
        stick.style.top = `${sy - 60}px`;
        stick.classList.add('active');
      } else if (lookId === null) {
        lookId = e.pointerId;
        lx = e.clientX;
        ly = e.clientY;
      }
    });
    root.addEventListener('pointermove', (e) => {
      if (e.pointerId === stickId) {
        let dx = e.clientX - sx;
        let dy = e.clientY - sy;
        const l = Math.hypot(dx, dy);
        if (l > R) {
          dx = (dx / l) * R;
          dy = (dy / l) * R;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.touch.x = dx / R;
        this.touch.z = -dy / R;
      } else if (e.pointerId === lookId) {
        this.mouseDX += (e.clientX - lx) * 2.2;
        this.mouseDY += (e.clientY - ly) * 2.2;
        lx = e.clientX;
        ly = e.clientY;
      }
    });
    const end = (e) => {
      if (e.pointerId === stickId) {
        stickId = null;
        this.touch.x = 0;
        this.touch.z = 0;
        knob.style.transform = '';
        stick.classList.remove('active');
      }
      if (e.pointerId === lookId) lookId = null;
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);

    const hold = (id, prop) => {
      const b = root.querySelector(id);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.touch[prop] = true;
      });
      const off = () => (this.touch[prop] = false);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
    };
    hold('#touch-interact', 'interact');
    const tap = (id, code) => {
      root.querySelector(id).addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.justPressed.add(code);
        this.onKey?.(code, e);
      });
    };
    tap('#touch-jump', 'Space');
    tap('#touch-sneak', 'KeyC');
    tap('#touch-sense', 'KeyQ');
    tap('#touch-journal', 'KeyJ');
    tap('#touch-pause', 'Escape');
    root.querySelector('#touch-sprint').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touch.sprint = !this.touch.sprint;
      e.currentTarget.classList.toggle('on', this.touch.sprint);
    });
  }
}
