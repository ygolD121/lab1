// Sounds are synthesized with WebAudio, except the gunshot, which plays assets/gunshot.wav.
let ctx = null, master = null, noise = null, volume = 0.7, shotSample = null, moveSample = null, shoutSamples = [], shoutSrc = null;

// Same version as the code's own URL, so a new build also re-downloads the sound files.
const BUILD = new URL(import.meta.url).searchParams.get('v') || 'dev';

async function loadSample(url) {
  try {
    const data = await (await fetch(url)).arrayBuffer();
    return await ctx.decodeAudioData(data);
  } catch {
    return null; // keep using the synthesized shot
  }
}

function out(vol, pan = 0) {
  const g = ctx.createGain();
  g.gain.value = vol;
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(master);
  } else g.connect(master);
  return g;
}

function noiseBurst(dest, t, dur, { type = 'lowpass', from = 4000, to = 300, q = 0.7, gain = 1 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

function tone(dest, t, freq, dur, { type = 'sine', to = freq, gain = 0.5, attack = 0.002 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to !== freq) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const audio = {
  init() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loadSample(`assets/gunshot.wav?v=${BUILD}`).then((b) => { shotSample = b; });
    loadSample(`assets/move.wav?v=${BUILD}`).then((b) => { moveSample = b; });
    ['shout1', 'shout2', 'shout3', 'shout4'].forEach((name, i) => loadSample(`assets/${name}.wav?v=${BUILD}`).then((b) => { shoutSamples[i] = b; }));
  },
  setVolume(v) {
    volume = v;
    if (master) master.gain.value = v;
  },
  get ready() { return !!ctx; },

  // freq/len/gain shape each weapon: low and long for the AWP, short and bright for the MP5.
  // The player's guns play the recorded shot; bots (recorded = false) get the synthesized one.
  // suppressed: the player's M4 with the suppressor on, which fires without a gunshot sound.
  gunshot(vol = 1, pan = 0, distant = 0, { freq = 170, len = 0.16, gain = 0.9 } = {}, recorded = false, suppressed = false) {
    if (!ctx || suppressed) return;
    const t = ctx.currentTime, o = out(vol, pan);
    if (recorded && shotSample) {
      // Distance muffles the recorded shot and adds a little echo.
      const src = ctx.createBufferSource();
      src.buffer = shotSample;
      src.playbackRate.value = 0.96 + Math.random() * 0.08;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 18000 - distant * 16500;
      const g = ctx.createGain();
      g.gain.value = 1.6;
      src.connect(f).connect(g).connect(o);
      src.start(t);
      if (distant > 0.3) noiseBurst(o, t + 0.08, 0.5, { from: 900, to: 120, gain: 0.25 });
      return;
    }
    noiseBurst(o, t, len + distant * 0.25, { from: 7000 - distant * 5000, to: 350, gain: 1 });
    noiseBurst(o, t, 0.05, { type: 'highpass', from: 3000, to: 2000, gain: 0.6 * (1 - distant) });
    tone(o, t, freq, len * 0.9, { to: freq * 0.26, gain });
    if (distant > 0.3) noiseBurst(o, t + 0.08, 0.5, { from: 900, to: 120, gain: 0.25 });
  },
  // Voice clip nagging the player to get moving; returns its length so it isn't replayed over itself.
  moveClip() {
    if (!ctx || !moveSample) return 0;
    const src = ctx.createBufferSource();
    src.buffer = moveSample;
    src.connect(out(1.1));
    src.start();
    return moveSample.duration;
  },
  // Shout clip (0–3 = shout1–shout4). A new shout cuts off the previous one so quick kills don't pile up.
  shout(which) {
    const sample = shoutSamples[which];
    if (!ctx || !sample) return;
    if (shoutSrc) shoutSrc.stop();
    shoutSrc = ctx.createBufferSource();
    shoutSrc.buffer = sample;
    shoutSrc.connect(out(1.1));
    shoutSrc.start();
  },
  dryFire() {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.4);
    noiseBurst(o, t, 0.03, { type: 'bandpass', from: 2500, to: 2000, q: 3 });
  },
  reload(duration) {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.5);
    const click = (at, f, g = 1) => noiseBurst(o, t + at, 0.05, { type: 'bandpass', from: f, to: f * 0.7, q: 4, gain: g });
    click(duration * 0.18, 1800);
    click(duration * 0.55, 1300, 1.2);
    click(duration * 0.6, 2200, 0.7);
    click(duration * 0.8, 2600);
    click(duration * 0.86, 1600, 1.3);
  },
  hit(head) {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.45);
    if (head) {
      tone(o, t, 1900, 0.45, { gain: 0.35 });
      tone(o, t, 2850, 0.3, { gain: 0.15 });
    } else {
      tone(o, t, 1100, 0.06, { type: 'triangle', gain: 0.4 });
    }
  },
  hurt() {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.7);
    tone(o, t, 120, 0.18, { to: 50, gain: 0.8 });
    noiseBurst(o, t, 0.12, { from: 900, to: 200, gain: 0.5 });
  },
  step(vol = 0.25, pan = 0) {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(vol, pan);
    noiseBurst(o, t, 0.07, { from: 700 + Math.random() * 300, to: 150, gain: 0.8 });
    noiseBurst(o, t + 0.01, 0.04, { type: 'highpass', from: 4000, to: 3000, gain: 0.15 });
  },
  land() {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.4);
    noiseBurst(o, t, 0.12, { from: 500, to: 80, gain: 1 });
  },
  beep(vol = 0.35, pan = 0) {
    if (!ctx) return;
    const o = out(vol, pan);
    tone(o, ctx.currentTime, 2600, 0.09, { type: 'square', gain: 0.18 });
  },
  key() {
    if (!ctx) return;
    const o = out(0.25);
    tone(o, ctx.currentTime, 1200 + Math.random() * 600, 0.07, { type: 'square', gain: 0.15 });
  },
  armed() {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.4);
    tone(o, t, 1500, 0.12, { type: 'square', gain: 0.18 });
    tone(o, t + 0.15, 2200, 0.2, { type: 'square', gain: 0.18 });
  },
  defusing(vol = 0.3, pan = 0) {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(vol, pan);
    noiseBurst(o, t, 0.25, { type: 'bandpass', from: 3500, to: 2500, q: 6, gain: 0.6 });
  },
  explosion(vol = 1) {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(vol);
    noiseBurst(o, t, 2.8, { from: 2500, to: 40, gain: 1.4 });
    tone(o, t, 70, 1.6, { to: 25, gain: 1 });
    noiseBurst(o, t + 0.3, 2, { from: 400, to: 60, gain: 0.5 });
  },
  whiz(pan = 0) {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.25, pan);
    noiseBurst(o, t, 0.12, { type: 'bandpass', from: 5000, to: 1500, q: 5, gain: 0.8 });
  },
  jingle(win) {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.3);
    const notes = win ? [392, 494, 587, 784] : [392, 370, 311, 262];
    notes.forEach((f, i) => tone(o, t + i * 0.13, f, 0.35, { type: 'triangle', gain: 0.4 }));
  },
  buy() {
    if (!ctx) return;
    const t = ctx.currentTime, o = out(0.3);
    tone(o, t, 1320, 0.08, { type: 'triangle', gain: 0.4 });
    tone(o, t + 0.07, 1760, 0.14, { type: 'triangle', gain: 0.4 });
  },
  ui() {
    if (!ctx) return;
    tone(out(0.2), ctx.currentTime, 900, 0.05, { type: 'triangle', gain: 0.4 });
  },
};
