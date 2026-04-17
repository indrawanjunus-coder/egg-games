// ================= Mr. Egg engine (pixel art) =================
// Pixel art rendering: semua shape align ke grid 3px, palet terbatas.
// Physics tetap pakai koordinat dunia 1200x560.

const PX = 3; // ukuran satu "pixel art pixel" dalam koordinat dunia

const PHY = {
  gravity: 0.55,
  jumpVy: -8.8,
  moveSpeed: 3.2,
  maxFallSafe: 10.5,
  groundFriction: 0.78,
  airDrag: 0.94,
};

const STATE = {
  IDLE:'idle', WALK:'walk', JUMP:'jump', FALL:'fall',
  FLOAT:'float', BROKEN:'broken', LOST:'lost', WON:'won'
};

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function sp(v) { return Math.round(v / PX) * PX; }

// -------------- Palette (klasik monokrom 5 shade) --------------
const C = {
  K: "#0f0f0f",  // black
  D: "#4a4a4a",  // dark gray
  M: "#8c8c8c",  // mid gray
  L: "#c8c8c8",  // light gray
  W: "#f7f7f7",  // off-white
};

const PAL = {
  k: C.K,  // outline
  w: C.W,  // body/white
  d: C.D,  // dark shadow
  m: C.M,  // mid gray
  l: C.L,  // light gray
  b: C.K,  // eye/mouth same as outline
};

// -------------- Pixel helpers --------------
function pxRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  const sx = sp(x), sy = sp(y);
  const sw = Math.max(PX, Math.round(w / PX) * PX);
  const sh = Math.max(PX, Math.round(h / PX) * PX);
  ctx.fillRect(sx, sy, sw, sh);
}

function drawSprite(ctx, sprite, x, y, facing = 1, palette = PAL) {
  const sx = sp(x), sy = sp(y);
  const rows = sprite.length;
  const cols = sprite[0].length;
  for (let r = 0; r < rows; r++) {
    const line = sprite[r];
    for (let c = 0; c < cols; c++) {
      const ch = line[c];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      const drawCol = facing < 0 ? cols - 1 - c : c;
      ctx.fillStyle = color;
      ctx.fillRect(sx + drawCol * PX, sy + r * PX, PX, PX);
    }
  }
}

// Pixel-art "circle" from discrete blocks (stair-stepped).
function pxCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy += PX) {
    for (let dx = -r; dx <= r; dx += PX) {
      if (dx * dx + dy * dy <= r2) ctx.fillRect(sp(cx + dx), sp(cy + dy), PX, PX);
    }
  }
}

// Pixel-art triangle (spike) pointing UP
function pxSpikeUp(ctx, cx, baseY, w, h, colorFill, colorShade) {
  const rows = Math.max(1, Math.floor(h / PX));
  for (let r = 0; r < rows; r++) {
    const y = baseY - (r + 1) * PX;
    const half = Math.max(PX, Math.round((w / 2) * (rows - r) / rows / PX) * PX);
    pxRect(ctx, cx - half, y, half * 2, PX, colorFill);
    // shading: rightmost column darker
    if (half >= PX * 2) pxRect(ctx, cx + half - PX, y, PX, PX, colorShade);
  }
}

// Pixel-art triangle (spike) pointing DOWN
function pxSpikeDown(ctx, cx, topY, w, h, colorFill, colorShade) {
  const rows = Math.max(1, Math.floor(h / PX));
  for (let r = 0; r < rows; r++) {
    const y = topY + r * PX;
    const half = Math.max(PX, Math.round((w / 2) * (rows - r) / rows / PX) * PX);
    pxRect(ctx, cx - half, y, half * 2, PX, colorFill);
    if (half >= PX * 2) pxRect(ctx, cx + half - PX, y, PX, PX, colorShade);
  }
}

// -------------- Sprites (huruf = kunci palette) --------------
const EGG_SPRITE = {
  idle: [
    "..kkkk..",
    ".kwwwwk.",
    "kwwwwwwk",
    "kwwwwwwk",
    "kwkwwkwk",  // eyes: kolom 2 & 5
    "kwwwwwwk",
    "kwwwwwwk",
    "kwkkkkwk",  // smile top
    "kwwkkwwk",  // smile bottom
    "kwwwwwwk",
    ".kwwwwk.",
    "..kkkk..",
  ],
  jump: [
    "..kkkk..",
    ".kwwwwk.",
    "kwwwwwwk",
    "kwkwwkwk",
    "kwkwwkwk",  // mata agak lebar
    "kwwwwwwk",
    "kwwwwwwk",
    "kwwkkwwk",  // mulut mengerucut
    "kwwkkwwk",
    "kwwwwwwk",
    ".kwwwwk.",
    "..kkkk..",
  ],
  fall: [
    "..kkkk..",
    ".kwwwwk.",
    "kwwwwwwk",
    "kwkwwkwk",
    "kkwwwwkk",  // mata membesar (cemas)
    "kwwwwwwk",
    "kwkkkkwk",
    "kwkwwkwk",  // mulut "O"
    "kwkkkkwk",
    "kwwwwwwk",
    ".kwwwwk.",
    "..kkkk..",
  ],
  float: [
    "..kkkk..",
    ".kwwwwk.",
    "kwwwwwwk",
    "kwwwwwwk",
    "kwkwwkwk",
    "kwwwwwwk",
    "kwkkkkwk",
    "kwkwwkwk",  // senyum lebar
    "kwkkkkwk",
    "kwwwwwwk",
    ".kwwwwk.",
    "..kkkk..",
  ],
  won: [
    "..kkkk..",
    ".kwwwwk.",
    "kwwwwwwk",
    "kwwkkwwk",  // mata menyipit senang ^_^
    "kwkwwkwk",
    "kwwwwwwk",
    "kwkkkkwk",  // senyum
    "kwkwwkwk",
    "kwkkkkwk",
    "kwwwwwwk",
    ".kwwwwk.",
    "..kkkk..",
  ],
};

// -------------- Sound (Web Audio synth) --------------
class SoundFX {
  constructor() { this.muted = false; this.ctx = null; }
  _ensure() {
    if (this.ctx) return this.ctx;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { this.muted = true; }
    return this.ctx;
  }
  unlock() { const c = this._ensure(); if (c && c.state === "suspended") c.resume(); }
  tone(f, dur, type = "sine", vol = 0.15, slide = null) {
    if (this.muted) return;
    const ctx = this._ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  noise(dur, vol = 0.1, filterFreq = 2000) {
    if (this.muted) return;
    const ctx = this._ensure(); if (!ctx) return;
    const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass"; filt.frequency.value = filterFreq;
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(filt).connect(g).connect(ctx.destination);
    src.start();
  }
  jump()   { this.tone(380, 0.15, "square", 0.08, 720); }
  land()   { this.tone(180, 0.07, "sine", 0.1, 90); this.noise(0.06, 0.05, 1800); }
  splash() { this.noise(0.3, 0.1, 3500); this.tone(520, 0.1, "sine", 0.06, 260); }
  crack()  { this.tone(500, 0.3, "sawtooth", 0.12, 100); this.noise(0.25, 0.12, 5000); }
  win()    { [0, 100, 200].forEach((d, i) => setTimeout(() => this.tone([523, 659, 784][i], 0.18, "triangle", 0.12), d)); }
  warn()   { this.tone(900, 0.07, "square", 0.06); }
  thud()   { this.tone(120, 0.22, "sawtooth", 0.14, 45); this.noise(0.15, 0.08, 800); }
}

// -------------- Particles (blocky, pixel style) --------------
class Particle {
  constructor(x, y, vx, vy, life, color, shape, size, gravity = 0.25) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.shape = shape; this.size = size;
    this.gravity = gravity;
    this.grow = 0;
  }
  update(dt) {
    this.x += this.vx; this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.99;
    this.size += this.grow;
    this.life -= dt;
  }
  draw(ctx) {
    const a = clamp(this.life / this.maxLife, 0, 1);
    if (a < 0.15) ctx.globalAlpha = a * 6;  // hanya fade di ujung
    else ctx.globalAlpha = 1;
    const s = Math.max(PX, Math.round(this.size / PX) * PX);
    if (this.shape === "block") {
      pxRect(ctx, this.x - s/2, this.y - s/2, s, s, this.color);
    } else if (this.shape === "shell") {
      // pecahan cangkang: putih dengan outline hitam
      pxRect(ctx, this.x - PX, this.y - PX, PX*2, PX, "#f7f7f7");
      pxRect(ctx, this.x - PX, this.y, PX, PX, "#f7f7f7");
      pxRect(ctx, this.x - PX*2, this.y - PX*2, PX, PX, "#0f0f0f");
      pxRect(ctx, this.x + PX, this.y + PX, PX, PX, "#0f0f0f");
    } else if (this.shape === "droplet") {
      pxRect(ctx, this.x, this.y, PX, PX*2, this.color);
      pxRect(ctx, this.x - PX, this.y, PX, PX, this.color);
      pxRect(ctx, this.x + PX, this.y, PX, PX, this.color);
    } else if (this.shape === "ring") {
      const r = Math.round(this.size / PX) * PX;
      ctx.fillStyle = this.color;
      // top & bottom lines
      ctx.fillRect(sp(this.x - r), sp(this.y - r), r*2, PX);
      ctx.fillRect(sp(this.x - r), sp(this.y + r - PX), r*2, PX);
      // left & right lines
      ctx.fillRect(sp(this.x - r), sp(this.y - r), PX, r*2);
      ctx.fillRect(sp(this.x + r - PX), sp(this.y - r), PX, r*2);
    } else if (this.shape === "leaf") {
      pxRect(ctx, this.x - PX*2, this.y, PX*4, PX, this.color);
      pxRect(ctx, this.x - PX, this.y - PX, PX*2, PX, this.color);
      pxRect(ctx, this.x - PX, this.y + PX, PX*2, PX, this.color);
    } else if (this.shape === "star") {
      // Plus sign
      pxRect(ctx, this.x - PX*2, this.y, PX*4, PX, this.color);
      pxRect(ctx, this.x, this.y - PX*2, PX, PX*4, this.color);
    } else if (this.shape === "yolk") {
      // Dalam monokrom: abu-abu isi telur
      pxRect(ctx, this.x - PX, this.y - PX, PX*2, PX*2, "#c8c8c8");
      pxRect(ctx, this.x - PX*2, this.y, PX, PX, "#8c8c8c");
      pxRect(ctx, this.x + PX, this.y, PX, PX, "#8c8c8c");
      pxRect(ctx, this.x, this.y - PX*2, PX, PX, "#8c8c8c");
      pxRect(ctx, this.x, this.y + PX, PX, PX, "#4a4a4a");
    }
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor() { this.list = []; }
  emit(count, x, y, opts) {
    for (let i = 0; i < count; i++) {
      const ang = opts.angle !== undefined
        ? opts.angle + (Math.random() - 0.5) * (opts.spread || 0.4)
        : Math.random() * Math.PI * 2;
      const speed = (opts.speedMin || 1) + Math.random() * ((opts.speedMax || 3) - (opts.speedMin || 1));
      const p = new Particle(
        x + (Math.random() - 0.5) * (opts.jitter || 0),
        y + (Math.random() - 0.5) * (opts.jitter || 0),
        Math.cos(ang) * speed, Math.sin(ang) * speed,
        opts.life || 500,
        opts.color || "#cccccc",
        opts.shape || "block",
        (opts.sizeMin || PX) + Math.random() * ((opts.sizeMax || PX*2) - (opts.sizeMin || PX)),
        opts.gravity !== undefined ? opts.gravity : 0.25
      );
      if (opts.grow) p.grow = opts.grow;
      this.list.push(p);
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.update(dt);
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }
  draw(ctx) { for (const p of this.list) p.draw(ctx); }
  clear() { this.list = []; }
}

// ============================================================================
// computeWindOffset(timeMs, bridge) -> number (px, geser horizontal dari anchor)
// ============================================================================
// Fungsi ini menentukan "rasa" angin di level 7. Hasil offset bergeser horizontal
// dari posisi anchor bridge, di-clamp natural antara -amplitude..+amplitude.
//
// SILAKAN MODIFIKASI fungsi ini untuk feel yang Anda inginkan!
//
// Beberapa pilihan algoritma (pilih satu, atau kombinasi):
//   A. Sine murni (smooth, predictable): A * sin(2π * t/period + phase)
//   B. Gust (tiupan kencang berkala): sine biasa + spike sesekali
//   C. Multi-frequency (turbulent): jumlahkan beberapa sine dgn freq beda
//   D. Random walk (noise organik): drift acak yang slowly varying
//
// Trade-off:
//   - Predictable (A) = mudah dilompati, kurang menantang
//   - Turbulent (C/D) = sulit timing, lebih realistis tapi frustrasi
//
// Defaults sekarang: sine simple. Ganti sesuai design Anda.
function computeWindOffset(timeMs, bridge) {
  const t = (timeMs + bridge.phase) / bridge.period * 2 * Math.PI;
  return bridge.amplitude * Math.sin(t);
}

// -------------- Bridge (jembatan gantung yang bergerak akibat angin) --------------
class Bridge {
  constructor(cfg) {
    this.anchorX = cfg.anchorX;       // titik tengah ayunan (x sumbu)
    this.anchorY = cfg.anchorY;       // y posisi
    this.w = cfg.w;
    this.h = cfg.h || 16;
    this.amplitude = cfg.amplitude || 30;  // max swing kiri/kanan
    this.period = cfg.period || 2200;       // periode satu siklus dalam ms
    this.phase = cfg.phase || 0;            // offset fase per bridge
    this.x = cfg.anchorX;
    this.y = cfg.anchorY;
  }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

// -------------- Box (pushable crate) --------------
class Box {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.dragging = false;
  }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

// -------------- Mattress (kasur) --------------
// Bisa standalone (di level def: mattresses: [{x,y,w,h}]) atau parented ke
// bridge (level def: bridgeMattresses: true). Saat parented, posisi mengikuti
// bridge yang bergerak ditiup angin.
// Egg yang mendarat di mattress TIDAK pecah meski jatuh tinggi.
class Mattress {
  constructor(cfg) {
    this.x = cfg.x || 0;
    this.y = cfg.y || 0;
    this.w = cfg.w || 100;
    this.h = cfg.h || 10;
    this.parentBridge = cfg.parentBridge || null;
  }
  rect() {
    if (this.parentBridge) {
      const b = this.parentBridge;
      // Mattress menempel di atas bridge (y = bridge.y - mattress.h)
      return { x: b.x, y: b.y - this.h, w: b.w, h: this.h };
    }
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

// -------------- BalloonRod (level 11) --------------
// Batang horizontal yang dibawa 3 balon. Mekanik berdasar jumlah balon aktif:
//   3 balon -> rod naik perlahan (vy negatif)
//   2 balon -> rod hover (vy decay ke 0)
//   1 balon -> rod swing kiri-kanan + perlahan tenggelam
//   0 balon -> free fall (gravity)
// Player klik balon untuk pop (1 click = 1 balon).
class BalloonRod {
  constructor(cfg) {
    this.x = cfg.rodX;          // top-left x rod
    this.y = cfg.rodY;          // top-left y rod
    this.w = cfg.rodW || 110;
    this.h = cfg.rodH || 14;
    this.anchorX = this.x;      // posisi natural (untuk swing oscillation)
    this.anchorY = this.y;
    this.vy = 0;
    this.angle = 0;             // visual tilt (cosmetic)
    this.swingPhase = 0;        // untuk 1-balloon swing
    this.balloons = (cfg.balloons || [
      { offsetX: 12 }, { offsetX: 48 }, { offsetX: 84 }
    ]).map(b => ({ offsetX: b.offsetX, popped: false, popAnim: 0 }));
    this.dead = false;          // true saat hilang (ke atas atau ke bawah jurang)
    this.balloonHeight = 40;    // jarak balon di atas rod
    this.balloonRadius = 14;    // radius klik balon
  }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  activeCount() {
    let c = 0;
    for (const b of this.balloons) if (!b.popped) c++;
    return c;
  }
  activeBalloons() { return this.balloons.filter(b => !b.popped); }
}

// -------------- Egg --------------
class Egg {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.w = 24; this.h = 33;  // cocok dengan sprite 8x11 * PX=3
    this.state = STATE.IDLE;
    this.onGround = false;
    this.facing = 1;
    this.inWater = false;
    this.inQuicksand = false;
    this.walkAnim = 0;
    this.squashT = 0;
  }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

// -------------- Game --------------
class Game {
  constructor(canvas, onEvent) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.onEvent = onEvent || (() => {});
    this.input = { left:false, right:false, jump:false, jumpPressed:false };
    this.paused = false;
    this.level = null;
    this.egg = null;
    this.trees = [];
    this.boxes = [];
    this.bridges = [];
    this.particles = new ParticleSystem();
    this.sound = new SoundFX();
    this.timeMs = 0;
    this.lastTs = 0;
    this.shake = 0;

    this.spawnWarnings = [];
    this.fallingSpikes = [];
    this.groundSpikes = [];
    this.fallingNails = [];
    this.shield = null;
    this.nextSpawnMs = 0;
    this.spawnerElapsed = 0;

    this.dustCooldown = 0;
    this._raf = null;

    // Mode: "home" atau "playing". Home dulu sebelum play.
    this.mode = "home";
    this.homeView = "menu";    // "menu" = PLAY only, "select" = level grid + back
    this.homeBtns = [];
    this.homeSelected = 0;
  }

  goHome() {
    this.mode = "home";
    this.homeView = "menu";   // reset ke menu utama (bukan level select)
    this.homeSelected = 0;
    this.level = null;
    this.hintVisible = 0;
    this.particles.clear();
    this.onEvent({ type: "mode", mode: "home" });
  }

  // Show hint overlay selama durationMs. Dipanggil dari main.js setelah rewarded ad.
  showHint(durationMs) {
    this.hintVisible = this.timeMs + (durationMs || 5000);
  }

  loadLevel(def) {
    this.mode = "playing";
    this.level = {
      ...def,
      platforms: def.platforms.map(p => ({ ...p })),
      hazards:   (def.hazards || []).map(h => ({ ...h })),
      // Clone doorOut supaya posisi tidak persist antar restart (penting utk teleport door)
      doorOut: { ...def.doorOut, beingDragged: false }
    };
    this.egg = new Egg(def.start.x, def.start.y);
    this.trees = (def.trees || []).map(t => ({
      ...t, state: "standing", angle: 0, elapsed: 0, logAdded: false
    }));
    this.boxes = (def.boxes || []).map(b => new Box(b.x, b.y, b.w || 36, b.h || 36));
    this.bridges = (def.bridges || []).map(b => new Bridge(b));
    // Mattresses (kasur) - standalone + auto-attach ke bridges kalau bridgeMattresses
    this.mattresses = (def.mattresses || []).map(m => new Mattress(m));
    if (def.bridgeMattresses) {
      for (const br of this.bridges) {
        this.mattresses.push(new Mattress({ parentBridge: br, h: 10 }));
      }
    }
    // Balloon rods (level 11)
    this.balloonRods = (def.balloonRods || []).map(r => new BalloonRod(r));
    // Pipa shelter (level 10): tidak punya collision, hanya safe-zone check
    this.pipes = (def.pipes || []).map(p => ({ ...p }));
    // Giant foot + stone rain state (level 10)
    this.giantFoot = null;
    this.stones = [];           // batu yang sedang jatuh
    this.stoneWarnings = [];    // segitiga warning sebelum batu spawn
    this.nextStoneMs = 0;
    this.timeMs = 0;
    this.shake = 0;
    this.hintVisible = 0;       // reset hint overlay - tidak carry-over antar level
    this.particles.clear();
    this.spawnWarnings = [];
    this.fallingSpikes = [];
    this.groundSpikes = [];
    this.fallingNails = [];     // level 13: hujan paku tanpa warning (nail-rain)
    this.spawnerElapsed = 0;
    this.nextSpawnMs = def.spawner ? (def.spawner.firstDelayMs || 1200) : 0;
    // Shield drawing (level 13+): reset canvas tiap load level
    if (def.shieldDrawing && window.ShieldCanvas) {
      this.shield = new window.ShieldCanvas();
    } else {
      this.shield = null;
    }
    // Hot-stones spawner pakai field nextStoneMs (sama seperti stone-rain di L10).
    // Init dengan firstDelayMs supaya tidak fire frame 1.
    if (def.spawner && def.spawner.type === "hot-stones") {
      this.nextStoneMs = def.spawner.firstDelayMs || 2000;
    }
    // Fork-throw state (level 8)
    this.forks = [];
    this.cannibals = (def.spawner && def.spawner.type === "fork-throw")
      ? (def.spawner.cannibals || []).map(c => ({...c, throwT: (def.spawner.firstDelayMs || 1500), throwAnim: 0}))
      : [];
    this.onEvent({ type: "mode", mode: "playing" });
  }

  start() {
    cancelAnimationFrame(this._raf);
    const tick = (ts) => {
      const dt = Math.min(32, this.lastTs ? ts - this.lastTs : 16);
      this.lastTs = ts;
      if (!this.paused) this.update(dt);
      this.render();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }
  stop() { cancelAnimationFrame(this._raf); }

  update(dt) {
    this.timeMs += dt;
    this.particles.update(dt);

    if (this.mode === "home") return; // home mode: tidak ada fisika

    const egg = this.egg;
    const terminal = (egg.state === STATE.BROKEN || egg.state === STATE.LOST || egg.state === STATE.WON);

    if (!terminal) {
      // Update bridge (angin) dulu supaya posisi sudah final saat collision check
      this.updateBridges(dt);
      // Box settle (gravity, friction) supaya egg interact dengan box yang stabil
      this.updateBoxes();
      // Balloon rods (level 11) - update posisi sebelum collision check
      this.updateBalloonRods(dt);

      if (this.input.left)  { egg.vx = -PHY.moveSpeed; egg.facing = -1; }
      else if (this.input.right) { egg.vx = PHY.moveSpeed; egg.facing = 1; }
      else egg.vx *= egg.onGround ? PHY.groundFriction : PHY.airDrag;

      // Jump dari tanah biasa, atau dari quicksand kalau tidak sedang naik (vy≥0).
      // vy≥0 gate cegah multi-jump exploit: pemain tap jump berulang di sand
      // akan infinite jump tanpa gate. Hanya boleh jump kalau diam atau jatuh.
      const canJump = egg.onGround || (egg.inQuicksand && egg.vy >= 0);
      if (this.input.jumpPressed && canJump && !egg.inWater) {
        egg.vy = PHY.jumpVy;
        egg.onGround = false;
        this.sound.jump();
        this.particles.emit(5, egg.x + egg.w/2, egg.y + egg.h,
          { life: 280, color: "#ccc", shape: "block",
            sizeMin: PX, sizeMax: PX*2,
            speedMin: 1, speedMax: 2.2, angle: Math.PI/2, spread: 1.2, gravity: 0.1 });
      }
      this.input.jumpPressed = false;

      if (egg.inWater) {
        // Air: kalau pemain gerak kiri/kanan, telur naik ke permukaan (buoyant).
        // Kalau diam, perlahan tenggelam - harus aktif berenang supaya tetap di atas.
        const moving = this.input.left || this.input.right;
        egg.vy = moving ? -0.6 : 0.3;
        egg.vx *= 0.88;
      } else if (egg.inQuicksand) {
        // Pasir hisap: selalu menyedot ke bawah perlahan, regardless of moving.
        // Jumping (vy negatif) tetap diizinkan dengan gravity normal supaya
        // pemain bisa lompat keluar dari pasir.
        if (egg.vy > 0) {
          egg.vy = 0.3;             // cap downward sink rate (slow continuous)
        } else {
          egg.vy += PHY.gravity;    // jumping/apex - normal gravity
        }
        egg.vx *= 0.92;             // sedikit drag horizontal di pasir
      } else {
        egg.vy += PHY.gravity;
      }

      const prevVy = egg.vy;
      this._prevVy = prevVy; // dipakai di updateSpawner (ground spike check)
      egg.x += egg.vx;
      this.resolveHorizontal();
      egg.y += egg.vy;
      const landed = this.resolveVertical();

      if (landed) {
        // Bridge punya bantalan (level 7) - tidak pecah meski jatuh tinggi.
        const onBridge = this.bridges.some(br =>
          egg.y + egg.h >= br.y - 2 && egg.y + egg.h <= br.y + 2 &&
          egg.x + egg.w > br.x && egg.x < br.x + br.w
        );
        // Mattress (kasur) - landing safe rule: telur jatuh di kasur tidak pecah.
        const onMattress = (this.mattresses || []).some(m => {
          const r = m.rect();
          return egg.y + egg.h >= r.y - 2 && egg.y + egg.h <= r.y + 2 &&
                 egg.x + egg.w > r.x && egg.x < r.x + r.w;
        });
        // noFallDamage flag (level 7 default): seluruh level disable fall damage.
        const safe = onBridge || onMattress || this.level.noFallDamage;
        if (prevVy > PHY.maxFallSafe && !egg.inWater && !safe) {
          egg.state = STATE.BROKEN;
          this.shake = 14;
          this.sound.crack();
          this.emitShellBurst();
          this.onEvent({ type: "broken", reason: "jatuh dari tinggi" });
        } else if (prevVy > 3) {
          this.sound.land();
          this.particles.emit(4, egg.x + egg.w/2, egg.y + egg.h,
            { life: 240, color: "#c0c0c0", shape: "block",
              sizeMin: PX, sizeMax: PX*2,
              speedMin: 1, speedMax: 2.5, angle: 0, spread: Math.PI, gravity: 0.05 });
          egg.squashT = 160;
        }
      }

      this.checkHazards();
      this.updateTrees(dt);
      this.checkTreeCollision();
      this.updateSpawner(dt);
      this.updateTeleportDoor(dt);

      // Jika ada hazard yang memecahkan telur frame ini, JANGAN lanjut update
      // visual state (yang akan menimpa BROKEN). Ini fix bug "telur pecah masih jalan".
      if (egg.state === STATE.BROKEN) {
        egg.vx = 0; egg.vy = 0;
        return;
      }

      const b = this.level.bounds;
      if (egg.y > b.y + b.h + 60) {
        egg.state = STATE.LOST;
        this.sound.splash();
        this.onEvent({ type: "lost", reason: "jatuh ke lubang" });
        return;
      }
      if (rectsOverlap(egg.rect(), this.level.doorOut)) {
        egg.state = STATE.WON;
        this.sound.win();
        this.emitSparkleBurst();
        this.onEvent({ type: "won" });
        return;
      }

      if (egg.inWater) egg.state = STATE.FLOAT;
      else if (!egg.onGround && egg.vy < 0) egg.state = STATE.JUMP;
      else if (!egg.onGround && egg.vy > 2) egg.state = STATE.FALL;
      else if (Math.abs(egg.vx) > 0.2) egg.state = STATE.WALK;
      else egg.state = STATE.IDLE;

      if (egg.state === STATE.WALK) {
        egg.walkAnim += dt * 0.012;
        this.dustCooldown -= dt;
        if (this.dustCooldown <= 0) {
          this.particles.emit(1, egg.x + egg.w/2 - egg.facing * 6, egg.y + egg.h - 1,
            { life: 220, color: "#d6d6d6", shape: "block",
              sizeMin: PX, sizeMax: PX*2,
              speedMin: 0.4, speedMax: 1.2, angle: -Math.PI/2, spread: 0.6, gravity: 0.02 });
          this.dustCooldown = 140;
        }
      }
      if (egg.squashT > 0) egg.squashT -= dt;
    } else {
      this.updateTrees(dt);
    }

    if (this.shake > 0) this.shake -= dt * 0.05;
  }

  resolveHorizontal() {
    const egg = this.egg;
    const STEP_UP = 12;
    for (const p of this.level.platforms) {
      const r = egg.rect();
      if (rectsOverlap(r, p)) {
        const penetration = (egg.y + egg.h) - p.y;
        if (penetration > 0 && penetration <= STEP_UP && egg.vy >= 0) {
          egg.y = p.y - egg.h; egg.vy = 0; egg.onGround = true;
          continue;
        }
        if (egg.vx > 0) egg.x = p.x - egg.w;
        else if (egg.vx < 0) egg.x = p.x + p.w;
        egg.vx = 0;
      }
    }
    // Bridge: act as platform (block side, step up jika tepi tipis)
    for (const br of this.bridges) {
      const r = egg.rect();
      if (rectsOverlap(r, br.rect())) {
        const penetration = (egg.y + egg.h) - br.y;
        if (penetration > 0 && penetration <= STEP_UP && egg.vy >= 0) {
          egg.y = br.y - egg.h; egg.vy = 0; egg.onGround = true;
          continue;
        }
        if (egg.vx > 0) egg.x = br.x - egg.w;
        else if (egg.vx < 0) egg.x = br.x + br.w;
        egg.vx = 0;
      }
    }
    // Mattress: sama dengan bridge (step-up + side block)
    if (this.mattresses) {
      for (const m of this.mattresses) {
        const r = m.rect();
        if (rectsOverlap(egg.rect(), r)) {
          const penetration = (egg.y + egg.h) - r.y;
          if (penetration > 0 && penetration <= STEP_UP && egg.vy >= 0) {
            egg.y = r.y - egg.h; egg.vy = 0; egg.onGround = true;
            continue;
          }
          if (egg.vx > 0) egg.x = r.x - egg.w;
          else if (egg.vx < 0) egg.x = r.x + r.w;
          egg.vx = 0;
        }
      }
    }
    // Box: dorong horizontal kalau telur tabrakan, atau step-up kalau box pendek
    for (const box of this.boxes) {
      const r = egg.rect();
      if (!rectsOverlap(r, box.rect())) continue;
      const penetration = (egg.y + egg.h) - box.y;
      if (penetration > 0 && penetration <= STEP_UP && egg.vy >= 0) {
        egg.y = box.y - egg.h; egg.vy = 0; egg.onGround = true;
        continue;
      }
      // Push box - coba pindahkan box sesuai vx telur
      const dx = egg.vx;
      if (dx > 0) {
        box.x = egg.x + egg.w;
        // Box vs platform check
        for (const p of this.level.platforms) {
          if (rectsOverlap(box.rect(), p)) { box.x = p.x - box.w; break; }
        }
        // Box vs box lain
        for (const other of this.boxes) {
          if (other === box) continue;
          if (rectsOverlap(box.rect(), other.rect())) { box.x = other.x - box.w; break; }
        }
        if (box.x + box.w > this.level.bounds.x + this.level.bounds.w) {
          box.x = this.level.bounds.x + this.level.bounds.w - box.w;
        }
        // Kalau box gak bisa jalan, push egg balik
        if (rectsOverlap(egg.rect(), box.rect())) { egg.x = box.x - egg.w; egg.vx = 0; }
      } else if (dx < 0) {
        box.x = egg.x - box.w;
        for (const p of this.level.platforms) {
          if (rectsOverlap(box.rect(), p)) { box.x = p.x + p.w; break; }
        }
        for (const other of this.boxes) {
          if (other === box) continue;
          if (rectsOverlap(box.rect(), other.rect())) { box.x = other.x + other.w; break; }
        }
        if (box.x < this.level.bounds.x) box.x = this.level.bounds.x;
        if (rectsOverlap(egg.rect(), box.rect())) { egg.x = box.x + box.w; egg.vx = 0; }
      } else {
        // Telur diam tapi overlap (jatuh ke samping box) - dorong keluar terdekat
        if (egg.x + egg.w/2 < box.x + box.w/2) egg.x = box.x - egg.w;
        else egg.x = box.x + box.w;
      }
    }
    // BalloonRod horizontal: act as platform (block side, step up jika tepi tipis)
    if (this.balloonRods) {
      for (const rod of this.balloonRods) {
        if (rod.dead) continue;
        const r = egg.rect();
        if (rectsOverlap(r, rod.rect())) {
          const penetration = (egg.y + egg.h) - rod.y;
          if (penetration > 0 && penetration <= STEP_UP && egg.vy >= 0) {
            egg.y = rod.y - egg.h; egg.vy = 0; egg.onGround = true;
            continue;
          }
          if (egg.vx > 0) egg.x = rod.x - egg.w;
          else if (egg.vx < 0) egg.x = rod.x + rod.w;
          egg.vx = 0;
        }
      }
    }
    const b = this.level.bounds;
    if (egg.x < b.x) egg.x = b.x;
    if (egg.x + egg.w > b.x + b.w) egg.x = b.x + b.w - egg.w;
  }

  resolveVertical() {
    const egg = this.egg;
    let landed = false;
    egg.onGround = false;
    for (const p of this.level.platforms) {
      const r = egg.rect();
      if (rectsOverlap(r, p)) {
        if (egg.vy > 0) {
          egg.y = p.y - egg.h;
          if (egg.vy > 0.1) landed = true;
          egg.vy = 0; egg.onGround = true;
        } else if (egg.vy < 0) {
          egg.y = p.y + p.h; egg.vy = 0;
        }
      }
    }
    // Bridge: telur bisa berdiri di atasnya
    for (const br of this.bridges) {
      if (rectsOverlap(egg.rect(), br.rect())) {
        if (egg.vy > 0) {
          egg.y = br.y - egg.h;
          if (egg.vy > 0.1) landed = true;
          egg.vy = 0; egg.onGround = true;
        } else if (egg.vy < 0) {
          egg.y = br.y + br.h; egg.vy = 0;
        }
      }
    }
    // Mattress: telur bisa berdiri di atasnya
    if (this.mattresses) {
      for (const m of this.mattresses) {
        const r = m.rect();
        if (rectsOverlap(egg.rect(), r)) {
          if (egg.vy > 0) {
            egg.y = r.y - egg.h;
            if (egg.vy > 0.1) landed = true;
            egg.vy = 0; egg.onGround = true;
          } else if (egg.vy < 0) {
            egg.y = r.y + r.h; egg.vy = 0;
          }
        }
      }
    }
    // Egg bisa berdiri di atas box (atau kepalanya kena box dari bawah)
    for (const box of this.boxes) {
      if (rectsOverlap(egg.rect(), box.rect())) {
        if (egg.vy > 0) {
          egg.y = box.y - egg.h;
          if (egg.vy > 0.1) landed = true;
          egg.vy = 0; egg.onGround = true;
        } else if (egg.vy < 0) {
          egg.y = box.y + box.h; egg.vy = 0;
        }
      }
    }
    // BalloonRod sebagai platform (level 11)
    if (this.balloonRods) {
      for (const rod of this.balloonRods) {
        if (rod.dead) continue;
        if (rectsOverlap(egg.rect(), rod.rect())) {
          if (egg.vy > 0) {
            egg.y = rod.y - egg.h;
            if (egg.vy > 0.1) landed = true;
            egg.vy = 0; egg.onGround = true;
          } else if (egg.vy < 0) {
            egg.y = rod.y + rod.h; egg.vy = 0;
          }
        }
      }
    }
    return landed;
  }

  checkHazards() {
    const egg = this.egg;
    if (egg.state === STATE.BROKEN) return;
    const wasInWater = egg.inWater;
    egg.inWater = false;
    egg.inQuicksand = false;
    for (const h of (this.level.hazards || [])) {
      if (h.type === "quicksand") {
        // Pasir hisap: selalu menyedot perlahan (physics di update()).
        // Capai dasar = LOST. Player bisa lompat keluar (jump dari sand
        // diizinkan via egg.inQuicksand check di jump logic).
        if (rectsOverlap(egg.rect(), h)) {
          egg.inQuicksand = true;
          const bottom = h.y + h.h;
          if (egg.y + egg.h >= bottom) {
            egg.state = STATE.LOST;
            this.sound.splash();
            this.emitShellBurst();
            this.onEvent({ type: "lost", reason: "tertelan pasir hisap" });
            return;
          }
        }
      } else if (h.type === "water") {
        if (rectsOverlap(egg.rect(), h)) {
          egg.inWater = true;
          const surface = h.y;
          const bottom = h.y + h.h;
          // Splash cue saat baru masuk air
          if (!wasInWater && egg.vy > 2.5) {
            this.sound.splash();
            this.particles.emit(10, egg.x + egg.w/2, surface,
              { life: 420, color: "#c8c8c8", shape: "droplet",
                sizeMin: PX, sizeMax: PX*2, speedMin: 1.5, speedMax: 4,
                angle: -Math.PI/2, spread: 1.4, gravity: 0.3 });
            this.particles.emit(1, egg.x + egg.w/2, surface,
              { life: 350, color: "#c8c8c8", shape: "ring",
                sizeMin: PX*3, sizeMax: PX*3, speedMin: 0, speedMax: 0, gravity: 0, grow: PX*0.22 });
          }
          // Surface clamp: saat pemain gerak DAN telur sudah capai permukaan,
          // tahan di surface (supaya tidak overshoot ke atas air).
          // Kalau pemain diam, JANGAN clamp - biarkan tenggelam.
          const moving = this.input.left || this.input.right;
          if (moving && egg.y + egg.h <= surface + 2) {
            egg.y = surface - egg.h + 0.5;
            if (egg.vy < 0) egg.vy = 0;
          }
          // Kalau sudah nyampai dasar air, telur tenggelam (LOST)
          if (egg.y + egg.h >= bottom - 1) {
            egg.state = STATE.LOST;
            this.sound.splash();
            this.emitShellBurst();
            this.onEvent({ type: "lost", reason: "tenggelam ke dasar" });
            return;
          }
        }
      } else if (h.type === "spike") {
        if (rectsOverlap(egg.rect(), h)) {
          egg.state = STATE.BROKEN;
          this.sound.crack();
          this.emitShellBurst();
          this.onEvent({ type:"broken", reason:"kena paku" });
        }
      }
    }
  }

  updateTrees(dt) {
    for (const t of this.trees) {
      if (t.state === "standing") {
        if (rectsOverlap(this.egg.rect(), t.triggerZone)) {
          t.state = "warning"; t.elapsed = 0;
          // Pilih arah jatuh secara acak saat trigger (kiri / kanan)
          // Kalau level def kasih fallDirection eksplisit (selain 0/null), pakai itu.
          if (!t.fixedDirection) {
            t.fallDirection = Math.random() < 0.5 ? -1 : 1;
          }
          this.sound.warn();
          this.onEvent({ type:"tree-warning" });
        }
      } else if (t.state === "warning") {
        t.elapsed += dt;
        if (t.elapsed >= t.warningMs) { t.state = "falling"; t.elapsed = 0; }
      } else if (t.state === "falling") {
        t.elapsed += dt;
        const p = Math.min(1, t.elapsed / t.fallDurationMs);
        t.angle = (Math.PI / 2) * (p * p) * t.fallDirection;
        if (p >= 1) {
          t.state = "fallen";
          t.sinkElapsed = 0;
          this.shake = 12;
          this.sound.thud();
          this.particles.emit(12, t.baseX + Math.sin(t.angle)*t.height*0.4,
            t.baseY - Math.cos(t.angle)*t.height*0.4,
            { life: 1200, color: "#4caf50", shape: "leaf",
              sizeMin: PX, sizeMax: PX*2, speedMin: 1, speedMax: 3,
              spread: Math.PI*2, gravity: 0.18 });
          if (!t.logAdded) {
            const box = this.treeSegmentRect(t);
            box.kind = "log";
            this.level.platforms.push(box);
            t.logAdded = true;
          }
        }
      } else if (t.state === "fallen") {
        // Tree perlahan masuk ke tanah (sink) - hilang setelah ~2 detik
        t.sinkElapsed = (t.sinkElapsed || 0) + dt;
        const sinkDur = 2000;
        if (t.sinkElapsed >= sinkDur) {
          t.state = "sunk";
          // Hapus log dari platforms supaya tidak jadi penghalang permanen
          if (t.logAdded) {
            this.level.platforms = this.level.platforms.filter(
              p => !(p.kind === "log" && p === t._logRef)
            );
            // Fallback: hapus by reference
            const idx = this.level.platforms.findIndex(p => p.kind === "log" && Math.abs(p.x - (t.baseX - t.trunkWidth/2)) < 30);
            if (idx >= 0) this.level.platforms.splice(idx, 1);
            t.logAdded = false;
          }
        } else {
          // Animasi sink: shift y ke bawah perlahan
          t.sinkY = (t.sinkElapsed / sinkDur) * (t.trunkWidth + 6);
          // Update log platform y juga supaya egg "ikut tenggelam" kalau di atas
          if (t.logAdded) {
            for (const p of this.level.platforms) {
              if (p.kind === "log" && Math.abs(p.x - (t.baseX - t.trunkWidth/2)) < 30) {
                if (p._origY === undefined) p._origY = p.y;
                p.y = p._origY + t.sinkY;
              }
            }
          }
        }
      }
    }
  }

  treeSegmentRect(t) {
    const ang = t.angle;
    const topX = t.baseX + Math.sin(ang) * t.height;
    const topY = t.baseY - Math.cos(ang) * t.height;
    return {
      x: Math.min(t.baseX, topX) - t.trunkWidth/2,
      y: Math.min(t.baseY, topY) - t.trunkWidth/2,
      w: Math.abs(topX - t.baseX) + t.trunkWidth,
      h: Math.abs(topY - t.baseY) + t.trunkWidth
    };
  }

  checkTreeCollision() {
    if (this.egg.state === STATE.BROKEN) return;
    for (const t of this.trees) {
      if (t.state !== "falling") continue;
      if (Math.abs(t.angle) < 0.2) continue;
      const box = this.treeSegmentRect(t);
      if (rectsOverlap(this.egg.rect(), box)) {
        this.egg.state = STATE.BROKEN;
        this.egg.vx = 0; this.egg.vy = 0;
        this.sound.crack();
        this.emitShellBurst();
        this.onEvent({ type:"broken", reason:"tertimpa pohon" });
        return;
      }
    }
  }

  // -------------- Dynamic spawner (spike rain / fork throw) --------------
  updateSpawner(dt) {
    const sp = this.level.spawner;
    if (!sp) return;
    if (sp.type === "fork-throw") return this.updateForkThrow(dt);
    if (sp.type === "giant-foot") return this.updateGiantFoot(dt);
    if (sp.type === "hot-stones") return this.updateHotStones(dt);
    if (sp.type === "nail-rain") return this.updateNailRain(dt);

    this.spawnerElapsed += dt;
    const ramp = Math.min(2.0, 1 + this.spawnerElapsed / 15000);

    this.nextSpawnMs -= dt * ramp;
    if (this.nextSpawnMs <= 0) {
      const x = sp.zoneX + Math.random() * sp.zoneW;
      this.spawnWarnings.push({ x, y: sp.ceilingY, countdown: sp.warningMs, life: sp.warningMs });
      this.sound.warn();
      this.nextSpawnMs = sp.minIntervalMs + Math.random() * (sp.maxIntervalMs - sp.minIntervalMs);
    }

    for (const w of this.spawnWarnings) w.countdown -= dt;
    const toSpawn = this.spawnWarnings.filter(w => w.countdown <= 0);
    for (const w of toSpawn) {
      this.fallingSpikes.push({ x: w.x, y: w.y, w: 18, h: 27, vy: 0 });
    }
    this.spawnWarnings = this.spawnWarnings.filter(w => w.countdown > 0);

    for (const s of this.fallingSpikes) { s.vy += 0.55; s.y += s.vy; }

    for (let i = this.fallingSpikes.length - 1; i >= 0; i--) {
      const s = this.fallingSpikes[i];
      const sRect = { x: s.x - s.w/2, y: s.y, w: s.w, h: s.h };
      let landed = false;
      for (const p of this.level.platforms) {
        if (sRect.x + sRect.w >= p.x && sRect.x <= p.x + p.w &&
            sRect.y + sRect.h >= p.y && sRect.y < p.y + p.h) {
          this.groundSpikes.push({
            x: sRect.x, y: p.y - s.h, w: s.w, h: s.h,
            expireAt: this.spawnerElapsed + 2800
          });
          this.sound.thud();
          this.particles.emit(5, s.x, p.y,
            { life: 240, color: "#bbb", shape: "block",
              sizeMin: PX, sizeMax: PX*2, speedMin: 1, speedMax: 2.5,
              angle: -Math.PI/2, spread: Math.PI, gravity: 0.1 });
          this.shake = Math.max(this.shake, 6);
          landed = true; break;
        }
      }
      if (landed) this.fallingSpikes.splice(i, 1);
    }

    this.groundSpikes = this.groundSpikes.filter(g => g.expireAt > this.spawnerElapsed);

    if (this.egg.state === STATE.BROKEN) return;
    const eggR = this.egg.rect();

    // Falling spike (dari atas): langsung pecahkan telur
    for (const s of this.fallingSpikes) {
      const sRect = { x: s.x - s.w/2, y: s.y, w: s.w, h: s.h };
      if (rectsOverlap(eggR, sRect)) {
        this.egg.state = STATE.BROKEN;
        this.sound.crack();
        this.emitShellBurst();
        this.onEvent({ type:"broken", reason:"tertimpa paku" });
        return;
      }
    }

    // Paku di tanah: AMAN saat dilewati horizontal.
    // Hanya pecah kalau telur DATANG dari atas dengan kecepatan jatuh nyata.
    // resolveVertical sudah menol-kan vy saat ini, jadi cek prevVy (kecepatan
    // jatuh sebelum snap ke tanah). Threshold 3 mengecualikan gravity normal
    // saat jalan (~0.55 per frame) tapi menangkap lompatan sungguhan.
    const prevVy = this._prevVy || 0;
    for (const g of this.groundSpikes) {
      if (!rectsOverlap(eggR, g)) continue;
      if (prevVy > 3) {
        this.egg.state = STATE.BROKEN;
        this.sound.crack();
        this.emitShellBurst();
        this.onEvent({ type:"broken", reason:"terinjak paku" });
        return;
      }
      // else: telur cuma lewat samping - aman
    }
  }

  // -------------- Bridge update (angin menggoyangkan posisi) --------------
  updateBridges(dt) {
    for (const br of this.bridges) {
      const prevX = br.x;
      const offset = computeWindOffset(this.timeMs, br);
      br.x = br.anchorX + offset;
      // Kalau egg sedang berdiri di atas bridge ini, ikut bergeser
      if (this.egg && this.egg.onGround) {
        const eggBottom = this.egg.y + this.egg.h;
        const onTop = (eggBottom <= br.y + 2 && eggBottom >= br.y - 2);
        const xOverlap = (this.egg.x + this.egg.w > br.x - (br.x - prevX)) &&
                         (this.egg.x < br.x + br.w - (br.x - prevX));
        if (onTop && xOverlap) {
          this.egg.x += (br.x - prevX);
        }
      }
    }
  }

  // -------------- Box physics (gravity, settle ke platform) --------------
  updateBoxes() {
    const arena = this.level.bounds;
    for (const box of this.boxes) {
      if (box.dragging) continue; // skip physics saat di-drag (posisi diset langsung)
      // Friction horizontal (box pelan-pelan berhenti kalau didorong terus dilepas)
      box.vx *= 0.85;
      if (Math.abs(box.vx) < 0.05) box.vx = 0;
      box.x += box.vx;
      // Box vs platform horizontal (kalau bergerak akibat momentum)
      for (const p of this.level.platforms) {
        if (rectsOverlap(box.rect(), p)) {
          if (box.vx > 0) box.x = p.x - box.w;
          else if (box.vx < 0) box.x = p.x + p.w;
          box.vx = 0;
        }
      }
      // Arena bound
      if (box.x < arena.x) { box.x = arena.x; box.vx = 0; }
      if (box.x + box.w > arena.x + arena.w) { box.x = arena.x + arena.w - box.w; box.vx = 0; }

      // Gravity vertikal
      box.vy += PHY.gravity;
      box.y += box.vy;
      box.onGround = false;
      for (const p of this.level.platforms) {
        if (rectsOverlap(box.rect(), p)) {
          if (box.vy > 0) {
            box.y = p.y - box.h; box.vy = 0; box.onGround = true;
          } else if (box.vy < 0) {
            box.y = p.y + p.h; box.vy = 0;
          }
        }
      }
      // Box bisa stack di atas box lain
      for (const other of this.boxes) {
        if (other === box) continue;
        if (rectsOverlap(box.rect(), other.rect())) {
          if (box.vy > 0) {
            box.y = other.y - box.h; box.vy = 0; box.onGround = true;
          } else if (box.vy < 0) {
            box.y = other.y + other.h; box.vy = 0;
          }
        }
      }
      // Kalau box jatuh keluar arena, clamp di bawah (anti-loss state)
      if (box.y > arena.y + arena.h - box.h) {
        box.y = arena.y + arena.h - box.h;
        box.vy = 0; box.onGround = true;
      }
    }
  }

  // -------------- BalloonRod update (level 11) --------------
  updateBalloonRods(dt) {
    if (!this.balloonRods || !this.balloonRods.length) return;
    const arena = this.level.bounds;
    for (const rod of this.balloonRods) {
      if (rod.dead) continue;
      // Snapshot posisi lama untuk carry egg
      const prevX = rod.x, prevY = rod.y;
      const count = rod.activeCount();

      if (count === 3) {
        // Naik perlahan
        rod.vy = Math.max(rod.vy - 0.02, -0.7);
        rod.angle = 0;
        rod.x = rod.anchorX;
      } else if (count === 2) {
        // Hover - decay vy ke 0
        rod.vy *= 0.9;
        if (Math.abs(rod.vy) < 0.05) rod.vy = 0;
        rod.angle *= 0.9;
        rod.x = rod.anchorX;
      } else if (count === 1) {
        // Pendulum swing + slow sink
        rod.vy = Math.min(rod.vy + 0.025, 1.2);
        rod.swingPhase += 0.04;
        // Pivot di balon yang masih ada - rod swing relatif pivot
        const active = rod.activeBalloons()[0];
        const pivotOffset = active.offsetX;       // offset dari rod kiri
        const rodCenter = rod.w / 2;
        const swingDir = Math.sign(rodCenter - pivotOffset);  // ke arah berat
        const sinkProgress = Math.min(1, (rod.y - rod.anchorY) / 200);
        const amp = (1 - sinkProgress) * 50;       // amplitude mengecil saat tenggelam
        rod.x = rod.anchorX + Math.sin(rod.swingPhase) * amp * swingDir;
        rod.angle = Math.sin(rod.swingPhase) * 0.35 * swingDir;
      } else {
        // 0 balon - free fall
        rod.vy += PHY.gravity;
      }

      rod.y += rod.vy;

      // Mati saat off-screen atas (3 balon → naik hilang) atau ke jurang bawah
      if (rod.y < arena.y - 80) rod.dead = true;
      if (rod.y > arena.y + arena.h + 80) rod.dead = true;

      // Carry egg yang berdiri di atas rod (sama pattern dgn bridge)
      if (this.egg && this.egg.onGround) {
        const eggBottom = this.egg.y + this.egg.h;
        const onTop = (eggBottom <= rod.y + 2 && eggBottom >= rod.y - 2);
        const xOverlap = (this.egg.x + this.egg.w > rod.x) && (this.egg.x < rod.x + rod.w);
        if (onTop && xOverlap) {
          this.egg.x += rod.x - prevX;
          this.egg.y += rod.y - prevY;
        }
      }

      // Decay pop animations
      for (const b of rod.balloons) {
        if (b.popAnim > 0) b.popAnim -= dt;
      }
    }
    // Hapus rod yang dead
    this.balloonRods = this.balloonRods.filter(r => !r.dead);
  }

  // Cek pointer click hit balon. Return {rod, balloon} atau null.
  hitBalloon(x, y) {
    if (!this.balloonRods) return null;
    for (const rod of this.balloonRods) {
      if (rod.dead) continue;
      const by = rod.y - rod.balloonHeight;
      for (const b of rod.balloons) {
        if (b.popped) continue;
        const bx = rod.x + b.offsetX;
        const dx = x - bx, dy = y - by;
        const r = rod.balloonRadius + 4;  // hit area sedikit lebih besar dari visual
        if (dx*dx + dy*dy <= r*r) return { rod, balloon: b };
      }
    }
    return null;
  }

  popBalloon(balloon) {
    if (!balloon || balloon.popped) return;
    balloon.popped = true;
    balloon.popAnim = 400;
    this.sound.warn();
  }

  // -------------- Teleport door (level 9) --------------
  // Kalau pintu keluar punya flag teleport=true, dia akan TELEPORT ke salah satu
  // teleportSpots saat telur mendekat (kecuali sedang di-drag oleh pemain).
  updateTeleportDoor(dt) {
    const door = this.level.doorOut;
    if (!door.teleport) return;
    if (door.beingDragged) return;
    if (!door.teleportSpots || !door.teleportSpots.length) return;

    // CRITICAL: kalau pintu sudah overlap dengan telur, jangan teleport.
    // Skenario menang: player drag pintu ke telur, release. Tanpa cek ini,
    // teleport langsung firing setelah release & player tak pernah menang.
    if (rectsOverlap(this.egg.rect(), door)) return;

    // Cooldown: setelah teleport, jangan teleport lagi minimal 400ms.
    // Mencegah jitter kalau egg nyangkut di dekat spot baru.
    door._cooldown = (door._cooldown || 0) - dt;
    if (door._cooldown > 0) return;

    // Cek jarak telur-pintu (center to center)
    const ecx = this.egg.x + this.egg.w/2;
    const ecy = this.egg.y + this.egg.h/2;
    const dcx = door.x + door.w/2;
    const dcy = door.y + door.h/2;
    const dist = Math.hypot(ecx - dcx, ecy - dcy);
    const threshold = door.teleportThreshold || 100;

    if (dist < threshold) {
      // Pilih spot yang TIDAK sama dengan posisi sekarang
      const spots = door.teleportSpots;
      let next;
      let attempts = 0;
      do {
        next = spots[Math.floor(Math.random() * spots.length)];
        attempts++;
      } while (Math.abs(next.x - door.x) < 10 && Math.abs(next.y - door.y) < 10 && attempts < 10);
      door.x = next.x;
      door.y = next.y;
      door._cooldown = 400;
      this.sound.warn();
      // Particle puff di posisi lama (visual feedback teleport)
      this.particles.emit(8, dcx, dcy, {
        life: 400, color: "#c8c8c8", shape: "block",
        sizeMin: PX, sizeMax: PX*2, speedMin: 1, speedMax: 3,
        spread: Math.PI*2, gravity: 0.05
      });
    }
  }

  // -------------- Fork throw (level 8) --------------
  // Cannibal lempar fork ke atas, fork off-screen, balik jatuh di x acak.
  updateForkThrow(dt) {
    const sp = this.level.spawner;
    this.spawnerElapsed += dt;
    if (!this.forks) this.forks = [];
    if (!this.cannibals) this.cannibals = (sp.cannibals || []).map(c => ({...c, throwT: 0}));

    // Setiap cannibal lempar fork berkala (interval punya jitter)
    for (const c of this.cannibals) {
      c.throwT -= dt;
      if (c.throwT <= 0) {
        // Spawn fork dari posisi cannibal, lempar ke atas
        this.forks.push({
          x: c.x, y: c.y - 20,
          vx: (Math.random() - 0.5) * 2,
          vy: -14,                 // velocitas awal ke atas (tinggi)
          phase: "rising",          // → rising → offscreen → falling
          fallX: 0
        });
        // Animasi cannibal "throwing" (visual flag)
        c.throwAnim = 200;
        c.throwT = sp.intervalMin + Math.random() * (sp.intervalMax - sp.intervalMin);
      }
      if (c.throwAnim) c.throwAnim -= dt;
    }

    // Update tiap fork
    for (const fk of this.forks) {
      if (fk.phase === "rising") {
        fk.vy += PHY.gravity * 0.4;  // gravity lebih lembut saat naik
        fk.x += fk.vx; fk.y += fk.vy;
        if (fk.y < -20) {
          // Off-screen, switch ke falling. Pilih posisi x acak untuk turun.
          fk.phase = "falling";
          fk.fallX = sp.fallZoneX + Math.random() * sp.fallZoneW;
          fk.x = fk.fallX;
          fk.y = -20;
          fk.vx = 0;
          fk.vy = sp.fallSpeed || 6;
        }
      } else if (fk.phase === "falling") {
        fk.vy += PHY.gravity * 0.5;
        fk.y += fk.vy;
        // Land kalau capai tanah - hilang
        const arena = this.level.bounds;
        if (fk.y > arena.y + arena.h) fk.dead = true;
      }
    }
    this.forks = this.forks.filter(f => !f.dead);

    // Hit detection - hanya saat falling (rising di atas, pemain tidak terancam)
    if (this.egg.state === STATE.BROKEN) return;
    const eggR = this.egg.rect();
    for (const fk of this.forks) {
      if (fk.phase !== "falling") continue;
      const fr = { x: fk.x - 4, y: fk.y - 8, w: 10, h: 22 };
      if (rectsOverlap(eggR, fr)) {
        this.egg.state = STATE.BROKEN;
        this.egg.vx = 0; this.egg.vy = 0;
        this.sound.crack();
        this.emitShellBurst();
        this.onEvent({ type:"broken", reason:"tertusuk garpu" });
        return;
      }
    }
  }

  // -------------- Hot stones (level 12) - dari volcano background --------------
  // Mirip stoneRain tapi standalone spawner. Stones jatuh dari sky (warning di
  // ceiling) dengan visual "panas" (white halo). Hit telur = LOST.
  updateHotStones(dt) {
    const cfg = this.level.spawner;
    this.spawnerElapsed += dt;
    if (!this.stones) this.stones = [];
    if (!this.stoneWarnings) this.stoneWarnings = [];
    if (this.nextStoneMs === undefined) this.nextStoneMs = cfg.firstDelayMs || 1500;

    // Spawn warnings (cluster like stoneRain)
    this.nextStoneMs -= dt;
    if (this.nextStoneMs <= 0) {
      const cMin = cfg.countMin || 1;
      const cMax = cfg.countMax || cMin;
      const count = cMin + Math.floor(Math.random() * (cMax - cMin + 1));
      for (let i = 0; i < count; i++) {
        const x = cfg.zoneX + Math.random() * cfg.zoneW;
        const stagger = Math.random() * 200;
        this.stoneWarnings.push({
          x, y: cfg.ceilingY || 70,
          countdown: (cfg.warningMs || 800) + stagger,
          hot: true
        });
      }
      this.sound.warn();
      this.nextStoneMs = (cfg.minIntervalMs || cfg.intervalMin || 1500) +
        Math.random() * ((cfg.maxIntervalMs || cfg.intervalMax || 2800) -
                         (cfg.minIntervalMs || cfg.intervalMin || 1500));
    }

    // Tick warnings → spawn hot stones
    for (const w of this.stoneWarnings) w.countdown -= dt;
    for (const w of this.stoneWarnings.filter(w => w.countdown <= 0)) {
      this.stones.push({
        x: w.x, y: (cfg.ceilingY || 70) + 20,
        vy: cfg.fallSpeed || 7, r: 10, hot: true
      });
    }
    this.stoneWarnings = this.stoneWarnings.filter(w => w.countdown > 0);

    // Update stones - gravity + ground/egg check
    const groundY = (this.level.platforms[0] || {}).y || 450;
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];
      s.vy += 0.32;
      s.y += s.vy;

      // Hit ground (any platform top di area jatuh)
      let hitGround = false;
      for (const p of this.level.platforms) {
        if (s.x >= p.x && s.x <= p.x + p.w && s.y + s.r >= p.y) {
          hitGround = true;
          this.particles.emit(8, s.x, p.y, {
            life: 400, color: "#c8c8c8", shape: "block",
            sizeMin: PX, sizeMax: PX*2, speedMin: 1.5, speedMax: 4,
            angle: -Math.PI/2, spread: Math.PI*1.4, gravity: 0.25
          });
          this.sound.thud();
          this.shake = Math.max(this.shake, 5);
          break;
        }
      }
      // Hit quicksand surface (splat visual + sand burst)
      if (!hitGround) {
        for (const h of (this.level.hazards || [])) {
          if (h.type === "quicksand" &&
              s.x >= h.x && s.x <= h.x + h.w && s.y + s.r >= h.y) {
            hitGround = true;
            this.particles.emit(10, s.x, h.y, {
              life: 500, color: "#8c8c8c", shape: "block",
              sizeMin: PX, sizeMax: PX*2, speedMin: 1, speedMax: 3,
              angle: -Math.PI/2, spread: Math.PI*1.2, gravity: 0.2
            });
            this.sound.splash();
            break;
          }
        }
      }
      // Off-screen bottom
      if (!hitGround && s.y > groundY + 100) hitGround = true;
      if (hitGround) { this.stones.splice(i, 1); continue; }

      // Hit egg
      if (this.egg.state !== STATE.BROKEN) {
        const eggR = this.egg.rect();
        const sR = { x: s.x - s.r, y: s.y - s.r, w: s.r*2, h: s.r*2 };
        if (rectsOverlap(eggR, sR)) {
          this.egg.state = STATE.BROKEN;
          this.egg.vx = 0; this.egg.vy = 0;
          this.sound.crack();
          this.emitShellBurst();
          this.onEvent({ type: "broken", reason: "tertimpa batu vulkanik" });
          this.stones.splice(i, 1);
        }
      }
    }
  }

  // -------------- Nail rain (level 13) --------------
  // Hujan paku padat, tanpa warning. Pemain WAJIB pause + gambar shield.
  // Paku yang menyentuh shield → hancur + particle effect.
  // Paku yang menyentuh ground → tetap di sana sebentar sebagai tumpukan, lalu hilang.
  updateNailRain(dt) {
    const cfg = this.level.spawner;
    this.spawnerElapsed += dt;
    this.nextSpawnMs -= dt;

    // Spawn: 1 paku per tick (dense). Tidak ada warning triangle.
    while (this.nextSpawnMs <= 0) {
      const x = cfg.zoneX + Math.random() * cfg.zoneW;
      this.fallingNails.push({
        x, y: cfg.ceilingY || 50,
        w: cfg.nailWidth || 6, h: cfg.nailHeight || 18,
        vy: (cfg.fallSpeed || 6) + Math.random() * 1.5
      });
      this.nextSpawnMs += (cfg.minIntervalMs || 40) +
        Math.random() * ((cfg.maxIntervalMs || 90) - (cfg.minIntervalMs || 40));
    }

    // Update nails: gravity + shield collision + ground check + egg hit
    const groundY = (this.level.platforms[0] || {}).y || 440;
    const shield = this.shield;

    for (let i = this.fallingNails.length - 1; i >= 0; i--) {
      const n = this.fallingNails[i];
      n.vy += 0.15;  // sedikit gravity supaya terasa jatuh
      n.y += n.vy;

      // Cek shield block: titik tip paku (bottom center)
      if (shield) {
        const tipX = n.x, tipY = n.y + n.h;
        const hitStroke = shield.blocksPoint(tipX, tipY);
        if (hitStroke >= 0) {
          shield.onHit(hitStroke);
          this.particles.emit(3, tipX, tipY, {
            life: 200, color: "#888", shape: "block",
            sizeMin: 1, sizeMax: 2, speedMin: 1, speedMax: 2.5,
            angle: -Math.PI/2, spread: Math.PI, gravity: 0.15
          });
          this.fallingNails.splice(i, 1);
          continue;
        }
      }

      // Hit ground
      let hitGround = false;
      for (const p of this.level.platforms) {
        if (n.x >= p.x && n.x <= p.x + p.w && n.y + n.h >= p.y) {
          hitGround = true;
          this.particles.emit(2, n.x, p.y, {
            life: 300, color: "#bbb", shape: "block",
            sizeMin: 1, sizeMax: 2, speedMin: 1, speedMax: 2,
            angle: -Math.PI/2, spread: Math.PI, gravity: 0.1
          });
          break;
        }
      }
      if (hitGround) { this.fallingNails.splice(i, 1); continue; }
      // Off-screen bottom
      if (n.y > groundY + 80) { this.fallingNails.splice(i, 1); continue; }

      // Hit egg
      if (this.egg.state !== STATE.BROKEN) {
        const eggR = this.egg.rect();
        const nR = { x: n.x - n.w/2, y: n.y, w: n.w, h: n.h };
        if (rectsOverlap(eggR, nR)) {
          this.egg.state = STATE.BROKEN;
          this.egg.vx = 0; this.egg.vy = 0;
          this.sound.crack();
          this.emitShellBurst();
          this.onEvent({ type: "broken", reason: "tertimpa hujan paku" });
          this.fallingNails.splice(i, 1);
        }
      }
    }
  }

  // -------------- Pipa shelter check (level 10) --------------
  // Telur dianggap "sembunyi" kalau center-x-nya berada dalam mulut pipa
  // DAN bottom telur dekat dengan tanah (tidak sedang melompat di luar pipa).
  // Toleransi 6px di tepi pipa supaya tidak terlalu kaku - pemain tidak frustrasi
  // saat baru saja masuk pipa.
  isEggInShelter() {
    const e = this.egg;
    const ecx = e.x + e.w / 2;
    const ebot = e.y + e.h;
    for (const p of this.pipes) {
      if (ecx >= p.x + 6 && ecx <= p.x + p.w - 6 &&
          ebot >= p.y && ebot <= p.y + p.h + 4) {
        return true;
      }
    }
    return false;
  }

  // -------------- Giant foot stomp (level 10) --------------
  // State machine foot:
  //   idle    → countdown ke spawn berikutnya
  //   warning → shadow di tanah pulsing, foot belum visible (atau sedang mengintip dari atas)
  //   descending → foot turun cepat dari atas
  //   stomping → foot di tanah, hold sebentar (visual impact + cek kill)
  //   rising  → foot naik balik, lalu hilang
  updateGiantFoot(dt) {
    // RENAME 'sp' → 'cfg': 'sp' adalah helper grid-snap di file-scope, jangan shadow.
    const cfg = this.level.spawner;
    this.spawnerElapsed += dt;
    if (!this.giantFoot) {
      this.giantFoot = {
        phase: "idle",
        targetX: 0,
        y: -200,                       // off-screen top
        nextSpawnMs: cfg.firstDelayMs || 1500,
        warnElapsed: 0,
        stompElapsed: 0,
        landedOnPipe: false
      };
      // Init stone rain timer kalau ada konfigurasinya
      if (cfg.stoneRain) {
        this.nextStoneMs = cfg.stoneRain.firstDelayMs || 3000;
      }
    }
    const f = this.giantFoot;
    const groundY = this.level.platforms[0] ? this.level.platforms[0].y : 450;
    // FOOT_HEIGHT: dari sprite, sole bottom = f.y + 40 (lihat drawGiantFoot)
    const FOOT_H = 40;

    // Cari pipa di posisi targetX (kalau ada, foot landing di atas pipa, bukan tanah)
    // Cap pipa lebih lebar 6px tiap sisi (capOverhang=6 di drawPipe).
    const pipeAtTarget = () => this.pipes.find(p =>
      f.targetX >= p.x - 6 && f.targetX <= p.x + p.w + 6
    );

    // Helper: cek + apply kill kalau telur di stomp range tanpa shelter.
    // SKIP kalau foot landing on pipe (cap menyerap impact, area sekitar aman).
    const tryKill = () => {
      if (this.egg.state === STATE.BROKEN) return;
      if (f.landedOnPipe) return;
      const stompL = f.targetX - cfg.stompWidth / 2;
      const stompR = f.targetX + cfg.stompWidth / 2;
      const eggR = this.egg.rect();
      const inStompX = (eggR.x + eggR.w > stompL && eggR.x < stompR);
      if (inStompX && !this.isEggInShelter()) {
        this.egg.state = STATE.BROKEN;
        this.egg.vx = 0; this.egg.vy = 0;
        this.sound.crack();
        this.emitShellBurst();
        this.onEvent({ type:"broken", reason:"terinjak kaki raksasa" });
      }
    };

    if (f.phase === "idle") {
      f.nextSpawnMs -= dt;
      if (f.nextSpawnMs <= 0) {
        // Pilih target: mix B (track current) + C (predictive)
        const ecx = this.egg.x + this.egg.w / 2;
        const usePredictive = Math.random() < (cfg.mixRandomChance ?? 0.5);
        if (usePredictive) {
          const lookaheadFrames = (cfg.predictiveLookaheadMs || 200) / 16.67;
          f.targetX = ecx + this.egg.vx * lookaheadFrames;
        } else {
          f.targetX = ecx;
        }
        f.targetX = clamp(f.targetX, cfg.zoneX, cfg.zoneX + cfg.zoneW);
        f.phase = "warning";
        f.warnElapsed = 0;
        // NO audio cue: per user request "jangan ada pemberitahuan".
        // Foot phase warning sekarang silent prep - pemain hanya lihat foot
        // saat phase descending (warning visual juga di-disable di drawGiantFoot).
      }
    } else if (f.phase === "warning") {
      f.warnElapsed += dt;
      if (f.warnElapsed >= cfg.warningMs) {
        f.phase = "descending";
        f.y = -200;
      }
    } else if (f.phase === "descending") {
      f.y += cfg.descendSpeed;
      // Tentukan landing y berdasarkan apakah ada pipa di targetX:
      //   - Pipa: foot sole landing di atas cap pipa (sole bottom = pipe.y)
      //   - Tanah: foot sole landing di permukaan tanah (sole bottom = groundY)
      const pipe = pipeAtTarget();
      const landSurfaceY = pipe ? pipe.y : groundY;
      const targetFootY = landSurfaceY - FOOT_H;
      if (f.y >= targetFootY) {
        f.y = targetFootY;
        f.phase = "stomping";
        f.stompElapsed = 0;
        f.landedOnPipe = !!pipe;
        // Shake lebih kecil kalau kena pipa (cap menyerap)
        this.shake = pipe ? 8 : 16;
        this.sound.thud();
        // Particles dust di permukaan landing
        this.particles.emit(14, f.targetX, landSurfaceY, {
          life: 600, color: "#8c8c8c", shape: "block",
          sizeMin: PX, sizeMax: PX*3, speedMin: 2, speedMax: 5,
          angle: -Math.PI/2, spread: Math.PI*1.4, gravity: 0.25
        });
        tryKill();
      }
    } else if (f.phase === "stomping") {
      tryKill();  // continuous: telur yang masuk stomp range selama hold tetap pecah
      f.stompElapsed += dt;
      if (f.stompElapsed >= (cfg.stompHoldMs || 250)) {
        f.phase = "rising";
      }
    } else if (f.phase === "rising") {
      f.y -= cfg.riseSpeed;
      if (f.y < -200) {
        f.phase = "idle";
        f.landedOnPipe = false;
        f.nextSpawnMs = cfg.intervalMin + Math.random() * (cfg.intervalMax - cfg.intervalMin);
      }
    }

    // Tick stone rain (independent dari foot phase)
    if (cfg.stoneRain) this.updateStoneRain(dt, cfg.stoneRain, groundY);
  }

  // -------------- Stone rain (level 10, paralel dengan foot) --------------
  // Batu jatuh acak dari atas. Diblok cap pipa kalau jalur turun overlap pipa.
  // Telur pecah kalau kena batu DAN tidak di pipa (shelter).
  updateStoneRain(dt, cfg, groundY) {
    // Spawn warning baru. Cluster: 1 spawn event = countMin..countMax warning
    // di posisi x acak. Memberi kesan "hujan" bukan single batu.
    this.nextStoneMs -= dt;
    if (this.nextStoneMs <= 0) {
      const cMin = cfg.countMin || 1;
      const cMax = cfg.countMax || cMin;
      const count = cMin + Math.floor(Math.random() * (cMax - cMin + 1));
      for (let i = 0; i < count; i++) {
        const x = cfg.zoneX + Math.random() * cfg.zoneW;
        // Stagger sedikit countdown supaya batu tidak persis bareng landing
        const stagger = Math.random() * 250;
        this.stoneWarnings.push({ x, y: 60, countdown: cfg.warningMs + stagger });
      }
      this.sound.warn();  // satu cue audio per cluster (bukan per batu)
      this.nextStoneMs = cfg.intervalMin + Math.random() * (cfg.intervalMax - cfg.intervalMin);
    }
    // Tick warnings → spawn batu setelah countdown habis
    for (const w of this.stoneWarnings) w.countdown -= dt;
    for (const w of this.stoneWarnings.filter(w => w.countdown <= 0)) {
      this.stones.push({ x: w.x, y: 80, vy: cfg.fallSpeed || 6, r: 9 });
    }
    this.stoneWarnings = this.stoneWarnings.filter(w => w.countdown > 0);

    // Update batu jatuh: gravity + collision check
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];
      s.vy += 0.3;
      s.y += s.vy;

      // Cek block oleh cap pipa: kalau batu x dalam range cap DAN bottom sentuh cap
      let hitPipe = false;
      for (const p of this.pipes) {
        const capX = p.x - 6, capRight = p.x + p.w + 6;
        if (s.x >= capX && s.x <= capRight && s.y + s.r >= p.y) {
          this.particles.emit(6, s.x, p.y, {
            life: 360, color: "#8c8c8c", shape: "block",
            sizeMin: PX, sizeMax: PX*2, speedMin: 1, speedMax: 3,
            angle: -Math.PI/2, spread: Math.PI, gravity: 0.2
          });
          this.sound.thud();
          hitPipe = true;
          break;
        }
      }
      if (hitPipe) { this.stones.splice(i, 1); continue; }

      // Cek hit ground
      if (s.y + s.r >= groundY) {
        this.particles.emit(7, s.x, groundY, {
          life: 360, color: "#8c8c8c", shape: "block",
          sizeMin: PX, sizeMax: PX*2, speedMin: 1.5, speedMax: 3.5,
          angle: -Math.PI/2, spread: Math.PI*1.4, gravity: 0.25
        });
        this.sound.thud();
        this.stones.splice(i, 1);
        continue;
      }

      // Cek hit telur (kalau telur tidak di shelter)
      // Live check (bukan cached) - mencegah dua batu satu frame double-fire event
      if (this.egg.state !== STATE.BROKEN) {
        const eggR = this.egg.rect();
        const stoneR = { x: s.x - s.r, y: s.y - s.r, w: s.r*2, h: s.r*2 };
        if (rectsOverlap(eggR, stoneR) && !this.isEggInShelter()) {
          this.egg.state = STATE.BROKEN;
          this.egg.vx = 0; this.egg.vy = 0;
          this.sound.crack();
          this.emitShellBurst();
          this.onEvent({ type:"broken", reason:"tertimpa batu" });
          this.stones.splice(i, 1);
        }
      }
    }
  }

  emitShellBurst() {
    const cx = this.egg.x + this.egg.w/2, cy = this.egg.y + this.egg.h/2;
    this.particles.emit(8, cx, cy,
      { life: 1400, shape: "shell", sizeMin: PX, sizeMax: PX*2,
        speedMin: 2, speedMax: 5, spread: Math.PI*2, gravity: 0.35 });
    this.particles.emit(5, cx, cy,
      { life: 900, shape: "yolk", sizeMin: PX, sizeMax: PX*2,
        speedMin: 1, speedMax: 3, spread: Math.PI*2, gravity: 0.3 });
  }

  emitSparkleBurst() {
    const d = this.level.doorOut;
    const cx = d.x + d.w/2, cy = d.y + d.h/2;
    this.particles.emit(14, cx, cy,
      { life: 900, color: "#ffd54f", shape: "star",
        sizeMin: PX, sizeMax: PX*2, speedMin: 1.5, speedMax: 3.5,
        spread: Math.PI*2, gravity: 0 });
  }

  // ============= RENDER =============
  render() {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.mode === "home") {
      this.renderHome();
      ctx.restore();
      return;
    }

    if (this.shake > 0) ctx.translate(
      Math.round((Math.random()-0.5)*this.shake/PX)*PX,
      Math.round((Math.random()-0.5)*this.shake/PX)*PX);
    if (!this.level) { ctx.restore(); return; }

    // Langit biru + awan
    this.drawSky();

    // Background decoration: gunung berapi (level 12) - faded di kejauhan
    if (this.level.volcano) this.drawVolcano(this.level.volcano);

    const b = this.level.bounds;

    // Title plain text (no box) - render dengan shadow putih supaya terbaca
    // di background apapun. Hint show dengan tombol rewarded ad (lihat this.hintVisible).
    const title = this.level.title || "";
    ctx.font = "bold 12px 'Press Start 2P', monospace";
    ctx.fillStyle = C.W;
    ctx.fillText(title, b.x + 13, b.y + 23);   // shadow putih
    ctx.fillStyle = C.K;
    ctx.fillText(title, b.x + 12, b.y + 22);

    // Hint overlay (muncul sementara setelah klik tombol hint + nonton iklan).
    // hintVisible = timeMs sampai hint hilang. Di-set dari main.js via showHint().
    if (this.hintVisible && this.timeMs < this.hintVisible) {
      const hint = this.level.hint || "";
      const hW = Math.min(640, hint.length * 9 + 24);
      const hX = b.x + (b.w - hW) / 2;
      pxRect(ctx, hX, b.y + 46, hW, 30, C.K);
      pxRect(ctx, hX + PX, b.y + 46 + PX, hW - PX*2, 30 - PX*2, "#fff3cd");
      ctx.fillStyle = C.K; ctx.font = "bold 10px 'Press Start 2P', monospace";
      ctx.fillText(hint, hX + 12, b.y + 65);
    }

    // Platforms (tanah / log)
    for (const p of this.level.platforms) {
      if (p.kind === "log") this.drawLog(p);
      else this.drawGround(p);
    }

    // Hazards
    for (const h of (this.level.hazards || [])) {
      if (h.type === "water") this.drawWater(h);
      else if (h.type === "spike") this.drawStaticSpikes(h);
      else if (h.type === "quicksand") this.drawQuicksand(h);
    }

    // Trees
    for (const t of this.trees) this.drawTree(t);

    // Boxes (kotak yang bisa di-dorong)
    for (const box of this.boxes) this.drawBox(box);

    // Bridges (jembatan gantung)
    for (const br of this.bridges) this.drawBridge(br);

    // Mattresses (kasur) di-render setelah bridges supaya tampak di atasnya
    if (this.mattresses) for (const m of this.mattresses) this.drawMattress(m);

    // BalloonRods (level 11)
    if (this.balloonRods) for (const rod of this.balloonRods) this.drawBalloonRod(rod);

    // Doors
    this.drawDoor(this.level.doorIn, "in");
    this.drawDoor(this.level.doorOut, "out");

    // Spike rain (warnings, falling, ground)
    this.drawSpawner();

    // Cannibals + forks (level 8)
    if (this.cannibals && this.cannibals.length) {
      for (const c of this.cannibals) this.drawCannibal(c);
      for (const fk of this.forks) this.drawFork(fk);
    }

    // Pipa (level 10): di-render SEBELUM egg supaya egg terlihat di dalam pipa.
    // Visual: egg berdiri di dalam pipa, pemain tahu posisinya. Mekanik hiding
    // murni dari shelter check (bukan visual occlusion).
    for (const p of this.pipes) this.drawPipe(p);

    // Egg
    this.drawEgg(this.egg);

    // Giant foot shadow + foot (level 10) - di atas semua supaya jelas
    if (this.giantFoot) this.drawGiantFoot();

    // Stone rain warnings + falling stones (level 10 / 12 hot stones)
    if (this.stoneWarnings.length || this.stones.length) this.drawStoneRain();

    // Nail rain (level 13): di atas egg supaya jelas paku yang akan menimpa
    if (this.fallingNails && this.fallingNails.length) this.drawNails();

    // Shield drawing (level 13): di atas nails supaya visible sebagai perisai
    if (this.shield) this.shield.draw(ctx);

    // Particles
    this.particles.draw(ctx);

    // Pause overlay: always show "PAUSE" saat game paused. Level dengan shield
    // dapat subtext tambahan tentang mode gambar.
    if (this.paused) this.drawPauseHUD();

    ctx.restore();
  }

  drawNails() {
    const ctx = this.ctx;
    ctx.save();
    for (const n of this.fallingNails) {
      // Paku: garis vertikal metal dengan tip tajam di bawah
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(n.x - n.w/2, n.y, n.w, n.h - 4);
      // Tip segitiga
      ctx.beginPath();
      ctx.moveTo(n.x - n.w/2, n.y + n.h - 4);
      ctx.lineTo(n.x + n.w/2, n.y + n.h - 4);
      ctx.lineTo(n.x, n.y + n.h);
      ctx.closePath();
      ctx.fill();
      // Highlight kiri untuk efek metal
      ctx.fillStyle = "#7a7a7a";
      ctx.fillRect(n.x - n.w/2, n.y, 1, n.h - 4);
    }
    ctx.restore();
  }

  drawPauseHUD() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.save();

    // Dim overlay tipis supaya PAUSE text menonjol tapi game state masih terlihat
    ctx.fillStyle = "rgba(15,15,15,0.35)";
    ctx.fillRect(0, 0, cw, ch);

    // Kartu hitam dengan border tebal - konsisten dengan estetika pixel game
    const cardW = 320, cardH = this.shield ? 180 : 130;
    const cardX = (cw - cardW) / 2;
    const cardY = (ch - cardH) / 2;
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = "#f7f7f7";
    ctx.lineWidth = 4;
    ctx.strokeRect(cardX + 4, cardY + 4, cardW - 8, cardH - 8);

    // "PAUSE" besar di tengah kartu
    ctx.fillStyle = "#f7f7f7";
    ctx.font = "bold 44px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSE", cw / 2, cardY + 62);

    // Subtext kecil
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.fillStyle = "#c8c8c8";
    ctx.fillText("Tekan \u25B6 untuk lanjut", cw / 2, cardY + 102);

    // Kalau level dengan shield drawing: instruksi ekstra
    if (this.shield) {
      ctx.fillStyle = "#1d5cff";
      ctx.fillRect(cardX + 12, cardY + 120, cardW - 24, 48);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.fillText("MODE GAMBAR AKTIF", cw / 2, cardY + 135);
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText("Tarik jari/mouse = perisai", cw / 2, cardY + 154);
    }

    ctx.restore();
  }

  drawSky() {
    const { ctx, canvas } = this;
    // Latar putih bersih (klasik monokrom)
    pxRect(ctx, 0, 0, canvas.width, canvas.height, C.W);
    // Dotted pattern subtle untuk tekstur
    ctx.fillStyle = C.L;
    for (let y = 0; y < canvas.height - 100; y += 30) {
      for (let x = (y / 30 % 2) * 15; x < canvas.width; x += 30) {
        ctx.fillRect(x, y, PX, PX);
      }
    }

    // Awan drift lambat
    const clouds = [
      { x: 120,  y: 70,  s: 30 },
      { x: 380,  y: 110, s: 24 },
      { x: 640,  y: 50,  s: 36 },
      { x: 900,  y: 95,  s: 27 },
      { x: 1100, y: 65,  s: 21 },
    ];
    const drift = (this.timeMs * 0.012) % 1400;
    for (const c of clouds) {
      const x = ((c.x + drift + 200) % 1400) - 200;
      this.drawCloud(x, c.y, c.s);
    }
  }

  drawCloud(cx, cy, size) {
    const { ctx } = this;
    // Outline hitam (circle besar, akan ditimpa fill putih di dalamnya)
    const off = PX;
    pxCircle(ctx, cx, cy, size + off, C.K);
    pxCircle(ctx, cx - size * 0.65, cy + size * 0.25, size * 0.72 + off, C.K);
    pxCircle(ctx, cx + size * 0.65, cy + size * 0.25, size * 0.72 + off, C.K);
    pxCircle(ctx, cx + size * 0.3,  cy - size * 0.4,  size * 0.5  + off, C.K);
    // Body putih
    pxCircle(ctx, cx, cy, size, C.W);
    pxCircle(ctx, cx - size * 0.65, cy + size * 0.25, size * 0.72, C.W);
    pxCircle(ctx, cx + size * 0.65, cy + size * 0.25, size * 0.72, C.W);
    pxCircle(ctx, cx + size * 0.3,  cy - size * 0.4,  size * 0.5,  C.W);
    // Shadow bawah (light gray)
    pxCircle(ctx, cx - size * 0.3, cy + size * 0.55, size * 0.3, C.L);
    pxCircle(ctx, cx + size * 0.3, cy + size * 0.55, size * 0.3, C.L);
  }

  drawVolcano(v) {
    const { ctx } = this;
    // Gunung berapi samar di background. Render dengan opacity rendah.
    const cx = v.x, cy = v.y;
    const scale = v.scale || 0.7;
    const baseW = 200 * scale;
    const heightV = 140 * scale;
    ctx.save();
    ctx.globalAlpha = 0.35;   // samar (faded)
    // Body trapesium (gunung)
    const baseY = cy + heightV;
    const peakHalfW = 30 * scale;
    const baseHalfW = baseW / 2;
    // Stepped triangle (pixel art mountain)
    const steps = Math.floor(heightV / PX);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const halfW = peakHalfW + (baseHalfW - peakHalfW) * t;
      const y = cy + i * PX;
      pxRect(ctx, cx - halfW, y, halfW * 2, PX, C.M);
    }
    // Outline edges
    for (let i = 0; i < steps; i += 2) {
      const t = i / steps;
      const halfW = peakHalfW + (baseHalfW - peakHalfW) * t;
      const y = cy + i * PX;
      pxRect(ctx, cx - halfW, y, PX, PX, C.D);
      pxRect(ctx, cx + halfW - PX, y, PX, PX, C.D);
    }
    // Crater (segitiga V terbuka di puncak)
    const craterW = peakHalfW * 1.5;
    pxRect(ctx, cx - craterW, cy, craterW * 2, PX*2, C.D);
    // Lava glow di puncak (animated pulse)
    const glow = 0.5 + 0.5 * Math.abs(Math.sin(this.timeMs * 0.004));
    ctx.globalAlpha = 0.35 * glow;
    pxRect(ctx, cx - peakHalfW, cy - PX*2, peakHalfW * 2, PX*2, C.W);
    ctx.globalAlpha = 0.35;
    // Smoke columns naik dari puncak (animated)
    const smokeOff = (this.timeMs * 0.03) % 30;
    for (let i = 0; i < 3; i++) {
      const sy = cy - 20 - i * 14 - smokeOff;
      const sw = peakHalfW * 1.2 + i * PX*2;
      pxCircle(ctx, cx + Math.sin(this.timeMs * 0.002 + i) * 4, sy, sw, C.L);
    }
    ctx.restore();
  }

  drawGround(p) {
    const { ctx } = this;
    const GRASS_H = 9;
    // Body tanah (dark gray dengan checker texture)
    pxRect(ctx, p.x, p.y + GRASS_H, p.w, p.h - GRASS_H, C.D);
    // Checker dither untuk tekstur dirt
    for (let y = p.y + GRASS_H; y < p.y + p.h; y += PX*2) {
      for (let x = p.x; x < p.x + p.w; x += PX*2) {
        if (((x + y) / PX) % 2 === 0) pxRect(ctx, x, y, PX, PX, C.M);
      }
    }
    // Rumput di atas (light gray strip)
    pxRect(ctx, p.x, p.y,           p.w, PX,   C.W);
    pxRect(ctx, p.x, p.y + PX,      p.w, PX,   C.L);
    pxRect(ctx, p.x, p.y + PX*2,    p.w, PX,   C.M);
    // Grass tufts di atas garis (varian tinggi)
    for (let x = p.x + 9, i = 0; x < p.x + p.w - 9; x += 18, i++) {
      const tall = (i % 3 === 0) ? PX*2 : PX;
      pxRect(ctx, x,        p.y - tall,      PX, tall, C.K);
      pxRect(ctx, x + PX,   p.y - tall - PX, PX, PX,   C.K);
      pxRect(ctx, x + PX*2, p.y - tall,      PX, tall, C.K);
    }
    // Outline hitam di sekeliling
    pxRect(ctx, p.x, p.y, p.w, PX, C.K);
    pxRect(ctx, p.x, p.y + p.h - PX, p.w, PX, C.K);
    pxRect(ctx, p.x, p.y, PX, p.h, C.K);
    pxRect(ctx, p.x + p.w - PX, p.y, PX, p.h, C.K);
  }

  drawLog(p) {
    const { ctx } = this;
    // Body mid gray
    pxRect(ctx, p.x, p.y, p.w, p.h, C.M);
    // Top highlight
    pxRect(ctx, p.x, p.y, p.w, PX, C.L);
    // Bottom shadow
    pxRect(ctx, p.x, p.y + p.h - PX, p.w, PX, C.D);
    // Bark lines (vertical black)
    for (let x = p.x + 6; x < p.x + p.w - 3; x += 15) {
      pxRect(ctx, x, p.y + 3, PX, p.h - 6, C.D);
    }
    // Outline
    pxRect(ctx, p.x, p.y, PX, p.h, C.K);
    pxRect(ctx, p.x + p.w - PX, p.y, PX, p.h, C.K);
    // Ring marks pada ujung
    if (p.h >= 12) {
      pxRect(ctx, p.x + 3, p.y + p.h/2 - 3, PX, PX, C.K);
      pxRect(ctx, p.x + 3, p.y + p.h/2 + 3, PX, PX, C.K);
    }
  }

  drawWater(w) {
    const { ctx } = this;
    // Base putih
    pxRect(ctx, w.x, w.y, w.w, w.h, C.W);
    // Diagonal hatching (klasik water representation) - garis miring bergerak
    const offset = Math.floor(this.timeMs / 120) * PX;
    for (let y = w.y; y < w.y + w.h; y += PX*2) {
      for (let x = w.x; x < w.x + w.w; x += PX*3) {
        const sx = x + ((Math.floor(y / PX) * PX + offset) % (PX*3));
        if (sx < w.x + w.w - PX) pxRect(ctx, sx, y, PX, PX, C.D);
      }
    }
    // Garis permukaan hitam tebal
    pxRect(ctx, w.x, w.y,      w.w, PX, C.K);
    pxRect(ctx, w.x, w.y + PX, w.w, PX, C.K);
    // Highlight putih bergerak di permukaan
    const t2 = Math.floor(this.timeMs / 100);
    for (let i = 0; i < 5; i++) {
      const x = w.x + ((i * 130 + t2 * 6) % (w.w - 30));
      pxRect(ctx, x, w.y + PX*3, 12, PX, C.W);
    }
    // Dasar gelap
    pxRect(ctx, w.x, w.y + w.h - PX, w.w, PX, C.K);
  }

  drawStaticSpikes(h) {
    const { ctx } = this;
    const step = 18;
    for (let x = h.x; x < h.x + h.w; x += step) {
      pxSpikeUp(ctx, x + step/2, h.y + h.h, step, h.h, C.L, C.D);
    }
  }

  drawQuicksand(h) {
    const { ctx } = this;
    // Body mid gray (pasir warna)
    pxRect(ctx, h.x, h.y, h.w, h.h, C.M);
    // Stipple/dot pattern (texture pasir)
    for (let y = h.y + PX*2; y < h.y + h.h; y += PX*3) {
      const off = (Math.floor(y / PX) * PX) % (PX*2);
      for (let x = h.x + off; x < h.x + h.w; x += PX*4) {
        pxRect(ctx, x, y, PX, PX, C.D);
      }
    }
    // Surface waves animasi - garis bergerak (mensugesti pull-down)
    const waveOff = Math.floor(this.timeMs / 80) * PX;
    ctx.fillStyle = C.L;
    for (let x = h.x; x < h.x + h.w; x += PX*4) {
      const sx = ((x + waveOff) % (h.w - PX)) + h.x;
      ctx.fillRect(sp(sx), sp(h.y + PX), PX*2, PX);
    }
    // Border atas (garis tegas - permukaan pasir)
    pxRect(ctx, h.x, h.y, h.w, PX, C.K);
    pxRect(ctx, h.x, h.y + PX*2, h.w, PX, C.D);
    // Border bawah (gelap, dasar pasir)
    pxRect(ctx, h.x, h.y + h.h - PX, h.w, PX, C.K);
  }

  drawTree(t) {
    const { ctx } = this;
    if (t.state === "sunk") return; // hilang sepenuhnya
    ctx.save();
    // Sink offset: tree turun ke tanah saat fallen
    const sinkY = t.state === "fallen" ? (t.sinkY || 0) : 0;
    ctx.translate(sp(t.baseX), sp(t.baseY + sinkY));
    const sway = t.state === "warning" ? Math.sin(this.timeMs*0.04) * 0.04 : 0;
    ctx.rotate(t.angle + sway);

    const tw = t.trunkWidth;
    // Trunk mid-gray dengan shading
    pxRect(ctx, -tw/2, -t.height, tw, t.height, C.M);
    pxRect(ctx, -tw/2 + PX, -t.height, PX, t.height, C.L); // highlight kiri
    pxRect(ctx, tw/2 - PX*2, -t.height, PX, t.height, C.D); // shadow kanan
    // Bark knots
    for (let y = -t.height + 15; y < -12; y += 24) {
      pxRect(ctx, -tw/2 + PX, y, tw - PX*2, PX, C.D);
    }
    // Trunk outline
    pxRect(ctx, -tw/2, -t.height, PX, t.height, C.K);
    pxRect(ctx, tw/2 - PX, -t.height, PX, t.height, C.K);

    // Foliage: gray cluster dengan outline hitam + highlight putih
    const top = -t.height;
    const clumps = [
      { x: 0,   y: top - 15, r: 33 },
      { x: -27, y: top - 3,  r: 24 },
      { x: 27,  y: top - 3,  r: 24 },
      { x: -12, y: top - 30, r: 21 },
      { x: 15,  y: top - 27, r: 21 },
    ];
    // Outline hitam (bigger circle)
    for (const c of clumps) pxCircle(ctx, c.x, c.y, c.r + PX, C.K);
    // Dark fill
    for (const c of clumps) pxCircle(ctx, c.x, c.y, c.r, C.D);
    // Mid fill
    for (const c of clumps) pxCircle(ctx, c.x - PX, c.y - PX, c.r - PX*2, C.M);
    // Highlight putih di pojok kiri-atas
    for (const c of clumps) {
      if (c.r > 15) pxCircle(ctx, c.x - c.r*0.35, c.y - c.r*0.35, c.r*0.28, C.L);
    }
    // Sparkle
    pxRect(ctx, -18, top - 27, PX, PX, C.W);
    pxRect(ctx, 9,  top - 18, PX, PX, C.W);

    ctx.restore();

    // Warning triangle (on top of everything)
    if (t.state === "warning") {
      const y = t.baseY - t.height - 50;
      this.drawWarnTriangle(t.baseX, y, 0.9 + 0.1 * Math.sin(this.timeMs * 0.02));
    }
  }

  drawWarnTriangle(cx, cy, pulse) {
    const { ctx } = this;
    const S = sp(cx), T = sp(cy);
    const size = Math.round(15 * pulse / PX) * PX;
    // Outer black triangle
    for (let r = 0; r < size / PX; r++) {
      const half = Math.max(PX, Math.round((size * (r + 1) / (size/PX)) / PX) * PX);
      pxRect(ctx, S - half, T - size + r * PX, half * 2, PX, C.K);
    }
    // Inner white
    for (let r = 1; r < size / PX - 1; r++) {
      const half = Math.max(PX, Math.round((size * (r) / (size/PX)) / PX) * PX - PX);
      pxRect(ctx, S - half, T - size + r * PX, half * 2, PX, C.W);
    }
    // Exclamation mark
    pxRect(ctx, S - PX, T - 9, PX*2, PX*3, C.K);
    pxRect(ctx, S - PX, T, PX*2, PX, C.K);
  }

  drawBridge(br) {
    const { ctx } = this;
    // Tali penggantung: garis dari atas (anchor top) ke ujung kiri & kanan bridge
    const topY = br.anchorY - 80;
    pxRect(ctx, br.anchorX - 2, topY, PX, 80, C.K);  // anchor pole tengah
    // Tali ke ujung
    const ropes = [
      { x1: br.anchorX, y1: topY + 6, x2: br.x + 2, y2: br.y },
      { x1: br.anchorX, y1: topY + 6, x2: br.x + br.w - 2, y2: br.y }
    ];
    for (const r of ropes) {
      const dx = r.x2 - r.x1, dy = r.y2 - r.y1;
      const steps = Math.max(8, Math.floor(Math.hypot(dx, dy) / PX));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pxRect(ctx, r.x1 + dx * t, r.y1 + dy * t, PX, PX, C.D);
      }
    }
    // Body bridge (papan kayu mid gray)
    pxRect(ctx, br.x, br.y, br.w, br.h, C.M);
    pxRect(ctx, br.x, br.y, br.w, PX, C.L);                       // top highlight
    pxRect(ctx, br.x, br.y + br.h - PX, br.w, PX, C.D);           // bottom shadow
    // Plank dividers (vertikal lines untuk look "kayu papan")
    for (let x = br.x + 6; x < br.x + br.w - 3; x += 12) {
      pxRect(ctx, x, br.y + PX, PX, br.h - PX*2, C.D);
    }
    // Outline hitam tebal
    pxRect(ctx, br.x, br.y, br.w, PX, C.K);
    pxRect(ctx, br.x, br.y + br.h - PX, br.w, PX, C.K);
    pxRect(ctx, br.x, br.y, PX, br.h, C.K);
    pxRect(ctx, br.x + br.w - PX, br.y, PX, br.h, C.K);
  }

  drawMattress(m) {
    const { ctx } = this;
    const r = m.rect();
    // Body putih puffy (cushy mattress look)
    pxRect(ctx, r.x, r.y, r.w, r.h, C.W);
    // Highlight strip atas
    pxRect(ctx, r.x, r.y, r.w, PX, C.L);
    // Shadow strip bawah
    pxRect(ctx, r.x, r.y + r.h - PX, r.w, PX, C.D);
    // Stitches (button tufts) di atas dan bawah - tanda khas kasur
    for (let x = r.x + 9; x < r.x + r.w - 6; x += 18) {
      pxRect(ctx, x, r.y + PX*2, PX, PX, C.D);
      pxRect(ctx, x, r.y + r.h - PX*3, PX, PX, C.D);
    }
    // Outline hitam
    pxRect(ctx, r.x, r.y, r.w, PX, C.K);
    pxRect(ctx, r.x, r.y + r.h - PX, r.w, PX, C.K);
    pxRect(ctx, r.x, r.y, PX, r.h, C.K);
    pxRect(ctx, r.x + r.w - PX, r.y, PX, r.h, C.K);
    // Sudut bulat (rounded corners) - 1 pixel inset
    pxRect(ctx, r.x, r.y, PX, PX, C.W);
    pxRect(ctx, r.x + r.w - PX, r.y, PX, PX, C.W);
    pxRect(ctx, r.x, r.y + r.h - PX, PX, PX, C.W);
    pxRect(ctx, r.x + r.w - PX, r.y + r.h - PX, PX, PX, C.W);
  }

  drawBalloonRod(rod) {
    const { ctx } = this;
    // Strings dari rod ke balon
    for (const b of rod.balloons) {
      if (b.popped) continue;
      const bx = rod.x + b.offsetX;
      const byTop = rod.y - rod.balloonHeight + 10;
      const byBot = rod.y;
      ctx.fillStyle = C.D;
      for (let y = byTop; y <= byBot; y += PX) {
        ctx.fillRect(sp(bx) - PX/2, sp(y), PX, PX);
      }
    }

    // Rod (papan kayu mid gray) - sama style dgn bridge
    pxRect(ctx, rod.x, rod.y, rod.w, rod.h, C.M);
    pxRect(ctx, rod.x, rod.y, rod.w, PX, C.L);
    pxRect(ctx, rod.x, rod.y + rod.h - PX, rod.w, PX, C.D);
    for (let x = rod.x + 6; x < rod.x + rod.w - 3; x += 12) {
      pxRect(ctx, x, rod.y + PX, PX, rod.h - PX*2, C.D);
    }
    pxRect(ctx, rod.x, rod.y, rod.w, PX, C.K);
    pxRect(ctx, rod.x, rod.y + rod.h - PX, rod.w, PX, C.K);
    pxRect(ctx, rod.x, rod.y, PX, rod.h, C.K);
    pxRect(ctx, rod.x + rod.w - PX, rod.y, PX, rod.h, C.K);

    // Balloons
    for (const b of rod.balloons) {
      const bx = rod.x + b.offsetX;
      const by = rod.y - rod.balloonHeight;
      if (b.popped) {
        // Pop animation: bintang fade-out
        if (b.popAnim > 0) {
          const a = b.popAnim / 400;
          ctx.globalAlpha = a;
          pxRect(ctx, bx - PX*3, by, PX*6, PX, C.K);
          pxRect(ctx, bx, by - PX*3, PX, PX*6, C.K);
          pxRect(ctx, bx - PX*2, by - PX*2, PX, PX, C.K);
          pxRect(ctx, bx + PX*2, by + PX*2, PX, PX, C.K);
          ctx.globalAlpha = 1;
        }
        continue;
      }
      // Outline hitam
      pxCircle(ctx, bx, by, rod.balloonRadius + PX, C.K);
      // Body putih
      pxCircle(ctx, bx, by, rod.balloonRadius, C.W);
      // Highlight kiri-atas
      pxCircle(ctx, bx - PX*2, by - PX*2, PX*2, C.L);
      pxRect(ctx, bx - PX*3, by - PX*3, PX, PX, C.W);
      // Knot bawah balon
      pxRect(ctx, bx - PX, by + rod.balloonRadius, PX*2, PX*2, C.K);
    }
  }

  drawCannibal(c) {
    const { ctx } = this;
    const x = c.x, y = c.y;
    const throwing = c.throwAnim > 0;
    // Body (silhouette: kepala bulat + badan rectangle)
    pxRect(ctx, x - 9, y - 36, 18, 18, C.D);    // kepala (gelap)
    pxRect(ctx, x - 9, y - 36, 18, PX, C.K);    // outline
    pxRect(ctx, x - 9, y - 18 - PX, 18, PX, C.K);
    pxRect(ctx, x - 9, y - 36, PX, 18, C.K);
    pxRect(ctx, x + 6, y - 36, PX, 18, C.K);
    // Mata kuning (cannibal!)
    pxRect(ctx, x - 5, y - 30, PX, PX, C.W);
    pxRect(ctx, x + 2, y - 30, PX, PX, C.W);
    // Bulu di kepala (3 garis)
    pxRect(ctx, x - 6, y - 42, PX, PX*2, C.K);
    pxRect(ctx, x - 1, y - 44, PX, PX*3, C.K);
    pxRect(ctx, x + 4, y - 42, PX, PX*2, C.K);
    // Badan (kotak gelap)
    pxRect(ctx, x - 12, y - 18, 24, 18, C.K);
    pxRect(ctx, x - 9, y - 15, 18, 12, C.D);
    // Tangan: saat throwing, tangan terangkat
    if (throwing) {
      pxRect(ctx, x + 9, y - 36, PX*2, PX*4, C.D);   // tangan kanan ke atas
      pxRect(ctx, x + 9, y - 36, PX*2, PX, C.K);
    } else {
      pxRect(ctx, x + 12, y - 18, PX*2, PX*4, C.D);  // tangan kanan ke bawah
    }
    pxRect(ctx, x - 14, y - 18, PX*2, PX*4, C.D);    // tangan kiri ke bawah
    // Kaki
    pxRect(ctx, x - 8, y, PX*2, PX*3, C.K);
    pxRect(ctx, x + 4, y, PX*2, PX*3, C.K);
  }

  drawFork(fk) {
    const { ctx } = this;
    // Garpu: gagang panjang + 3 ujung tajam
    const x = fk.x, y = fk.y;
    const dir = fk.phase === "rising" ? -1 : 1; // ujung mana yang menonjol
    // Gagang
    pxRect(ctx, x - PX/2, y - 12*dir, PX, 18, C.D);
    pxRect(ctx, x - PX/2, y - 12*dir, PX, PX, C.K);
    // Kepala garpu (3 garpu)
    const headY = y - 12*dir;
    if (dir < 0) {
      // Naik: kepala di atas
      pxRect(ctx, x - 4, headY - 4, PX, 4, C.D);
      pxRect(ctx, x - 0, headY - 4, PX, 4, C.D);
      pxRect(ctx, x + 4, headY - 4, PX, 4, C.D);
      pxRect(ctx, x - 4, headY, 9, PX, C.D);
    } else {
      // Turun: kepala di bawah
      pxRect(ctx, x - 4, headY, PX, 4, C.D);
      pxRect(ctx, x - 0, headY, PX, 4, C.D);
      pxRect(ctx, x + 4, headY, PX, 4, C.D);
      pxRect(ctx, x - 4, headY - PX, 9, PX, C.D);
    }
  }

  drawBox(box) {
    const { ctx } = this;
    // Body mid gray
    pxRect(ctx, box.x, box.y, box.w, box.h, C.M);
    // Wood plank texture (horizontal stripes)
    pxRect(ctx, box.x, box.y + box.h/3, box.w, PX, C.D);
    pxRect(ctx, box.x, box.y + 2*box.h/3, box.w, PX, C.D);
    // Highlight atas + kiri
    pxRect(ctx, box.x, box.y, box.w, PX, C.L);
    pxRect(ctx, box.x, box.y, PX, box.h, C.L);
    // Shadow bawah + kanan
    pxRect(ctx, box.x, box.y + box.h - PX, box.w, PX, C.D);
    pxRect(ctx, box.x + box.w - PX, box.y, PX, box.h, C.D);
    // Diagonal "X" pattern di tengah (style krat klasik)
    pxRect(ctx, box.x + box.w/2 - PX, box.y + box.h/2 - PX, PX*2, PX*2, C.D);
    // Outline hitam tebal
    pxRect(ctx, box.x, box.y, box.w, PX, C.K);
    pxRect(ctx, box.x, box.y + box.h - PX, box.w, PX, C.K);
    pxRect(ctx, box.x, box.y, PX, box.h, C.K);
    pxRect(ctx, box.x + box.w - PX, box.y, PX, box.h, C.K);
  }

  drawPipe(p) {
    const { ctx } = this;
    // Pipa klasik: cap atas lebar, tube body sempit. Mulut hitam di tengah cap.
    const capH = 18;
    const capOverhang = 6;
    const tubeY = p.y + capH;
    const tubeH = p.h - capH;
    // Tube body (mid gray dengan shading)
    pxRect(ctx, p.x, tubeY, p.w, tubeH, C.D);
    // Highlight kiri (light)
    pxRect(ctx, p.x + PX, tubeY, PX*2, tubeH, C.M);
    pxRect(ctx, p.x + PX*3, tubeY, PX, tubeH, C.L);
    // Shadow kanan (dark)
    pxRect(ctx, p.x + p.w - PX*2, tubeY, PX*2, tubeH, C.K);
    // Tube outline
    pxRect(ctx, p.x, tubeY, PX, tubeH, C.K);
    pxRect(ctx, p.x + p.w - PX, tubeY, PX, tubeH, C.K);

    // Cap (lebih lebar)
    const capX = p.x - capOverhang;
    const capW = p.w + capOverhang * 2;
    pxRect(ctx, capX, p.y, capW, capH, C.D);
    // Cap highlight strip (atas)
    pxRect(ctx, capX, p.y, capW, PX, C.L);
    pxRect(ctx, capX, p.y + PX, capW, PX, C.M);
    // Cap shadow strip (bawah)
    pxRect(ctx, capX, p.y + capH - PX, capW, PX, C.K);
    // Cap outline
    pxRect(ctx, capX, p.y, PX, capH, C.K);
    pxRect(ctx, capX + capW - PX, p.y, PX, capH, C.K);
    pxRect(ctx, capX, p.y, capW, PX, C.K);

    // Mulut pipa (hole hitam di tengah cap)
    const mouthInset = 9;
    const mouthY = p.y + PX*2;
    const mouthH = capH - PX*4;
    pxRect(ctx, p.x + mouthInset, mouthY, p.w - mouthInset*2, mouthH, C.K);
    // Highlight tepi mulut (depth illusion)
    pxRect(ctx, p.x + mouthInset, mouthY, p.w - mouthInset*2, PX, C.W);
  }

  drawGiantFoot() {
    const { ctx } = this;
    const f = this.giantFoot;
    const cfg = this.level.spawner;

    // NO warning visual: shadow + ceiling triangle + dotted line dihapus per
    // user request "jangan ada pemberitahuan mau injak bagian mana".
    // Phase warning silent - pemain baru sadar foot datang saat descending.
    if (f.phase === "idle" || f.phase === "warning") return;

    // Render foot saat descending/stomping/rising
    const cx = f.targetX;
    const footW = cfg.stompWidth;
    const footH = 40;
    const legW = footW * 0.55;
    const top = f.y;

    // Leg (shaft) dari atas screen ke foot top. Skip kalau top sudah jauh di atas
    // (saat rising sudah hampir hilang) supaya tidak render rectangle negatif.
    const legTopY = -50;
    const legHeight = top + 10 - legTopY;
    if (legHeight > 0) {
      pxRect(ctx, cx - legW/2, legTopY, legW, legHeight, C.D);
      pxRect(ctx, cx - legW/2 + PX, legTopY, PX*2, legHeight, C.M);
      pxRect(ctx, cx + legW/2 - PX*2, legTopY, PX*2, legHeight, C.K);
      pxRect(ctx, cx - legW/2, legTopY, PX, legHeight, C.K);
      pxRect(ctx, cx + legW/2 - PX, legTopY, PX, legHeight, C.K);
    }

    // Ankle band (dekorasi di pertemuan leg-foot)
    pxRect(ctx, cx - legW/2 - PX*2, top + 10, legW + PX*4, PX*3, C.K);
    pxRect(ctx, cx - legW/2 - PX*2, top + 10 + PX, legW + PX*4, PX, C.M);

    // Foot (sole) - lebar dengan toe details
    const soleY = top + 18;
    pxRect(ctx, cx - footW/2, soleY, footW, footH - 18, C.D);
    pxRect(ctx, cx - footW/2, soleY, footW, PX, C.M);
    pxRect(ctx, cx - footW/2, soleY + footH - 18 - PX, footW, PX, C.K);
    // Toe segments (5 jari)
    const toeY = soleY + footH - 18 - PX*3;
    const toeW = footW / 5;
    for (let i = 0; i < 5; i++) {
      const tx = cx - footW/2 + i * toeW + PX;
      pxRect(ctx, tx, toeY, toeW - PX*2, PX*2, C.K);
    }
    // Outline foot
    pxRect(ctx, cx - footW/2, soleY, PX, footH - 18, C.K);
    pxRect(ctx, cx + footW/2 - PX, soleY, PX, footH - 18, C.K);
    pxRect(ctx, cx - footW/2, soleY, footW, PX, C.K);
    pxRect(ctx, cx - footW/2, soleY + footH - 18 - PX, footW, PX, C.K);
  }

  drawStoneRain() {
    const { ctx } = this;
    // Warning ceiling triangle + dotted line DIHAPUS per user request - no indicator.
    // stoneWarnings tetap di-process (untuk countdown + spawn timing), cuma tidak di-render.
    // Batu jatuh: pixel rock dengan shading 3 layer.
    // Hot variant (level 12) tambah white halo + flicker.
    for (const s of this.stones) {
      if (s.hot) {
        // Hot halo: white pulsing ring sekeliling batu
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(this.timeMs * 0.03 + s.y * 0.05));
        ctx.globalAlpha = pulse * 0.7;
        pxCircle(ctx, s.x, s.y, s.r + PX*2, C.W);
        ctx.globalAlpha = 1;
      }
      this.drawStone(s.x, s.y, s.r);
      // Motion blur (versi semi-transparan di atas batu utama)
      ctx.globalAlpha = 0.3;
      this.drawStone(s.x, s.y - 8, s.r * 0.8);
      ctx.globalAlpha = 1;
    }
  }

  drawStone(cx, cy, r) {
    const { ctx } = this;
    // Outer outline (hitam)
    pxCircle(ctx, cx, cy, r + PX, C.K);
    // Body dark gray
    pxCircle(ctx, cx, cy, r, C.D);
    // Mid highlight (offset kiri-atas)
    pxCircle(ctx, cx - PX, cy - PX, r - PX*2, C.M);
    // Tiny highlight putih (specular)
    pxRect(ctx, cx - PX*2, cy - PX*2, PX, PX, C.L);
    // Sedikit "dot" tekstur batu (random consistent berdasar posisi)
    pxRect(ctx, cx + PX, cy, PX, PX, C.K);
  }

  drawDoor(d, kind) {
    const { ctx } = this;
    // Wobble visual hint untuk teleport door (mengisyaratkan "drag me")
    if (d.teleport && !d.beingDragged) {
      ctx.save();
      const w = Math.sin(this.timeMs * 0.008) * 2;
      ctx.translate(w, 0);
    }
    // Body putih dengan outline hitam tebal
    pxRect(ctx, d.x, d.y, d.w, d.h, C.W);
    // Outline (2 pixel tebal)
    pxRect(ctx, d.x, d.y, d.w, PX*2, C.K);
    pxRect(ctx, d.x, d.y + d.h - PX*2, d.w, PX*2, C.K);
    pxRect(ctx, d.x, d.y, PX*2, d.h, C.K);
    pxRect(ctx, d.x + d.w - PX*2, d.y, PX*2, d.h, C.K);

    // Panel inset (rectangle gray)
    const panelInset = 6;
    pxRect(ctx, d.x + panelInset, d.y + 9, d.w - panelInset*2, d.h - 30, C.L);
    // Panel outline
    pxRect(ctx, d.x + panelInset, d.y + 9, d.w - panelInset*2, PX, C.K);
    pxRect(ctx, d.x + panelInset, d.y + d.h - 21, d.w - panelInset*2, PX, C.K);
    pxRect(ctx, d.x + panelInset, d.y + 9, PX, d.h - 30, C.K);
    pxRect(ctx, d.x + d.w - panelInset - PX, d.y + 9, PX, d.h - 30, C.K);
    // Shading inside panel (diagonal dither untuk dark effect)
    // Pakai koordinat snapped supaya pola dither konsisten tidak peduli posisi pintu
    for (let y = sp(d.y + 12); y < d.y + d.h - 24; y += PX*2) {
      for (let x = sp(d.x + panelInset + PX); x < d.x + d.w - panelInset - PX; x += PX*2) {
        if (((x / PX + y / PX) | 0) % 2 === 0) pxRect(ctx, x, y, PX, PX, C.M);
      }
    }

    // Knob (dark circle dengan hole)
    const knobY = d.y + Math.floor(d.h * 0.55 / PX) * PX;
    pxCircle(ctx, d.x + d.w - 12, knobY, 6, C.K);
    pxRect(ctx, d.x + d.w - 9, knobY - PX, PX, PX, C.W);

    // Glow pintu keluar (pulsing putih halus)
    if (kind === "out") {
      const glow = 0.15 + 0.15 * Math.sin(this.timeMs * 0.005);
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.fillStyle = C.W;
      ctx.fillRect(d.x - 6, d.y - 6, d.w + 12, d.h + 12);
      ctx.restore();
    }

    // Label di atas pintu
    const lblW = 48, lblH = 18;
    const lblX = d.x + (d.w - lblW) / 2;
    const lblY = d.y - lblH - 6;
    pxRect(ctx, lblX, lblY, lblW, lblH, C.K);
    pxRect(ctx, lblX + PX, lblY + PX, lblW - PX*2, lblH - PX*2, C.W);
    ctx.fillStyle = C.K;
    ctx.font = "bold 10px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(kind === "out" ? "OUT" : "IN", lblX + lblW/2, lblY + 13);
    ctx.textAlign = "left";
    // Akhiri wobble transform
    if (d.teleport && !d.beingDragged) ctx.restore();
    // Hint "DRAG" arrow (kecil, di atas pintu teleport)
    if (d.teleport) {
      ctx.fillStyle = C.W; ctx.font = "bold 9px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(d.beingDragged ? "..." : "DRAG ME", d.x + d.w/2, d.y - 28);
      ctx.textAlign = "left";
    }
  }

  drawSpawner() {
    const { ctx } = this;
    // Warnings di langit-langit DIHAPUS (per user request - no indicator where hazard falls).
    // Sound warn di updateSpawner tetap ada sbg audio cue umum.
    // Paku jatuh (mata panah ke bawah)
    for (const s of this.fallingSpikes) {
      pxSpikeDown(ctx, s.x, s.y, s.w, s.h, C.D, C.K);
      ctx.globalAlpha = 0.3;
      pxSpikeDown(ctx, s.x, s.y - 6, s.w * 0.6, s.h * 0.6, C.M, C.D);
      ctx.globalAlpha = 1;
    }
    // Paku di tanah (mata panah ke atas)
    for (const g of this.groundSpikes) {
      pxSpikeUp(ctx, g.x + g.w/2, g.y + g.h, g.w, g.h, C.L, C.D);
    }
  }

  drawEgg(e) {
    const { ctx } = this;
    if (e.state === STATE.BROKEN) return; // particles take over

    // Bayangan di tanah
    if (e.onGround && !e.inWater) {
      pxRect(ctx, e.x + 3, e.y + e.h + PX, e.w - 6, PX, "rgba(0,0,0,0.2)");
    }

    const bob = (e.state === STATE.WALK) ? Math.round(Math.sin(e.walkAnim*6)) * PX :
                (e.state === STATE.FLOAT) ? Math.round(Math.sin(this.timeMs*0.004) * 1.5) * PX :
                (e.state === STATE.IDLE)  ? Math.round(Math.sin(this.timeMs*0.003) * 0.4) * PX : 0;

    // Pick sprite variant
    let sprite = EGG_SPRITE.idle;
    if (e.state === STATE.JUMP) sprite = EGG_SPRITE.jump;
    else if (e.state === STATE.FALL) sprite = EGG_SPRITE.fall;
    else if (e.state === STATE.FLOAT) sprite = EGG_SPRITE.float;
    else if (e.state === STATE.WON) sprite = EGG_SPRITE.won;

    const spriteW = sprite[0].length * PX;
    const spriteH = sprite.length * PX;
    const offsetX = Math.round((e.w - spriteW) / 2 / PX) * PX;
    const offsetY = Math.round((e.h - spriteH) / 2 / PX) * PX;

    // Squash-stretch (diterapkan via scale transform; sprite kemudian re-sprite-asikan
    // dengan pxRect seperti biasa — jadi tetap pixel-perfect setelah scale, karena
    // scale cuma mempengaruhi blit final ke canvas)
    ctx.save();
    const cx = e.x + e.w/2;
    const cy = e.y + e.h/2;
    let sx = 1, sy = 1;
    if (e.squashT > 0) { const k = e.squashT / 160; sx = 1 + 0.15*k; sy = 1 - 0.12*k; }
    else if (e.state === STATE.JUMP) { sx = 0.92; sy = 1.08; }
    else if (e.state === STATE.FALL) { sx = 0.95; sy = 1.04; }
    ctx.translate(cx, cy + bob);
    ctx.scale(sx, sy);
    ctx.translate(-cx, -cy);

    // Legs (hanya saat jalan / idle di tanah)
    if (e.onGround && !e.inWater && (e.state === STATE.WALK || e.state === STATE.IDLE)) {
      this.drawEggLegs(e, bob);
    }

    drawSprite(ctx, sprite, e.x + offsetX, e.y + offsetY + bob, e.facing);

    // Cheek blush (overlay pink - opsional berdasar state)
    if (e.state === STATE.WALK || e.state === STATE.IDLE || e.state === STATE.FLOAT || e.state === STATE.WON) {
      const baseY = e.y + offsetY + 6 * PX + bob;
      const lx = e.x + offsetX + (e.facing > 0 ? PX : 5 * PX);
      const rx = e.x + offsetX + (e.facing > 0 ? 5 * PX : PX);
      pxRect(ctx, lx, baseY, PX, PX, "rgba(255,120,120,0.55)");
      pxRect(ctx, rx, baseY, PX, PX, "rgba(255,120,120,0.55)");
    }

    // Wings (saat terbang/mengambang)
    if (e.state === STATE.JUMP || e.state === STATE.FLOAT || e.state === STATE.FALL) {
      this.drawEggWings(e, bob);
    }

    ctx.restore();
  }

  drawEggLegs(e, bob) {
    const { ctx } = this;
    const footY = e.y + e.h + bob;
    const walking = e.state === STATE.WALK;
    const phase = walking ? Math.sin(e.walkAnim * 6) : 0;
    const phase2 = walking ? Math.sin(e.walkAnim * 6 + Math.PI) : 0;
    // left
    const lOff = Math.round(phase * 3);
    const rOff = Math.round(phase2 * 3);
    const lLift = walking ? Math.max(0, -phase) * PX * 2 : 0;
    const rLift = walking ? Math.max(0, -phase2) * PX * 2 : 0;
    // kaki 1 pixel lebar, 2 pixel tinggi
    pxRect(ctx, e.x + 6 + lOff, footY - lLift - PX, PX, PX*2, C.K);
    pxRect(ctx, e.x + e.w - 9 + rOff, footY - rLift - PX, PX, PX*2, C.K);
    // telapak kaki (pxRect 2 lebar)
    pxRect(ctx, e.x + 3 + lOff, footY + PX - lLift, PX*3, PX, C.K);
    pxRect(ctx, e.x + e.w - 12 + rOff, footY + PX - rLift, PX*3, PX, C.K);
  }

  // =============== HOME SCREEN ===============
  renderHome() {
    const { ctx, canvas } = this;
    // Background putih + awan drifting + tanah bawah
    this.drawSky();
    this.drawGround({ x: 0, y: 490, w: canvas.width, h: 70 });

    // Decorative egg besar yang bob
    const bigBob = Math.round(Math.sin(this.timeMs * 0.003) * 2) * PX;
    this.drawBigEgg(canvas.width / 2, 270 + bigBob);

    // Title: MR. EGG (pixel-style font big)
    ctx.fillStyle = C.K;
    ctx.font = "bold 64px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    // Shadow
    ctx.fillStyle = C.L;
    ctx.fillText("MR.EGG", canvas.width/2 + 6, 110 + 6);
    ctx.fillStyle = C.K;
    ctx.fillText("MR.EGG", canvas.width/2, 110);
    // Subtitle
    ctx.font = "bold 22px 'Press Start 2P', monospace";
    ctx.fillStyle = C.D;
    ctx.fillText("PUZZLE MASTER", canvas.width/2, 150);

    // Define buttons - conditional berdasar homeView
    this.homeBtns = [];
    const wonMax = (this.wonMax ?? -1);

    if (this.homeView === "select") {
      // SELECT VIEW: tampilkan hanya level yang sudah pernah dimainkan.
      // "Pernah dimainkan" = won + 1 (next yang currently bisa dicoba).
      // First-time pemain (wonMax=-1) → playedMax=0 → cuma level 1 muncul.
      const playedMax = Math.min(LEVELS.length - 1, wonMax + 1);
      const count = playedMax + 1;
      const lvlSize = 56;
      const gap = 12;
      const totalW = count * lvlSize + (count - 1) * gap;
      const startX = (canvas.width - totalW) / 2;
      const startY = 380;
      for (let i = 0; i <= playedMax; i++) {
        this.homeBtns.push({
          x: startX + i * (lvlSize + gap), y: startY,
          w: lvlSize, h: lvlSize,
          label: String(i + 1),
          handler: () => this.loadLevel(LEVELS[i]),
          small: true
        });
      }
      // Back button
      const backW = 160, backH = 36;
      this.homeBtns.push({
        x: (canvas.width - backW) / 2, y: 452,
        w: backW, h: backH,
        label: "BACK",
        handler: () => { this.homeView = "menu"; this.homeSelected = 0; },
        small: true
      });
      // Helper text
      ctx.fillStyle = C.D;
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("PILIH LEVEL", canvas.width/2, 360);
    } else {
      // MENU VIEW (default): cuma PLAY + GET APK
      const playLevelIdx = Math.min(LEVELS.length - 1, wonMax + 1);
      const playW = 280, playH = 56;
      this.homeBtns.push({
        x: (canvas.width - playW) / 2, y: 380,
        w: playW, h: playH,
        label: wonMax >= 0 ? `LANJUT Lv${playLevelIdx + 1}` : "PLAY",
        // Klik PLAY → switch ke select view (per user request)
        handler: () => { this.homeView = "select"; this.homeSelected = 0; }
      });
      // Hint text
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.fillStyle = C.D;
      ctx.textAlign = "center";
      ctx.fillText("PRESS SPACE OR CLICK TO START", canvas.width/2, 340);
    }

    // GET APK button selalu ada (di-bawah), handler dari main.js callback
    const apkW = 240, apkH = 36;
    this.homeBtns.push({
      x: (canvas.width - apkW) / 2, y: 510,
      w: apkW, h: apkH,
      label: "\u{1F4F1} GET APK",
      handler: () => { if (this.onInstallApp) this.onInstallApp(); },
      small: true,
      isInstall: true
    });

    // Render semua buttons
    const blink = Math.floor(this.timeMs / 400) % 2 === 0;
    for (let i = 0; i < this.homeBtns.length; i++) {
      const b = this.homeBtns[i];
      const active = (i === this.homeSelected);
      this.drawPixelButton(b, active, blink && i === 0);
    }

    ctx.textAlign = "left";
  }

  drawPixelButton(b, active, blink) {
    const { ctx } = this;
    const locked = !!b.locked;
    // Shadow block (drop shadow klasik). Locked = shadow lebih pucat
    pxRect(ctx, b.x + PX*2, b.y + PX*2, b.w, b.h, locked ? C.M : C.K);
    // Body: locked = mid gray, normal = putih/hitam berdasar active
    const bodyColor = locked ? C.L : (active ? C.K : C.W);
    pxRect(ctx, b.x, b.y, b.w, b.h, bodyColor);
    // Outline (locked = lebih pucat)
    const outlineColor = locked ? C.M : C.K;
    pxRect(ctx, b.x, b.y, b.w, PX, outlineColor);
    pxRect(ctx, b.x, b.y + b.h - PX, b.w, PX, outlineColor);
    pxRect(ctx, b.x, b.y, PX, b.h, outlineColor);
    pxRect(ctx, b.x + b.w - PX, b.y, PX, b.h, outlineColor);
    if (!active && !locked) {
      pxRect(ctx, b.x + PX, b.y + PX, b.w - PX*2, PX, C.L);
    }
    // Label
    ctx.fillStyle = locked ? C.M : (active ? C.W : C.K);
    const fontSize = b.isInstall ? 12 : (b.small ? 22 : 24);
    ctx.font = "bold " + fontSize + "px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    const ty = b.y + b.h/2 + fontSize/2 - 4;
    ctx.fillText(b.label, b.x + b.w/2, ty);
    // Lock indicator: gembok kecil di pojok kanan-atas button
    if (locked) {
      const lx = b.x + b.w - 12, ly = b.y + 4;
      pxRect(ctx, lx,        ly + PX*2, PX*4, PX*3, C.K);   // body gembok
      pxRect(ctx, lx + PX,    ly,        PX*2, PX*2, C.K);   // shackle top
      pxRect(ctx, lx,         ly + PX,   PX,   PX,   C.K);   // shackle kiri
      pxRect(ctx, lx + PX*3,  ly + PX,   PX,   PX,   C.K);   // shackle kanan
    }
    // Blinking arrow untuk PLAY saat di-highlight (skip kalau locked)
    if (blink && active && !locked) {
      ctx.fillStyle = C.W;
      ctx.fillText("\u25B6", b.x - 20, ty);
      ctx.fillText("\u25C0", b.x + b.w + 20, ty);
    }
  }

  drawBigEgg(cx, cy) {
    const { ctx } = this;
    // Gambar egg sprite pada 3x ukuran normal (efek "big hero" di title)
    const SCALE = 3;
    const sprite = EGG_SPRITE.idle;
    const rows = sprite.length;
    const cols = sprite[0].length;
    const sw = cols * PX * SCALE;
    const sh = rows * PX * SCALE;
    const sx = cx - sw/2;
    const sy = cy - sh/2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = sprite[r][c];
        if (ch === '.' || ch === ' ') continue;
        const color = PAL[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(
          sp(sx + c * PX * SCALE),
          sp(sy + r * PX * SCALE),
          PX * SCALE, PX * SCALE
        );
      }
    }
    // Shadow oval di bawah egg besar
    pxRect(ctx, cx - sw * 0.3, cy + sh/2 + PX*3, sw * 0.6, PX*2, C.L);
  }

  // Check if canvas-space point hits a home button (skip locked buttons)
  hitHomeButton(x, y) {
    for (const b of this.homeBtns) {
      if (b.locked) continue;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  // Check if point hits a draggable thing (box atau door teleport). Return obj or null.
  hitBox(x, y) {
    // Cek door teleport dulu (di atas)
    const door = this.level && this.level.doorOut;
    if (door && door.teleport) {
      if (x >= door.x && x <= door.x + door.w &&
          y >= door.y && y <= door.y + door.h) return door;
    }
    for (const box of this.boxes) {
      if (x >= box.x && x <= box.x + box.w &&
          y >= box.y && y <= box.y + box.h) return box;
    }
    return null;
  }

  // ----- Shield drawing (level 13) API untuk main.js -----
  // Drawing mode aktif saat level punya shield DAN game sedang pause.
  isShieldDrawingMode() {
    return !!(this.shield && this.paused && this.mode !== "home");
  }
  shieldBeginStroke(x, y) { if (this.shield) return this.shield.beginStroke(x, y); return false; }
  shieldAddPoint(x, y)    { if (this.shield) this.shield.addPoint(x, y); }
  shieldEndStroke()       { if (this.shield) this.shield.endStroke(); }
  shieldClear()           { if (this.shield) this.shield.clear(); }

  // Pindahkan box/door ke posisi target dengan resolusi collision
  dragBoxTo(box, targetX, targetY) {
    const a = this.level.bounds;
    // Clamp ke arena
    targetX = clamp(targetX, a.x, a.x + a.w - box.w);
    targetY = clamp(targetY, a.y, a.y + a.h - box.h);
    // Cek collision dengan platform & box lain - kalau overlap, dorong keluar (pakai axis terkecil)
    box.x = targetX; box.y = targetY;
    const obstacles = [
      ...this.level.platforms,
      ...this.boxes.filter(b => b !== box).map(b => b.rect())
    ];
    for (let iter = 0; iter < 4; iter++) {
      let collided = false;
      for (const p of obstacles) {
        if (!rectsOverlap(box.rect(), p)) continue;
        collided = true;
        const overlapL = (box.x + box.w) - p.x;
        const overlapR = (p.x + p.w) - box.x;
        const overlapT = (box.y + box.h) - p.y;
        const overlapB = (p.y + p.h) - box.y;
        const m = Math.min(overlapL, overlapR, overlapT, overlapB);
        if (m === overlapT) box.y = p.y - box.h;
        else if (m === overlapB) box.y = p.y + p.h;
        else if (m === overlapL) box.x = p.x - box.w;
        else box.x = p.x + p.w;
      }
      if (!collided) break;
    }
    box.vx = 0; box.vy = 0;
  }

  drawEggWings(e, bob) {
    const { ctx } = this;
    const flap = Math.round(Math.sin(this.timeMs * 0.02) * 1) * PX;
    const wingY = e.y + e.h/2 + bob - PX;
    // left wing
    pxRect(ctx, e.x - 9, wingY + flap, PX*2, PX, C.W);
    pxRect(ctx, e.x - 12, wingY + flap + PX, PX*2, PX, C.W);
    pxRect(ctx, e.x - 9, wingY + flap + PX*2, PX*2, PX, C.W);
    // outline
    pxRect(ctx, e.x - 12, wingY + flap, PX, PX, C.K);
    pxRect(ctx, e.x - 15, wingY + flap + PX, PX, PX, C.K);
    pxRect(ctx, e.x - 12, wingY + flap + PX*2, PX, PX, C.K);
    // right wing (mirror)
    pxRect(ctx, e.x + e.w + 3, wingY + flap, PX*2, PX, C.W);
    pxRect(ctx, e.x + e.w + 6, wingY + flap + PX, PX*2, PX, C.W);
    pxRect(ctx, e.x + e.w + 3, wingY + flap + PX*2, PX*2, PX, C.W);
    pxRect(ctx, e.x + e.w + 9, wingY + flap, PX, PX, C.K);
    pxRect(ctx, e.x + e.w + 12, wingY + flap + PX, PX, PX, C.K);
    pxRect(ctx, e.x + e.w + 9, wingY + flap + PX*2, PX, PX, C.K);
  }
}
