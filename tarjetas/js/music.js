// Música de fondo generada en el navegador con Web Audio.
// Son composiciones originales (progresiones de acordes y melodías generadas
// por la app), así que no dependen de canciones con derechos de autor.

export const MUSIC_STYLES = {
  fiesta: '🎉 Fiesta alegre',
  romantica: '💞 Piano romántico',
  navidad: '🔔 Campanas navideñas',
  epica: '🎓 Épica / logro',
  cajita: '🧸 Cajita musical',
  lofi: '☕ Suave y relajada',
};

// Estilo sugerido para cada ocasión.
export const MUSIC_BY_OCCASION = {
  cumple: 'fiesta', invitacion: 'fiesta', boda: 'romantica', grado: 'epica', felicitacion: 'fiesta',
  aniversario: 'romantica', babyshower: 'cajita', nacimiento: 'cajita', xv: 'romantica', bautizo: 'cajita',
  navidad: 'navidad', anonuevo: 'fiesta', madre: 'romantica', padre: 'lofi', amor: 'romantica',
  gracias: 'lofi', recuperacion: 'lofi',
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rnd(i, k) { const x = Math.sin(i * 91.7 + k * 47.3 + 3.1) * 43758.5453; return x - Math.floor(x); }

// ---------- instrumentos ----------
function voices(ac, out) {
  let noise = null;
  const noiseBuf = () => {
    if (!noise) {
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noise;
  };
  const envGain = (t, vol, attack, decay) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(out);
    return g;
  };
  const osc = (type, freq, t, end, dest, detune = 0) => {
    const o = ac.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end);
    return o;
  };
  const lowpass = (freq, dest, q = 0.7) => {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    f.connect(dest);
    return f;
  };
  const noiseHit = (t, vol, type, freq, decay) => {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf();
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = envGain(t, vol, 0.002, decay);
    s.connect(f); f.connect(g);
    s.start(t); s.stop(t + decay + 0.05);
  };
  return {
    pluck(t, m, vol = 0.12, decay = 0.35) {
      const g = envGain(t, vol, 0.004, decay);
      const f = lowpass(2600, g);
      osc('triangle', mtof(m), t, t + decay + 0.05, f);
      osc('square', mtof(m), t, t + decay + 0.05, lowpass(1400, g), 7);
    },
    piano(t, m, vol = 0.15, decay = 1.6) {
      const g = envGain(t, vol, 0.006, decay);
      osc('sine', mtof(m), t, t + decay + 0.05, g);
      const g2 = envGain(t, vol * 0.25, 0.004, decay * 0.5);
      osc('triangle', mtof(m) * 2, t, t + decay + 0.05, g2);
    },
    bell(t, m, vol = 0.1, decay = 2.2) {
      const f = mtof(m);
      osc('sine', f, t, t + decay + 0.05, envGain(t, vol, 0.002, decay));
      osc('sine', f * 2.76, t, t + decay * 0.6, envGain(t, vol * 0.3, 0.002, decay * 0.5));
      osc('sine', f * 5.4, t, t + decay * 0.3, envGain(t, vol * 0.12, 0.002, decay * 0.25));
    },
    pad(t, notes, dur, vol = 0.05, cutoff = 1100) {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.3));
      g.gain.setValueAtTime(vol, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
      g.connect(out);
      const f = lowpass(cutoff, g);
      notes.forEach((m) => {
        osc('sawtooth', mtof(m), t, t + dur + 0.5, f, -7);
        osc('sawtooth', mtof(m), t, t + dur + 0.5, f, 7);
      });
    },
    brass(t, m, dur, vol = 0.07) {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.06);
      g.gain.setValueAtTime(vol * 0.8, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
      g.connect(out);
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(500, t);
      f.frequency.linearRampToValueAtTime(2400, t + 0.08);
      f.frequency.linearRampToValueAtTime(1200, t + dur);
      f.connect(g);
      osc('sawtooth', mtof(m), t, t + dur + 0.3, f);
      osc('sawtooth', mtof(m), t, t + dur + 0.3, f, 9);
    },
    bass(t, m, dur, vol = 0.22, type = 'triangle') {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g.connect(out);
      osc(type, mtof(m), t, t + dur + 0.05, lowpass(700, g));
    },
    kick(t, vol = 0.5, low = 45) {
      const g = envGain(t, vol, 0.002, 0.32);
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(low, t + 0.12);
      o.connect(g); o.start(t); o.stop(t + 0.4);
    },
    snare(t, vol = 0.15) {
      noiseHit(t, vol, 'bandpass', 1800, 0.16);
      osc('triangle', 190, t, t + 0.1, envGain(t, vol * 0.6, 0.002, 0.08));
    },
    hat(t, vol = 0.04, decay = 0.05) { noiseHit(t, vol, 'highpass', 7500, decay); },
    shaker(t, vol = 0.04) { noiseHit(t, vol, 'highpass', 9500, 0.09); },
  };
}

// ---------- estilos ----------
// Cada acorde: [bajo, ...notas]. step(V, i, t, sd): i = semicorchea global, sd = duración de semicorchea.
const chord = (st, i) => st.chords[Math.floor(i / 16) % st.chords.length];
function melody(st, i, oct) {
  const c = chord(st, i), bar = Math.floor(i / 16) % 8, s = i % 16;
  const tones = c.slice(1);
  return tones[Math.floor(rnd(bar, s) * tones.length)] + oct;
}

const STYLES = {
  fiesta: {
    bpm: 120,
    chords: [[36, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]],
    step(V, i, t, sd) {
      const s = i % 16, c = chord(this, i), bar = Math.floor(i / 16) % 8;
      if (s % 4 === 0) V.kick(t, 0.45);
      if (s % 4 === 2) { V.hat(t, 0.05, 0.09); V.bass(t, c[0] + 12, sd * 1.8, 0.18); }
      if (s === 4 || s === 12) V.snare(t, 0.13);
      if (s === 0) V.bass(t, c[0], sd * 1.8, 0.2);
      if (s % 2 === 0) V.pluck(t, c[1 + ((s / 2) % 3)] + 12, 0.05, 0.22);
      if ([0, 3, 6, 8, 10, 12, 14].includes(s) && rnd(bar, s + 40) > 0.3) V.pluck(t, melody(this, i, 12), 0.1, 0.3);
    },
  },
  romantica: {
    bpm: 70,
    chords: [[41, 65, 69, 72], [45, 64, 69, 72], [38, 62, 65, 69], [46, 62, 65, 70]],
    step(V, i, t, sd) {
      const s = i % 16, c = chord(this, i), bar = Math.floor(i / 16) % 8;
      if (s === 0) { V.piano(t, c[0], 0.16, 3); V.pad(t, c.slice(1).map((m) => m - 12), sd * 16, 0.025, 800); }
      if (s % 2 === 0) {
        const arp = [c[1] - 12, c[2] - 12, c[3] - 12, c[2], c[3], c[2], c[3] - 12, c[2] - 12];
        V.piano(t, arp[(s / 2) % 8], 0.07, 1.4);
      }
      if ([0, 6, 8, 12].includes(s) && rnd(bar, s) > 0.25) V.piano(t, melody(this, i, 12), 0.13, 2);
    },
  },
  navidad: {
    bpm: 104,
    chords: [[43, 67, 71, 74], [40, 64, 67, 71], [36, 64, 67, 72], [38, 66, 69, 74]],
    step(V, i, t, sd) {
      const s = i % 16, c = chord(this, i), bar = Math.floor(i / 16) % 8;
      if (s % 2 === 0) V.shaker(t, s % 4 === 0 ? 0.045 : 0.03);
      if (s % 4 === 0) V.pluck(t, s % 8 === 0 ? c[0] : c[0] + 7, 0.14, 0.25);
      if (s === 4 || s === 12) c.slice(1).forEach((m) => V.pluck(t, m - 12, 0.035, 0.2));
      if (s === 0) V.pad(t, c.slice(1).map((m) => m - 12), sd * 16, 0.02, 900);
      if (s % 4 === 0 && rnd(bar, s) > 0.15) V.bell(t, melody(this, i, 12), 0.08, 1.6);
      if (s === 14 && rnd(bar, 99) > 0.5) V.bell(t, melody(this, i, 12), 0.05, 1.2);
    },
  },
  epica: {
    bpm: 88,
    chords: [[45, 57, 60, 64], [41, 57, 60, 65], [36, 55, 60, 64], [43, 55, 59, 62]],
    step(V, i, t, sd) {
      const s = i % 16, c = chord(this, i), bar = Math.floor(i / 16) % 8;
      if (s === 0) { V.pad(t, c.slice(1), sd * 16, 0.04, 1300); V.bass(t, c[0] - 12, sd * 15, 0.22, 'sawtooth'); }
      if (s === 0 || s === 8) V.kick(t, 0.55, 38);
      if (s === 12 || s === 14) V.kick(t, 0.25, 50);
      if (s % 2 === 0) V.pluck(t, c[1 + ((s / 2) % 3)] + 12, 0.035, 0.18);
      if ([0, 4, 8, 10, 12].includes(s) && rnd(bar, s) > 0.3) V.brass(t, melody(this, i, 0), sd * 3, 0.06);
    },
  },
  cajita: {
    bpm: 80,
    chords: [[38, 62, 66, 69], [35, 62, 66, 71], [43, 62, 67, 71], [45, 61, 64, 69]],
    step(V, i, t, sd) {
      const s = i % 16, c = chord(this, i), bar = Math.floor(i / 16) % 8;
      if (s === 0) V.bass(t, c[0] + 12, sd * 14, 0.12, 'sine');
      if (s % 2 === 0) {
        const arp = [c[1], c[2], c[3], c[2] + 12, c[3], c[2], c[1] + 12, c[3]];
        V.bell(t, arp[(s / 2) % 8] + 12, 0.045, 1.1);
      }
      if (s % 4 === 0 && rnd(bar, s) > 0.2) V.bell(t, melody(this, i, 24), 0.07, 1.4);
    },
  },
  lofi: {
    bpm: 76,
    chords: [[38, 62, 65, 69, 72], [43, 59, 62, 65, 71], [36, 59, 64, 67, 71], [45, 60, 64, 67, 72]],
    step(V, i, t, sd) {
      const s = i % 16, c = chord(this, i), bar = Math.floor(i / 16) % 8;
      const sw = s % 2 ? sd * 0.18 : 0; // swing
      if (s === 0 || s === 10) c.slice(1).forEach((m) => V.piano(t, m - 12, 0.05, 2.2));
      if (s === 0 || s === 7 || s === 10) V.kick(t + sw, 0.35);
      if (s === 4 || s === 12) V.snare(t, 0.07);
      if (s % 2 === 0) V.hat(t + sw, 0.02);
      if (s === 0) V.bass(t, c[0], sd * 7, 0.2, 'sine');
      if (s === 10) V.bass(t, c[0] + 7, sd * 5, 0.16, 'sine');
      if ([2, 6, 9, 14].includes(s) && rnd(bar, s) > 0.45) V.piano(t + sw, melody(this, i, 12), 0.08, 1.4);
    },
  },
};

// Reproductor con programación anticipada: arranca en cualquier segundo (offset).
export class SynthPlayer {
  constructor(ac, out) { this.ac = ac; this.out = out; this.timer = null; this.bus = null; }
  start(style, offset = 0) {
    this.stop();
    const st = STYLES[style];
    if (!st) return;
    const ac = this.ac;
    const bus = ac.createGain();
    bus.gain.value = 1.6;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    bus.connect(comp); comp.connect(this.out);
    this.bus = bus; this.comp = comp;
    const V = voices(ac, bus);
    const sd = 60 / st.bpm / 4;
    const t0 = ac.currentTime + 0.06 - offset;
    let i = Math.max(0, Math.ceil(offset / sd - 1e-6));
    const tick = () => {
      const until = ac.currentTime + 0.3;
      while (t0 + i * sd < until) { st.step.call(st, V, i, t0 + i * sd, sd); i++; }
    };
    tick();
    this.timer = setInterval(tick, 70);
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.bus) {
      const bus = this.bus, comp = this.comp;
      bus.gain.setTargetAtTime(0, this.ac.currentTime, 0.03);
      setTimeout(() => { bus.disconnect(); comp.disconnect(); }, 400);
      this.bus = null;
    }
  }
}
