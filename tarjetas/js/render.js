// Motor de render: dibuja un fotograma de la tarjeta en el instante t (segundos).
// Todo es determinista (depende solo de t y del estado), así se puede adelantar
// o retroceder la vista previa y grabar el video con el mismo resultado.
import { BACKGROUNDS, FONTS } from './data.js?v=20261122';

const TAU = Math.PI * 2;
const OVERLAP = 0.45; // segundos de fundido cruzado entre escenas
export const VIDEO_DELAY = 0.3; // el clip empieza a sonar/moverse este tiempo después de iniciar su escena
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (lt, a, b) => clamp((lt - a) / (b - a));
const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
// Pseudoaleatorio estable: mismo (i, k) → mismo valor en [0, 1).
function rnd(i, k) { const x = Math.sin(i * 127.1 + k * 311.7 + 17.13) * 43758.5453; return x - Math.floor(x); }

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const CONFETTI = ['#ff4d6d', '#ffd60a', '#4cc9f0', '#80ed99', '#c77dff', '#ff9f1c', '#ffffff'];
const GOLD = ['#f5c542', '#ffe08a', '#d4a017', '#fff4c2'];
const FIREWORK = ['#ff4d6d', '#ffd60a', '#4cc9f0', '#80ed99', '#c77dff', '#ff9f1c', '#ffffff', '#ff70a6'];
const MIX = ['polaroid', 'kenburns', 'deslizar', 'zoom', 'giro', 'revelado'];
const SCRIPT_FONTS = new Set(['greatvibes', 'dancing', 'pacifico', 'lobster']);

// ---------- colores ----------
function hexToRgb(hex) {
  let h = (hex || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function palette(s) {
  let base;
  if (s.bg === 'custom') {
    const [a, b] = s.customColors;
    const mid = mix(a, b, 0.5);
    const lightBg = luminance(mid) > 0.45;
    base = { colors: [a, mid, b], text: lightBg ? '#2b2b2b' : '#ffffff', accent: lightBg ? '#7a4b00' : '#ffe08a' };
  } else if (s.bg === 'image') {
    base = { colors: ['#222', '#333', '#111'], text: '#ffffff', accent: '#ffd166' };
  } else {
    base = BACKGROUNDS[s.bg] || BACKGROUNDS.fiesta;
  }
  const text = s.textAuto ? base.text : s.textColor;
  const accent = s.textAuto ? base.accent : s.accentColor;
  return { colors: base.colors, text, accent, textLight: luminance(text) > 0.5 };
}

// ---------- texto ----------
const fitCache = new Map();
export function clearFitCache() { fitCache.clear(); }
const fontCss = (key, size) => { const f = FONTS[key] || FONTS.montserrat; return `${f.weight} ${size}px ${f.css}`; };

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = line + ' ' + words[i];
      if (ctx.measureText(test).width <= maxW) line = test; else { out.push(line); line = words[i]; }
    }
    out.push(line);
  }
  return out;
}

// Busca el tamaño de letra más grande con el que el texto cabe en maxW × maxH.
function fitText(ctx, text, key, maxW, maxH, maxSize, minSize, lh = 1.25) {
  const id = [text, key, maxW | 0, maxH | 0, maxSize | 0, minSize | 0, lh].join('|');
  let r = fitCache.get(id);
  if (r) return r;
  let size = maxSize, lines;
  for (;;) {
    ctx.font = fontCss(key, size);
    lines = wrap(ctx, text, maxW);
    const widths = lines.map((l) => ctx.measureText(l).width);
    if ((lines.length * size * lh <= maxH && Math.max(0, ...widths) <= maxW) || size <= minSize) { r = { size, lines, widths, lh, key }; break; }
    size = Math.max(minSize, size * 0.93);
  }
  if (fitCache.size > 400) fitCache.clear();
  fitCache.set(id, r);
  return r;
}
const blockH = (f) => f.lines.length * f.size * f.lh;

function textShadow(env, size) {
  const { ctx, pal } = env;
  ctx.shadowColor = pal.textLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.03;
}
function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

// Dibuja un bloque ajustado, centrado en cx, empezando en top.
// lineFx(i) → {a: alfa, dy: desplazamiento, chars: caracteres visibles}
function drawBlock(env, f, cx, top, color, lineFx) {
  const { ctx } = env;
  const A = ctx.globalAlpha;
  ctx.font = fontCss(f.key, f.size);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  textShadow(env, f.size);
  f.lines.forEach((line, i) => {
    const fx = lineFx ? lineFx(i) : null;
    const a = fx ? fx.a : 1;
    if (a <= 0) return;
    ctx.globalAlpha = A * a;
    const txt = fx && fx.chars != null ? line.slice(0, fx.chars) : line;
    const y = top + (i + 0.5) * f.size * f.lh + (fx ? fx.dy || 0 : 0);
    ctx.fillText(txt, cx - f.widths[i] / 2, y);
  });
  ctx.globalAlpha = A;
  noShadow(ctx);
}

function drawEmoji(ctx, emoji, x, y, size) {
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- formatos de fecha ----------
export function formatDate(v) {
  if (!v) return '';
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return v;
  const s = new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function formatTime(v) {
  if (!v) return '';
  const [h, mi] = v.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, mi || 0);
  return d.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ---------- línea de tiempo ----------
export function hasDetails(s) { return !!(s.date || s.time || s.place || s.note); }

export function buildTimeline(s) {
  const k = s.speed || 1;
  const list = [];
  const add = (type, dur, extra = {}) => list.push({ type, dur: dur * k, ...extra });
  add('intro', 3.6);
  // Los videos duran lo que dure el clip (más la entrada y la salida), sin importar el ritmo.
  s.photos.forEach((ph, i) => {
    if (ph.kind === 'video') list.push({ type: 'photo', i, dur: Math.max(3.3 * k, VIDEO_DELAY + ph.clip + 0.8) });
    else add('photo', 3.3, { i });
  });
  const words = (s.message || '').trim().split(/\s+/).filter(Boolean).length;
  if (words) add('message', clamp(2.8 + words * 0.3, 4.5, 10));
  if (s.showDetails && hasDetails(s)) add('details', 4.8);
  add('outro', 4.6);
  let t = 0;
  list.forEach((sc, i) => { sc.start = t; t += sc.dur - (i < list.length - 1 ? OVERLAP : 0); });
  return { scenes: list, total: t };
}

// ---------- fotograma ----------
export function renderFrame(ctx, W, H, t, s, tl) {
  const pal = palette(s);
  const env = { ctx, W, H, u: Math.min(W, H) / 100, t, s, pal, portrait: H > W * 1.05 };
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  noShadow(ctx);
  drawBackground(env);
  drawPattern(env);
  const n = tl.scenes.length;
  tl.scenes.forEach((sc, idx) => {
    const lt = t - sc.start;
    if (lt < 0 || lt > sc.dur) return;
    const fin = idx === 0 ? seg(lt, 0, 0.6) : seg(lt, 0, OVERLAP);
    const fout = idx === n - 1 ? 1 : 1 - seg(lt, sc.dur - OVERLAP, sc.dur);
    const a = fin * fout;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    SCENES[sc.type](env, sc, lt);
    ctx.restore();
  });
  drawParticles(env);
  ctx.restore();
}

// ---------- fondo ----------
function drawBackground(env) {
  const { ctx, W, H, t, s, pal, u } = env;
  if (s.bg === 'image' && s.bgImage) {
    const img = s.bgImage;
    const sc = Math.max(W / img.width, H / img.height) * (1.07 + 0.04 * Math.sin(t * 0.25));
    const w = img.width * sc, h = img.height * sc;
    ctx.drawImage(img, (W - w) / 2 + Math.sin(t * 0.17) * u * 1.5, (H - h) / 2, w, h);
    ctx.fillStyle = `rgba(0,0,0,${s.bgDim})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    const c = pal.colors;
    const ang = t * 0.12 + 0.6, R = Math.hypot(W, H) / 2;
    const dx = Math.cos(ang) * R, dy = Math.sin(ang) * R;
    const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
    c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const gx = W * (0.5 + 0.35 * Math.sin(t * 0.31)), gy = H * (0.4 + 0.25 * Math.cos(t * 0.23));
    const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.6);
    rg.addColorStop(0, 'rgba(255,255,255,0.22)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${pal.textLight ? 0.35 : 0.1})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawPattern(env) {
  const { ctx, W, H, t, u, pal, s } = env;
  const p = s.pattern;
  if (!p || p === 'none') return;
  ctx.save();
  if (p === 'bokeh') {
    for (let i = 0; i < 16; i++) {
      const x = rnd(i, 1) * W + Math.sin(t * 0.2 + i) * u * 4;
      const y = rnd(i, 2) * H + Math.cos(t * 0.17 + i * 1.3) * u * 4;
      const r = u * (5 + rnd(i, 3) * 12);
      const a = (0.07 + 0.11 * rnd(i, 4)) * (0.6 + 0.4 * Math.sin(t * 0.8 + i));
      const col = i % 3 === 0 ? pal.accent : '#ffffff';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.7, rgba(col, a * 0.6));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  } else if (p === 'rays') {
    const R = Math.hypot(W, H), n = 18;
    ctx.translate(W / 2, H * 0.42);
    ctx.rotate(t * 0.05);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, (i * TAU) / n, (i * TAU) / n + TAU / n / 2);
      ctx.closePath(); ctx.fill();
    }
  } else if (p === 'dots') {
    const step = u * 6, off = (t * u * 2) % step;
    ctx.fillStyle = rgba(pal.text, 0.12);
    ctx.beginPath();
    for (let y = -step; y < H + step; y += step)
      for (let x = -step; x < W + step; x += step) {
        ctx.moveTo(x + off + u * 0.45, y + off);
        ctx.arc(x + off, y + off, u * 0.45, 0, TAU);
      }
    ctx.fill();
  } else if (p === 'waves') {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = `rgba(255,255,255,${0.07 + k * 0.03})`;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + u * 2; x += u * 2) {
        const y = H * (0.76 + k * 0.07) + Math.sin(x / (u * (18 + k * 6)) + t * (0.8 + k * 0.3) + k) * u * (2.5 + k);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
  } else if (p === 'stripes') {
    const L = Math.hypot(W, H), step = u * 8, off = (t * u * 3) % (step * 2);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = -L - step * 2 + off; x < L; x += step * 2) ctx.fillRect(x, -L, step, L * 2);
  }
  ctx.restore();
}

// ---------- partículas ----------
// Posición vertical normalizada (-0.1 .. 1.1) para partículas que caen (dir 1) o suben (dir -1).
function flow(i, t, min, max, dir = 1) {
  let y = (rnd(i, 3) + t * lerp(min, max, rnd(i, 2))) % 1;
  if (dir < 0) y = 1 - y;
  return y * 1.2 - 0.1;
}
function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.95, -s * 0.2, -s * 0.5, -s * 0.95, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.5, -s * 0.95, s * 0.95, -s * 0.2, 0, s * 0.35);
  ctx.closePath();
}
function starPath(ctx, r, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let k = 0; k < points * 2; k++) {
    const rr = k % 2 ? r * inner : r, a = (k * Math.PI) / points - Math.PI / 2;
    k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}
function place(ctx, x, y, rot = 0, sx = 1, sy = 1) {
  const c = Math.cos(rot), s = Math.sin(rot);
  ctx.setTransform(c * sx, s * sx, -s * sy, c * sy, x, y);
}

function confetti(env, n, colors) {
  const { ctx, W, H, t, u } = env;
  for (let i = 0; i < n; i++) {
    const y = flow(i, t, 0.1, 0.2) * H;
    const x = rnd(i, 1) * W + Math.sin(t * (1 + rnd(i, 4)) + i) * u * 3;
    const w = u * (0.8 + rnd(i, 7) * 0.8);
    place(ctx, x, y, t * (1 + rnd(i, 5) * 3) + i, 1, Math.cos(t * (2 + rnd(i, 6) * 4) + i));
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-w / 2, -w / 4, w, w / 2);
  }
}

function drawParticles(env) {
  const { ctx, W, H, t, u, pal, s } = env;
  const type = s.particles;
  if (!type || type === 'none') return;
  ctx.save();
  switch (type) {
    case 'confeti':
      confetti(env, 70, CONFETTI);
      break;
    case 'nieve':
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 90; i++) {
        const y = flow(i, t, 0.04, 0.1) * H;
        const x = rnd(i, 1) * W + Math.sin(t * 0.8 + i) * u * 2;
        ctx.globalAlpha = 0.5 + rnd(i, 5) * 0.45;
        ctx.beginPath(); ctx.arc(x, y, u * (0.25 + rnd(i, 4) * 0.75), 0, TAU); ctx.fill();
      }
      break;
    case 'petalos': {
      const cols = ['#ffc8dd', '#ffafcc', '#fde2e4', '#ffffff'];
      for (let i = 0; i < 36; i++) {
        const y = flow(i, t, 0.06, 0.12) * H;
        const x = rnd(i, 1) * W + Math.sin(t * 0.9 + i) * u * 4;
        const rx = u * (0.9 + rnd(i, 4) * 0.6);
        place(ctx, x, y, t * (0.5 + rnd(i, 5)) + i, 1, 0.4 + 0.6 * Math.abs(Math.cos(t * 1.5 + i)));
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.ellipse(0, 0, rx, rx * 0.55, 0, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'corazones': {
      const cols = ['#ff4d6d', '#ff8fa3', '#ffb3c1', '#c9184a', '#ffffff'];
      for (let i = 0; i < 26; i++) {
        const y = flow(i, t, 0.06, 0.12, -1) * H;
        const x = rnd(i, 1) * W + Math.sin(t * 1.2 + i) * u * 2.5;
        place(ctx, x, y, Math.sin(t + i) * 0.3);
        ctx.globalAlpha = 0.55 + rnd(i, 5) * 0.35;
        ctx.fillStyle = cols[i % cols.length];
        heartPath(ctx, u * (1.4 + rnd(i, 4) * 2.2)); ctx.fill();
      }
      break;
    }
    case 'globos':
      for (let i = 0; i < 12; i++) {
        const y = flow(i, t, 0.05, 0.09, -1) * H * 1.15;
        const x = rnd(i, 1) * W + Math.sin(t * 0.7 + i) * u * 2;
        const r = u * (3 + rnd(i, 4) * 2.5);
        place(ctx, x, y, Math.sin(t * 0.9 + i) * 0.12);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = u * 0.15;
        ctx.beginPath(); ctx.moveTo(0, r);
        ctx.quadraticCurveTo(r * 0.4 * Math.sin(t * 2 + i), r * 2, 0, r * 3.2); ctx.stroke();
        ctx.fillStyle = CONFETTI[i % 6];
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.82, r, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 1.08); ctx.lineTo(r * 0.15, r * 1.08); ctx.lineTo(0, r * 0.95); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.38, r * 0.18, r * 0.3, -0.5, 0, TAU); ctx.fill();
      }
      break;
    case 'burbujas':
      ctx.lineWidth = u * 0.18;
      for (let i = 0; i < 24; i++) {
        const y = flow(i, t, 0.05, 0.1, -1) * H;
        const x = rnd(i, 1) * W + Math.sin(t * 1.1 + i) * u * 3;
        const r = u * (1 + rnd(i, 4) * 3);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, TAU); ctx.fill();
      }
      break;
    case 'estrellas':
      for (let i = 0; i < 40; i++) {
        const x = rnd(i, 1) * W;
        const y = ((rnd(i, 2) + t * 0.012 * (0.5 + rnd(i, 3))) % 1) * H;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * (1 + rnd(i, 4) * 2) + i));
        place(ctx, x, y, t * 0.3 + i, 0.7 + 0.3 * a, 0.7 + 0.3 * a);
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 3 ? '#ffffff' : pal.accent;
        starPath(ctx, u * (0.6 + rnd(i, 5) * 1.4)); ctx.fill();
      }
      break;
    case 'destellos':
      for (let i = 0; i < 30; i++) {
        const P = 1.6 + rnd(i, 1) * 1.6, q = t / P + rnd(i, 3);
        const c = Math.floor(q), f = q - c;
        const x = rnd(i * 31 + c, 1) * W, y = rnd(i * 31 + c, 2) * H;
        const sc = Math.sin(f * Math.PI);
        const col = i % 2 ? '#ffffff' : pal.accent;
        place(ctx, x, y, f * 1.5, sc, sc);
        ctx.globalAlpha = sc;
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = u * 1.2;
        starPath(ctx, u * (1 + rnd(i, 4) * 1.6), 4, 0.22); ctx.fill();
      }
      break;
    case 'fuegos':
      ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 4; b++) {
        const P = 2.4, tt = t + (b * P) / 4, c = Math.floor(tt / P), q = tt - c * P, sd = b * 97 + c;
        const x0 = W * (0.12 + 0.76 * rnd(sd, 1)), yTop = H * (0.12 + 0.3 * rnd(sd, 2));
        const col = FIREWORK[Math.floor(rnd(sd, 3) * FIREWORK.length)];
        if (q < 0.6) {
          const y = lerp(H * 1.02, yTop, ease.outCubic(q / 0.6));
          ctx.strokeStyle = rgba(col, 0.85); ctx.lineWidth = u * 0.3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0, y + u * 4); ctx.stroke();
        } else {
          const e = (q - 0.6) / (P - 0.6), r = ease.outCubic(e) * u * (14 + rnd(sd, 4) * 8), a = 1 - e;
          ctx.fillStyle = rgba(col, a); ctx.strokeStyle = rgba(col, a * 0.45); ctx.lineWidth = u * 0.2;
          for (let j = 0; j < 28; j++) {
            const an = (j / 28) * TAU, cs = Math.cos(an), sn = Math.sin(an), g = e * e * u * 6;
            const px = x0 + cs * r, py = yTop + sn * r + g;
            ctx.beginPath(); ctx.moveTo(x0 + cs * r * 0.7, yTop + sn * r * 0.7 + g); ctx.lineTo(px, py); ctx.stroke();
            ctx.beginPath(); ctx.arc(px, py, u * 0.38 * (1 - e * 0.5), 0, TAU); ctx.fill();
          }
        }
      }
      break;
    case 'birretes':
      confetti(env, 34, GOLD);
      for (let i = 0; i < 12; i++) {
        const y = flow(i + 50, t, 0.06, 0.11) * H;
        const x = rnd(i + 50, 1) * W + Math.sin(t * 0.8 + i) * u * 3;
        const sz = u * (2.2 + rnd(i, 4) * 1.5);
        place(ctx, x, y, Math.sin(t * 1.3 + i) * 0.6);
        ctx.fillStyle = '#2a2a44'; ctx.fillRect(-sz * 0.45, 0, sz * 0.9, sz * 0.42);
        ctx.fillStyle = '#16162a';
        ctx.beginPath(); ctx.moveTo(0, -sz * 0.38); ctx.lineTo(sz, 0); ctx.lineTo(0, sz * 0.38); ctx.lineTo(-sz, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#f5c542'; ctx.lineWidth = u * 0.22;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sz * 0.72, sz * 0.12); ctx.lineTo(sz * 0.72, sz * 0.62); ctx.stroke();
        ctx.fillStyle = '#f5c542'; ctx.fillRect(sz * 0.62, sz * 0.58, sz * 0.2, sz * 0.25);
      }
      break;
  }
  ctx.restore();
}

// ---------- fotos ----------
// Ancho/alto reales de una imagen, lienzo o video.
const dimW = (img) => img.videoWidth || img.width;
const dimH = (img) => img.videoHeight || img.height;
// Qué dibujar de un elemento: el cuadro actual del video (o su portada mientras carga) o la foto.
function mediaSrc(ph) {
  if (ph.kind !== 'video') return ph.img;
  return ph.img.readyState >= 2 && ph.img.videoWidth ? ph.img : ph.poster;
}

function drawCover(ctx, img, x, y, w, h, kb = 1, pan = 0) {
  const sc = Math.max(w / dimW(img), h / dimH(img)) * kb;
  const dw = dimW(img) * sc, dh = dimH(img) * sc;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2 + pan * w, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}
function frameShadow(env) {
  const { ctx, u } = env;
  ctx.shadowColor = 'rgba(0,0,0,0.38)'; ctx.shadowBlur = u * 3; ctx.shadowOffsetY = u * 1.2;
}

// Dibuja la foto enmarcada, centrada en el origen, dentro de una caja bw × bh.
function drawFramedPhoto(env, img, bw, bh, kb, pan, frame) {
  const { ctx, u } = env;
  const a = clamp(dimW(img) / dimH(img), 0.62, 1.7);
  ctx.save();
  if (frame === 'circulo') {
    const D = Math.min(bw, bh) * 0.92;
    frameShadow(env);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, D / 2 + u * 0.9, 0, TAU); ctx.fill();
    noShadow(ctx);
    ctx.beginPath(); ctx.arc(0, 0, D / 2, 0, TAU); ctx.clip();
    drawCover(ctx, img, -D / 2, -D / 2, D, D, kb, pan);
  } else if (frame === 'polaroid') {
    const x = Math.min(bw / 1.1, bh / (1 / a + 0.27));
    const iw = x, ih = x / a, pad = x * 0.05, ow = iw + pad * 2, oh = ih + pad + x * 0.22;
    const ox = -ow / 2, oy = -oh / 2;
    frameShadow(env);
    ctx.fillStyle = '#fdfdf8';
    ctx.fillRect(ox, oy, ow, oh);
    noShadow(ctx);
    drawCover(ctx, img, ox + pad, oy + pad, iw, ih, kb, pan);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
    ctx.strokeRect(ox + pad, oy + pad, iw, ih);
  } else if (frame === 'dorado') {
    const pad = u * 1.6;
    const iw = Math.min(bw - pad * 2, (bh - pad * 2) * a), ih = iw / a;
    const ow = iw + pad * 2, oh = ih + pad * 2;
    const g = ctx.createLinearGradient(-ow / 2, -oh / 2, ow / 2, oh / 2);
    ['#8a6a1f', '#f7e08b', '#b8892d', '#fff1b8', '#8a6a1f'].forEach((c, i) => g.addColorStop(i / 4, c));
    frameShadow(env);
    ctx.fillStyle = g;
    roundRectPath(ctx, -ow / 2, -oh / 2, ow, oh, u * 0.6); ctx.fill();
    noShadow(ctx);
    drawCover(ctx, img, -iw / 2, -ih / 2, iw, ih, kb, pan);
    ctx.strokeStyle = 'rgba(60,40,0,0.5)'; ctx.lineWidth = u * 0.2;
    ctx.strokeRect(-iw / 2, -ih / 2, iw, ih);
  } else {
    const iw = Math.min(bw, bh * a), ih = iw / a, r = frame === 'redondeado' ? u * 3 : 0;
    frameShadow(env);
    ctx.fillStyle = '#000';
    roundRectPath(ctx, -iw / 2, -ih / 2, iw, ih, r); ctx.fill();
    noShadow(ctx);
    roundRectPath(ctx, -iw / 2, -ih / 2, iw, ih, r); ctx.clip();
    drawCover(ctx, img, -iw / 2, -ih / 2, iw, ih, kb, pan);
  }
  ctx.restore();
}

// ---------- escenas ----------
function sparkleBurst(env, cx, cy, lt, start, radius) {
  const { ctx, u, pal } = env;
  const e = seg(lt, start, start + 1.2);
  if (e <= 0 || e >= 1) return;
  ctx.save();
  const A = ctx.globalAlpha;
  for (let i = 0; i < 14; i++) {
    const an = (i / 14) * TAU + 0.2, r = radius * (0.6 + ease.outCubic(e) * 0.7);
    place(ctx, cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.75, e * 2, 1 - e, 1 - e);
    ctx.globalAlpha = A * (1 - e);
    ctx.fillStyle = i % 2 ? pal.accent : '#ffffff';
    starPath(ctx, u * 1.6, 4, 0.25); ctx.fill();
  }
  ctx.restore();
}

function intro(env, sc, lt) {
  const { ctx, W, H, u, s, pal, portrait } = env;
  const A = ctx.globalAlpha, cx = W / 2;
  const showEmoji = s.showEmoji && s.emoji;
  const eSize = u * (portrait ? 20 : 17);
  const script = SCRIPT_FONTS.has(s.titleFont);
  const tf = fitText(ctx, s.title || ' ', s.titleFont, W * 0.86, H * (portrait ? 0.32 : 0.36), u * (script ? 20 : 15), u * 5, 1.15);
  const toF = s.to ? fitText(ctx, s.to, s.bodyFont, W * 0.8, u * 14, u * 6, u * 3, 1.2) : null;
  const gap = u * 4;
  const tH = blockH(tf), toH = toF ? blockH(toF) : 0;
  let y = H / 2 - ((showEmoji ? eSize + gap : 0) + tH + (toF ? gap * 1.6 + toH : 0)) / 2;

  if (showEmoji) {
    const e = ease.outBack(seg(lt, 0.1, 0.9));
    ctx.save();
    ctx.translate(cx, y + eSize / 2 + Math.sin(lt * 2.2) * u * 0.8);
    ctx.rotate((1 - e) * -0.6);
    ctx.scale(Math.max(0.001, e), Math.max(0.001, e));
    drawEmoji(ctx, s.emoji, 0, 0, eSize);
    ctx.restore();
    y += eSize + gap;
  }
  const tp = seg(lt, 0.35, 1.25);
  if (tp > 0) {
    const scl = lerp(0.6, 1, ease.outBack(tp));
    ctx.save();
    ctx.globalAlpha = A * tp;
    ctx.translate(cx, y + tH / 2);
    ctx.scale(scl, scl);
    drawBlock(env, tf, 0, -tH / 2, pal.text);
    ctx.restore();
  }
  sparkleBurst(env, cx, y + tH / 2, lt, 0.9, Math.min(W * 0.42, tf.size * 3));
  y += tH;
  const lp = ease.outCubic(seg(lt, 1.0, 1.7));
  if (lp > 0) {
    const ly = y + gap * 0.8, lw = u * 16 * lp;
    ctx.strokeStyle = pal.accent; ctx.lineWidth = u * 0.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - lw, ly); ctx.lineTo(cx - u * 2, ly); ctx.moveTo(cx + u * 2, ly); ctx.lineTo(cx + lw, ly); ctx.stroke();
    ctx.fillStyle = pal.accent;
    place(ctx, cx, ly, Math.PI / 4, lp, lp);
    ctx.fillRect(-u * 0.8, -u * 0.8, u * 1.6, u * 1.6);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  if (toF) {
    const p = ease.outCubic(seg(lt, 1.3, 2.1));
    ctx.globalAlpha = A * p;
    drawBlock(env, toF, cx, y + gap * 1.6 + (1 - p) * u * 3, pal.text);
    ctx.globalAlpha = A;
  }
}

function photo(env, sc, lt) {
  const { ctx, W, H, s, portrait } = env;
  const ph = s.photos[sc.i];
  if (!ph) return;
  const d = sc.dur;
  const style = s.photoAnim === 'mixto' ? MIX[sc.i % MIX.length] : s.photoAnim;
  const bw = W * (portrait ? 0.86 : 0.72), bh = H * (portrait ? 0.66 : 0.78);
  const tilt = (rnd(sc.i, 9) - 0.5) * 0.12;
  const p = seg(lt, 0, 1.1);
  let dx = 0, dy = 0, rot = tilt * 0.5, scl = 1, sx = 1, reveal = 1;
  const dir = sc.i % 2 ? 1 : -1;
  switch (style) {
    case 'polaroid': dy = lerp(-H, 0, ease.outBack(p)); rot = lerp(-0.5 * dir, tilt, ease.outCubic(p)); break;
    case 'kenburns': scl = lerp(0.9, 1, ease.outCubic(p)); rot = 0; break;
    case 'deslizar': { const e = 1 - ease.outCubic(p); dx = dir * e * W; rot = dir * e * 0.25 + tilt * 0.5; break; }
    case 'zoom': scl = Math.max(0.001, ease.outElastic(p)); break;
    case 'giro': sx = Math.max(0.001, Math.sin(ease.outCubic(p) * Math.PI / 2)); rot = tilt * 0.3; break;
    case 'revelado': reveal = ease.inOutCubic(seg(lt, 0, 1.3)); rot = 0; break;
  }
  scl *= 1 + seg(lt, d - 0.8, d) * 0.05;
  const kb = 1 + (ph.kind === 'video' ? 0.03 : 0.08) * seg(lt, 0, d);
  const pan = (rnd(sc.i, 7) - 0.5) * 0.06 * seg(lt, 0, d);
  ctx.save();
  ctx.translate(W / 2 + dx, H * (portrait ? 0.48 : 0.5) + dy);
  ctx.rotate(rot);
  ctx.scale(scl * sx, scl);
  if (reveal < 1) {
    ctx.beginPath(); ctx.arc(0, 0, (Math.hypot(bw, bh) / 2) * reveal + 1, 0, TAU); ctx.clip();
  }
  drawFramedPhoto(env, mediaSrc(ph), bw, bh, kb, pan, s.frame);
  ctx.restore();
}

function card(env, cw, ch) {
  const { ctx, u, pal } = env;
  ctx.fillStyle = pal.textLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.55)';
  roundRectPath(ctx, -cw / 2, -ch / 2, cw, ch, u * 4); ctx.fill();
  ctx.strokeStyle = rgba(pal.accent, 0.6); ctx.lineWidth = u * 0.25;
  roundRectPath(ctx, -cw / 2 + u * 1.5, -ch / 2 + u * 1.5, cw - u * 3, ch - u * 3, u * 3); ctx.stroke();
}

function message(env, sc, lt) {
  const { ctx, W, H, u, s, pal, portrait } = env;
  const d = sc.dur;
  const cw = W * (portrait ? 0.86 : 0.76), ch = H * (portrait ? 0.62 : 0.76);
  const pin = ease.outBack(seg(lt, 0, 0.7));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(lerp(0.85, 1, pin), lerp(0.85, 1, pin));
  card(env, cw, ch);
  const pad = u * 6, iw = cw - pad * 2;
  let top = -ch / 2 + pad, avail = ch - pad * 2;
  if (s.to) {
    const hf = fitText(ctx, s.to, s.titleFont, iw, u * 12, u * 7.5, u * 3.5, 1.15);
    const p = seg(lt, 0.25, 0.8);
    const A = ctx.globalAlpha; ctx.globalAlpha = A * p;
    drawBlock(env, hf, 0, top, pal.accent);
    ctx.globalAlpha = A;
    top += blockH(hf) + u * 2.5; avail -= blockH(hf) + u * 2.5;
  }
  const mf = fitText(ctx, s.message, s.bodyFont, iw, avail, u * (portrait ? 8 : 7), u * 2.4, 1.38);
  const mt = top + (avail - blockH(mf)) / 2;
  const n = mf.lines.length;
  if (s.textAnim === 'maquina') {
    const total = mf.lines.reduce((a, l) => a + l.length, 0);
    let shown = Math.floor(seg(lt, 0.6, Math.max(1.6, d * 0.65)) * total);
    let caretLine = -1, caretChars = 0;
    drawBlock(env, mf, 0, mt, pal.text, (i) => {
      const len = mf.lines[i].length;
      const c = clamp(shown, 0, len);
      if (shown > 0 && shown < len) { caretLine = i; caretChars = c; }
      shown -= len;
      return { a: c > 0 ? 1 : 0, chars: c };
    });
    if (caretLine >= 0 && Math.floor(lt * 3) % 2 === 0) {
      ctx.font = fontCss(mf.key, mf.size);
      const x = -mf.widths[caretLine] / 2 + ctx.measureText(mf.lines[caretLine].slice(0, caretChars)).width;
      const y = mt + (caretLine + 0.5) * mf.size * mf.lh;
      ctx.fillStyle = pal.accent;
      ctx.fillRect(x + mf.size * 0.06, y - mf.size * 0.45, Math.max(2, mf.size * 0.07), mf.size * 0.9);
    }
  } else if (s.textAnim === 'zoom') {
    const p = ease.outCubic(seg(lt, 0.4, 1.3));
    const A = ctx.globalAlpha;
    ctx.globalAlpha = A * p;
    ctx.translate(0, mt + blockH(mf) / 2);
    ctx.scale(lerp(1.15, 1, p), lerp(1.15, 1, p));
    drawBlock(env, mf, 0, -blockH(mf) / 2, pal.text);
    ctx.globalAlpha = A;
  } else {
    const step = Math.min(0.32, (d * 0.55) / Math.max(1, n));
    drawBlock(env, mf, 0, mt, pal.text, (i) => {
      const e = ease.outCubic(seg(lt, 0.5 + i * step, 1.1 + i * step));
      return { a: e, dy: (1 - e) * u * 2.5 };
    });
  }
  ctx.restore();
}

function details(env, sc, lt) {
  const { ctx, W, H, u, s, pal, portrait } = env;
  const rows = [['📅', formatDate(s.date)], ['🕒', formatTime(s.time)], ['📍', s.place], ['📝', s.note]].filter((r) => r[1]);
  const cw = W * (portrait ? 0.86 : 0.7), ch = H * (portrait ? 0.6 : 0.78);
  const pin = ease.outBack(seg(lt, 0, 0.7));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(lerp(0.85, 1, pin), lerp(0.85, 1, pin));
  card(env, cw, ch);
  const pad = u * 6, iw = cw - pad * 2;
  const hf = fitText(ctx, s.detailsTitle || '¡Te esperamos!', s.titleFont, iw, u * 13, u * 9, u * 4, 1.15);
  let top = -ch / 2 + pad;
  drawBlock(env, hf, 0, top, pal.accent);
  top += blockH(hf) + u * 3;
  const avail = ch / 2 - pad - top;
  const icon = u * 6, tw = iw - icon - u * 2, gap = u * 2;
  // Tamaño común para todas las filas.
  let size = u * 5.2, fits;
  for (;;) {
    fits = rows.map((r) => fitText(ctx, r[1], s.bodyFont, tw, 9999, size, size, 1.3));
    const total = fits.reduce((a, f) => a + Math.max(blockH(f), icon), 0) + gap * (rows.length - 1);
    if (total <= avail || size <= u * 2.4) break;
    size *= 0.92;
  }
  const total = fits.reduce((a, f) => a + Math.max(blockH(f), icon), 0) + gap * (rows.length - 1);
  let y = top + (avail - total) / 2;
  const A = ctx.globalAlpha;
  const left = -iw / 2;
  rows.forEach((r, i) => {
    const f = fits[i], h = Math.max(blockH(f), icon);
    const e = ease.outCubic(seg(lt, 0.5 + i * 0.35, 1.1 + i * 0.35));
    ctx.globalAlpha = A * e;
    const off = (1 - e) * -u * 8;
    drawEmoji(ctx, r[0], left + icon / 2 + off, y + h / 2, icon * 0.75);
    ctx.font = fontCss(f.key, f.size);
    ctx.fillStyle = pal.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    textShadow(env, f.size);
    const ty = y + (h - blockH(f)) / 2;
    f.lines.forEach((ln, k) => ctx.fillText(ln, left + icon + u * 2 + off, ty + (k + 0.5) * f.size * f.lh));
    noShadow(ctx);
    y += h + gap;
  });
  ctx.globalAlpha = A;
  ctx.restore();
}

function outro(env, sc, lt) {
  const { ctx, W, H, u, s, pal, portrait } = env;
  const A = ctx.globalAlpha, cx = W / 2, cy = H / 2;
  const photos = s.photos.slice(0, 6), n = photos.length;
  if (n) {
    const start = portrait ? -Math.PI / 2 : -Math.PI;
    const rx = W * (portrait ? 0.3 : 0.36), ry = H * (portrait ? 0.34 : 0.3);
    const size = Math.min(W, H) * (portrait ? 0.36 : 0.3) * (n > 4 ? 0.82 : 1);
    photos.forEach((ph, k) => {
      const an = start + (k * TAU) / n;
      const e = ease.outBack(seg(lt, 0.1 + k * 0.12, 0.8 + k * 0.12));
      if (e <= 0) return;
      ctx.save();
      ctx.translate(cx + Math.cos(an) * rx, cy + Math.sin(an) * ry + Math.sin(lt * 1.5 + k) * u * 0.6);
      ctx.rotate((rnd(k, 11) - 0.5) * 0.4);
      ctx.scale(e, e);
      const pad = size * 0.06;
      frameShadow(env);
      ctx.fillStyle = '#fdfdf8';
      ctx.fillRect(-size / 2, -size / 2, size, size + pad * 2.5);
      noShadow(ctx);
      drawCover(ctx, mediaSrc(ph), -size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2, 1.05);
      ctx.restore();
    });
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.5);
    glow.addColorStop(0, pal.textLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)');
    glow.addColorStop(1, pal.textLight ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)');
    ctx.globalAlpha = A * seg(lt, 0.4, 1.0);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = A;
  }
  const script = SCRIPT_FONTS.has(s.titleFont);
  const tf = fitText(ctx, s.title || ' ', s.titleFont, W * (portrait ? 0.82 : 0.66), H * 0.26, u * (script ? 15 : 11), u * 4, 1.15);
  const ff = s.from ? fitText(ctx, s.from, s.titleFont, W * 0.7, u * 14, u * 7, u * 3.2, 1.2) : null;
  const gap = u * 4;
  const tH = blockH(tf), fH = ff ? blockH(ff) : 0;
  let y = cy - (tH + (ff ? gap + fH : 0)) / 2;
  const tp = seg(lt, 0.5, 1.3);
  if (tp > 0) {
    const scl = lerp(0.5, 1, ease.outBack(tp));
    ctx.save();
    ctx.globalAlpha = A * tp;
    ctx.translate(cx, y + tH / 2);
    ctx.scale(scl, scl);
    drawBlock(env, tf, 0, -tH / 2, pal.text);
    ctx.restore();
  }
  sparkleBurst(env, cx, y + tH / 2, lt, 1.0, Math.min(W * 0.4, tf.size * 2.6));
  if (ff) {
    const p = ease.outCubic(seg(lt, 1.4, 2.2));
    ctx.globalAlpha = A * p;
    drawBlock(env, ff, cx, y + tH + gap + (1 - p) * u * 3, pal.accent);
    ctx.globalAlpha = A;
  }
}

const SCENES = { intro, photo, message, details, outro };
