/**
 * 音效：載入 `assets/audio/*.ogg`（背景 loop ＋ 動作音）。
 */

const SFX = ["click", "page", "cloth", "open", "gift", "error", "step", "heart", "ending", "rest"];

export class TownshipAudio {
  constructor(base = "assets/audio") {
    this.base = base;
    this.ctx = null;
    this.enabled = true;
    this.vol = 0.55;
    this.cache = new Map();
    this.bgmBuf = null;
    this.bgmPending = null;
    this.bgmSrc = null;
    this.bgmGain = null;
    this.last = new Map();
    this.suspended = false;
  }

  ensure() {
    if (this.ctx) return;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (AC) this.ctx = new AC();
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.bgmGain) this.bgmGain.gain.value = on && !this.suspended ? this.vol * 0.28 : 0;
  }

  suspend() {
    this.suspended = true;
    if (this.bgmGain) this.bgmGain.gain.value = 0;
  }

  resume() {
    this.suspended = false;
    if (this.bgmGain) this.bgmGain.gain.value = this.enabled ? this.vol * 0.28 : 0;
  }

  load(name) {
    if (!this.cache.has(name)) this.cache.set(name, this.fetchSfx(name));
    return this.cache.get(name);
  }

  async fetchSfx(name) {
    this.ensure();
    if (!this.ctx) return null;
    try {
      const res = await fetch(`${this.base}/${name}.ogg`);
      if (!res.ok) throw new Error(`fetch ${name} ${res.status}`);
      const bytes = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(bytes);
    } catch {
      return null;
    }
  }

  async preload() {
    await Promise.all([...SFX.map((name) => this.load(name)), this.loadBgm()]);
  }

  async play(name, gain = 1) {
    if (!this.enabled || !name || this.suspended) return;
    const now = Date.now();
    if (now - (this.last.get(name) ?? 0) < 60) return;
    this.last.set(name, now);
    const buf = await this.load(name);
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const node = this.ctx.createGain();
    node.gain.value = this.vol * gain;
    src.connect(node).connect(this.ctx.destination);
    src.start();
  }

  loadBgm() {
    this.bgmPending ??= this.fetchBgm();
    return this.bgmPending;
  }

  async fetchBgm() {
    if (this.bgmBuf) return this.bgmBuf;
    this.ensure();
    if (!this.ctx) return null;
    try {
      const res = await fetch(`${this.base}/music.ogg`);
      if (!res.ok) throw new Error(`fetch music ${res.status}`);
      const bytes = await res.arrayBuffer();
      this.bgmBuf = await this.ctx.decodeAudioData(bytes);
      return this.bgmBuf;
    } catch {
      return null;
    }
  }

  async playBgm() {
    const buf = await this.loadBgm();
    if (!buf || !this.ctx || this.bgmSrc) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const node = this.ctx.createGain();
    node.gain.value = this.enabled && !this.suspended ? this.vol * 0.28 : 0;
    src.connect(node).connect(this.ctx.destination);
    src.start();
    this.bgmSrc = src;
    this.bgmGain = node;
  }

  stopBgm() {
    if (!this.bgmSrc) return;
    try {
      this.bgmSrc.stop();
    } catch {
      /* ignore */
    }
    this.bgmSrc = null;
    this.bgmGain = null;
  }
}
