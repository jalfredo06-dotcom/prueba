import { OCCASIONS, BACKGROUNDS, PATTERNS, PARTICLES, FRAMES, PHOTO_ANIMS, TEXT_ANIMS, FONTS, RATIOS, QUALITIES } from './data.js';
import { buildTimeline, renderFrame, clearFitCache, VIDEO_DELAY } from './render.js';
import { MUSIC_STYLES, MUSIC_BY_OCCASION, SynthPlayer } from './music.js';

const $ = (s) => document.querySelector(s);
const cv = $('#cv');
const ctx = cv.getContext('2d');
const audio = $('#audio');
const MAX_PHOTOS = 12; // fotos + videos
const MAX_VIDEOS = 6;
const MAX_CLIP = 10; // segundos que se usan de cada video

const state = {
  occasion: 'cumple', emoji: '', title: '', to: '', message: '', from: '',
  showDetails: false, detailsTitle: '', date: '', time: '', place: '', note: '',
  bg: 'fiesta', customColors: ['#ff6b6b', '#5f27cd'], bgImage: null, bgDim: 0.35,
  pattern: 'bokeh', particles: 'confeti', frame: 'polaroid', photoAnim: 'mixto', textAnim: 'lineas',
  titleFont: 'pacifico', bodyFont: 'quicksand', textAuto: true, textColor: '#ffffff', accentColor: '#ffd166',
  showEmoji: true, photos: [], speed: 1, orient: 'v', ratio: '16:9', quality: 1080, volume: 0.8,
  music: 'fiesta', // 'none' | estilo generado | 'file'
};
let musicManual = false; // el usuario eligió música: no cambiarla al cambiar de ocasión

let tl = buildTimeline(state);
let playing = false, playT = 0, t0 = 0, dirty = true, exporting = false, suggIdx = 0;

// ---------- utilidades ----------
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const even = (x) => Math.max(2, Math.round(x / 2) * 2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => el.classList.remove('show'), ms);
}
function opt(sel, obj, value) {
  sel.innerHTML = Object.entries(obj).map(([k, v]) => `<option value="${k}">${typeof v === 'string' ? v : v.name}</option>`).join('');
  sel.value = value;
}
const occ = () => OCCASIONS.find((o) => o.id === state.occasion);

function ratioDims(r, orient) {
  let w = r.w, h = r.h;
  if (orient === 'v' && w !== h) [w, h] = [h, w];
  return { w, h };
}
function exportSize() {
  const r = RATIOS.find((x) => x.id === state.ratio);
  const { w, h } = ratioDims(r, state.orient);
  const L = QUALITIES[state.quality].long;
  return w >= h ? { W: L, H: even((L * h) / w) } : { W: even((L * w) / h), H: L };
}

// ---------- vista previa ----------
function layoutCanvas() {
  if (exporting) return;
  const { W, H } = exportSize();
  const stage = $('#stage');
  const cs = getComputedStyle(stage);
  const maxW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const mobile = window.innerWidth < 900;
  const maxH = mobile ? window.innerHeight * 0.3 : Math.max(260, window.innerHeight - 400);
  const scale = Math.min(maxW / W, maxH / H);
  cv.style.width = `${Math.round(W * scale)}px`;
  cv.style.height = `${Math.round(H * scale)}px`;
  const k = Math.min(1, scale * (window.devicePixelRatio || 1));
  cv.width = Math.round(W * k);
  cv.height = Math.round(H * k);
  dirty = true;
}

function changed(rebuild = true) {
  if (rebuild) {
    tl = buildTimeline(state);
    if (playT > tl.total) playT = 0;
    $('#scrub').max = tl.total.toFixed(2);
  }
  updateInfo();
  dirty = true;
}

function updateInfo() {
  const { W, H } = exportSize();
  const r = RATIOS.find((x) => x.id === state.ratio);
  const { w, h } = ratioDims(r, state.orient);
  const nv = state.photos.filter((p) => p.kind === 'video').length;
  const np = state.photos.length - nv;
  $('#formatInfo').textContent = `${w}:${h} · ${W}×${H} px · duración ${fmt(tl.total)} · ${np} foto(s)` + (nv ? ` · ${nv} video(s)` : '');
}

function frame() {
  if (!exporting) {
    if (playing) {
      playT = (performance.now() - t0) / 1000;
      if (playT > tl.total + 1) { playT = 0; t0 = performance.now(); restartMusic(0); }
      syncVideos(playT, true);
      updateGain(playT);
      dirty = true;
    }
    if (dirty) {
      if (!playing) syncVideos(playT, false);
      renderFrame(ctx, cv.width, cv.height, Math.min(playT, tl.total), state, tl);
      $('#scrub').value = Math.min(playT, tl.total);
      $('#timeLbl').textContent = `${fmt(Math.min(playT, tl.total))} / ${fmt(tl.total)}`;
      dirty = false;
    }
  }
  requestAnimationFrame(frame);
}

function play() {
  if (playT >= tl.total) playT = 0;
  playing = true;
  t0 = performance.now() - playT * 1000;
  $('#playBtn').textContent = '❚❚';
  $('#playBtn').setAttribute('aria-label', 'Pausar');
  restartMusic(playT);
}
function pause() {
  playing = false;
  $('#playBtn').textContent = '▶';
  $('#playBtn').setAttribute('aria-label', 'Reproducir');
  stopMusic();
  pauseVideos();
}
function seek(t) {
  playT = t;
  t0 = performance.now() - t * 1000;
  dirty = true;
  if (playing) restartMusic(t);
}

// ---------- audio: música de fondo + sonido de los videos ----------
// Todo pasa por un AudioContext para poder mezclarlo y grabarlo en el video.
// Se crea con el primer toque del usuario (los navegadores bloquean el audio antes).
let AC = null;
function ensureAudio() {
  if (AC) { if (AC.ac.state === 'suspended') AC.ac.resume(); return AC; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ac = new Ctx();
  const master = ac.createGain();
  master.connect(ac.destination);
  const music = ac.createGain();
  music.gain.value = 0;
  music.connect(master);
  const videoBus = ac.createGain();
  videoBus.connect(master);
  ac.createMediaElementSource(audio).connect(music);
  AC = { ac, master, music, videoBus, synth: new SynthPlayer(ac, music) };
  ac.resume();
  state.photos.forEach(routeVideo);
  if (playing) restartMusic(playT);
  return AC;
}
function routeVideo(ph) {
  if (ph.kind !== 'video') return;
  if (AC && ph.sound && !ph.node) {
    ph.node = AC.ac.createMediaElementSource(ph.img);
    ph.node.connect(AC.videoBus);
  }
  ph.img.muted = !(AC && ph.sound);
}
function restartMusic(t) {
  stopMusic();
  if (!AC || !(playing || exporting) || t >= tl.total) return;
  if (state.music === 'file') {
    if (!audio.src) return;
    const d = audio.duration;
    audio.currentTime = d && isFinite(d) ? t % d : t;
    audio.play().catch(() => {});
  } else if (MUSIC_STYLES[state.music]) AC.synth.start(state.music, t);
}
function stopMusic() {
  audio.pause();
  if (AC) AC.synth.stop();
}
// ¿Hay un video con sonido reproduciéndose en el instante t?
function soundingVideo(t) {
  return tl.scenes.some((sc) => {
    const ph = sc.type === 'photo' && state.photos[sc.i];
    return ph && ph.kind === 'video' && ph.sound && t >= sc.start + VIDEO_DELAY && t < sc.start + VIDEO_DELAY + ph.clip;
  });
}
// Volumen de la música: desvanecido al final y más bajo mientras suena un video.
function updateGain(t) {
  if (!AC) return;
  const fade = clamp((tl.total - t) / 1.8, 0, 1);
  const duck = soundingVideo(t) ? 0.2 : 1;
  AC.music.gain.setTargetAtTime(state.volume * fade * duck, AC.ac.currentTime, 0.06);
}

// ---------- videos dentro de la tarjeta ----------
// live = reproduciendo/grabando (los clips corren en tiempo real);
// si no, se busca el cuadro exacto para la posición de la vista previa.
function syncVideos(t, live) {
  tl.scenes.forEach((sc) => {
    if (sc.type !== 'photo') return;
    const ph = state.photos[sc.i];
    if (!ph || ph.kind !== 'video') return;
    const v = ph.img;
    const lt = t - sc.start;
    const vt = clamp(lt - VIDEO_DELAY, 0, ph.clip);
    if (live && lt >= VIDEO_DELAY && lt < VIDEO_DELAY + ph.clip) {
      if (v.paused) {
        v.currentTime = vt;
        v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
      } else if (Math.abs(v.currentTime - vt) > 0.35) v.currentTime = vt;
    } else {
      if (!v.paused) v.pause();
      if (lt >= -0.5 && lt <= sc.dur && !v.seeking && Math.abs(v.currentTime - vt) > 0.08) v.currentTime = vt;
    }
  });
}
function pauseVideos() {
  state.photos.forEach((ph) => { if (ph.kind === 'video') ph.img.pause(); });
}

// ---------- ocasión ----------
function applyOccasion(id) {
  state.occasion = id;
  const o = occ();
  Object.assign(state, {
    emoji: o.emoji, title: o.title, message: o.messages[0], bg: o.bg, particles: o.particles,
    pattern: o.pattern, titleFont: o.titleFont, bodyFont: o.bodyFont, showDetails: !!o.event,
  });
  if (!musicManual) state.music = MUSIC_BY_OCCASION[id] || 'fiesta';
  suggIdx = 0;
  syncInputs();
  renderOccasions();
  renderBackgrounds();
  renderParticles();
  renderSuggestions();
  renderMusic();
  changed();
  if (playing) restartMusic(playT);
}

function renderOccasions() {
  $('#occGrid').innerHTML = OCCASIONS.map((o) =>
    `<button class="occ${o.id === state.occasion ? ' on' : ''}" data-id="${o.id}" aria-pressed="${o.id === state.occasion}"><span aria-hidden="true">${o.emoji}</span>${o.name}</button>`).join('');
}

function renderSuggestions() {
  const o = occ();
  $('#suggestions').innerHTML = o.messages.map((m, i) =>
    `<button data-i="${i}" class="${m === state.message ? 'on' : ''}">${m}</button>`).join('');
}

function renderRatios() {
  $('#ratioGrid').innerHTML = RATIOS.map((r) => {
    const { w, h } = ratioDims(r, state.orient);
    const k = 30 / Math.max(w, h);
    const use = state.orient === 'v' ? r.v_use : r.h_use;
    return `<button class="ratio${r.id === state.ratio ? ' on' : ''}" data-id="${r.id}" title="${use}">
      <i style="width:${Math.round(w * k)}px;height:${Math.round(h * k)}px"></i>${w}:${h}<small>${use}</small></button>`;
  }).join('');
  document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.orient === state.orient));
}

function renderBackgrounds() {
  const sw = Object.entries(BACKGROUNDS).map(([k, b]) =>
    `<button class="sw${state.bg === k ? ' on' : ''}" data-bg="${k}" style="background:linear-gradient(135deg,${b.colors.join(',')})" aria-label="Fondo ${b.name}"><span>${b.name}</span></button>`);
  sw.push(`<button class="sw special${state.bg === 'custom' ? ' on' : ''}" data-bg="custom" aria-label="Colores personalizados">🎨<span>Mis colores</span></button>`);
  sw.push(`<button class="sw special${state.bg === 'image' ? ' on' : ''}" data-bg="image" aria-label="Imagen propia de fondo">🏞️<span>Mi imagen</span></button>`);
  $('#bgGrid').innerHTML = sw.join('');
  $('#customBox').hidden = state.bg !== 'custom';
  $('#imageBox').hidden = state.bg !== 'image';
}

function renderParticles() {
  $('#particleGrid').innerHTML = Object.entries(PARTICLES).map(([k, v]) =>
    `<button class="chip${state.particles === k ? ' on' : ''}" data-p="${k}">${v}</button>`).join('');
}

function renderMusic() {
  const opts = { none: '🔇 Sin música', ...MUSIC_STYLES, file: '📁 Mi canción' };
  $('#musicGrid').innerHTML = Object.entries(opts).map(([k, v]) =>
    `<button class="chip${state.music === k ? ' on' : ''}" data-m="${k}" aria-pressed="${state.music === k}">${v}</button>`).join('');
  $('#musicPick').hidden = state.music !== 'file';
  $('#musicBox').hidden = !(state.music === 'file' && audio.src);
}

function renderPhotos() {
  $('#photoList').innerHTML = state.photos.map((p, i) => {
    const isV = p.kind === 'video';
    const extra = isV
      ? `<span class="badge">▶ ${fmt(p.clip)}</span><button class="snd" data-act="snd" data-i="${i}" aria-pressed="${p.sound}" aria-label="${p.sound ? 'Silenciar video' : 'Incluir sonido del video'}">${p.sound ? '🔊' : '🔇'}</button>`
      : '';
    return `<li><img src="${p.thumb}" alt="${isV ? 'Video' : 'Foto'} ${i + 1}" data-i="${i}"><span class="n">${i + 1}</span>${extra}
      <div class="ops"><button data-act="left" data-i="${i}" aria-label="Mover antes">◀</button><button data-act="del" data-i="${i}" aria-label="Quitar foto">✕</button><button data-act="right" data-i="${i}" aria-label="Mover después">▶</button></div></li>`;
  }).join('');
}

const TEXT_IDS = ['title', 'emoji', 'to', 'message', 'from', 'detailsTitle', 'date', 'time', 'place', 'note'];
function syncInputs() {
  const o = occ();
  TEXT_IDS.forEach((id) => { $('#' + id).value = state[id]; });
  $('#to').placeholder = o.to ? `${o.to}María` : 'Ej.: María y Andrés';
  $('#from').placeholder = `${o.from}Juan`;
  $('#showDetails').checked = state.showDetails;
  $('#detailsBox').hidden = !state.showDetails;
  $('#pattern').value = state.pattern;
  $('#titleFont').value = state.titleFont;
  $('#bodyFont').value = state.bodyFont;
}

// ---------- imágenes ----------
function loadImage(file, maxSide = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const tk = 220 / Math.max(c.width, c.height);
      const t = document.createElement('canvas');
      t.width = Math.round(c.width * tk); t.height = Math.round(c.height * tk);
      t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
      URL.revokeObjectURL(url);
      resolve({ img: c, thumb: t.toDataURL('image/jpeg', 0.75) });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')); };
    img.src = url;
  });
}

function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.src = url;
    $('#media').appendChild(v);
    let done = false;
    const fail = () => {
      if (done) return;
      done = true;
      v.remove();
      URL.revokeObjectURL(url);
      reject(new Error('video'));
    };
    const timer = setTimeout(fail, 20000);
    v.onerror = fail;
    v.onloadedmetadata = () => {
      if (!v.videoWidth) return fail();
      const d = isFinite(v.duration) ? v.duration : 1;
      v.currentTime = Math.min(0.5, d / 2);
    };
    v.onseeked = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      v.onseeked = null;
      // Portada (se muestra mientras el video carga) y miniatura.
      const k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
      const poster = document.createElement('canvas');
      poster.width = Math.round(v.videoWidth * k);
      poster.height = Math.round(v.videoHeight * k);
      poster.getContext('2d').drawImage(v, 0, 0, poster.width, poster.height);
      const tk = 220 / Math.max(poster.width, poster.height);
      const t = document.createElement('canvas');
      t.width = Math.round(poster.width * tk);
      t.height = Math.round(poster.height * tk);
      t.getContext('2d').drawImage(poster, 0, 0, t.width, t.height);
      const full = isFinite(v.duration) ? v.duration : MAX_CLIP;
      const clip = clamp(full - 0.05, 0.5, MAX_CLIP);
      v.currentTime = 0;
      v.addEventListener('seeked', () => { dirty = true; });
      v.addEventListener('loadeddata', () => { dirty = true; });
      resolve({ kind: 'video', img: v, poster, thumb: t.toDataURL('image/jpeg', 0.75), clip, full, sound: false, url });
    };
  });
}

function removeMedia(ph) {
  if (ph.kind !== 'video') return;
  ph.img.pause();
  if (ph.node) ph.node.disconnect();
  ph.img.removeAttribute('src');
  ph.img.load();
  ph.img.remove();
  URL.revokeObjectURL(ph.url);
}

async function addPhotos(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
  if (!list.length) { toast('Elige archivos de imagen o de video'); return; }
  let room = MAX_PHOTOS - state.photos.length;
  let vRoom = MAX_VIDEOS - state.photos.filter((p) => p.kind === 'video').length;
  if (room <= 0) { toast(`Máximo ${MAX_PHOTOS} fotos y videos en total`); return; }
  let skipped = 0, long = 0, failed = 0;
  for (const f of list) {
    const isV = f.type.startsWith('video/');
    if (room <= 0 || (isV && vRoom <= 0)) { skipped++; continue; }
    try {
      const item = isV ? await loadVideo(f) : await loadImage(f);
      if (isV) { vRoom--; if (item.full > MAX_CLIP + 0.1) long++; routeVideo(item); }
      state.photos.push(item);
      room--;
    } catch { failed++; }
  }
  const msgs = [];
  if (skipped) msgs.push(`${skipped} archivo(s) no se agregaron (máx. ${MAX_PHOTOS} en total y ${MAX_VIDEOS} videos)`);
  if (long) msgs.push(`de los videos largos se usan los primeros ${MAX_CLIP} s`);
  if (failed) msgs.push(`${failed} archivo(s) no se pudieron leer (formato no compatible con este navegador)`);
  if (msgs.length) toast(msgs.join(' · '), 5000);
  renderPhotos();
  changed();
}

// ---------- exportar ----------
function pickMime() {
  const types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

let cancelRec = false, lastUrl = null, lastFile = null;
async function exportVideo() {
  if (exporting) return;
  if (!window.MediaRecorder || !cv.captureStream) {
    toast('Tu navegador no permite grabar video. Prueba con Chrome, Edge, Firefox o Safari actualizados.', 5000);
    return;
  }
  pause();
  await document.fonts.ready;
  clearFitCache();
  const mime = pickMime();
  const { W, H } = exportSize();
  exporting = true;
  cancelRec = false;
  cv.width = W; cv.height = H;
  renderFrame(ctx, W, H, 0, state, tl);

  const dlg = $('#dlg');
  $('#recView').hidden = false; $('#doneView').hidden = true;
  $('#recBar').style.width = '0%'; $('#recLbl').textContent = '0%';
  dlg.showModal();

  const stream = cv.captureStream(30);
  let dest = null;
  const hasAudio = (state.music === 'file' && audio.src) || MUSIC_STYLES[state.music] || state.photos.some((p) => p.kind === 'video' && p.sound);
  pauseVideos();
  if (ensureAudio()) {
    await AC.ac.resume();
    if (hasAudio) {
      dest = AC.ac.createMediaStreamDestination();
      AC.master.connect(dest);
      stream.addTrack(dest.stream.getAudioTracks()[0]);
    }
  }

  const rec = new MediaRecorder(stream, { ...(mime && { mimeType: mime }), videoBitsPerSecond: state.quality >= 1080 ? 10_000_000 : 6_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start(250);
  restartMusic(0);
  const start = performance.now();
  await new Promise((resolve) => {
    const step = () => {
      if (cancelRec) return resolve();
      const t = (performance.now() - start) / 1000;
      syncVideos(Math.min(t, tl.total), t < tl.total);
      updateGain(t);
      renderFrame(ctx, W, H, Math.min(t, tl.total), state, tl);
      const pct = Math.min(100, Math.round((t / tl.total) * 100));
      $('#recBar').style.width = pct + '%';
      $('#recLbl').textContent = `${pct}% · ${fmt(Math.min(t, tl.total))} de ${fmt(tl.total)}`;
      if (t >= tl.total + 0.25) return resolve();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await stopped;
  exporting = false;
  stopMusic();
  pauseVideos();
  if (dest) AC.master.disconnect(dest);
  stream.getTracks().forEach((tr) => tr.stop());
  layoutCanvas();

  if (cancelRec) { dlg.close(); toast('Grabación cancelada'); return; }
  const type = (rec.mimeType || mime || 'video/webm').split(';')[0];
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob(chunks, { type });
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  const name = `tarjeta-${state.occasion}-${state.ratio.replace(':', 'x')}${state.orient === 'v' ? '-vertical' : ''}.${ext}`;
  lastFile = new File([blob], name, { type });
  $('#outVideo').src = lastUrl;
  $('#dlLink').href = lastUrl;
  $('#dlLink').download = name;
  $('#outInfo').textContent = `${W}×${H} px · ${fmt(tl.total)} · ${(blob.size / 1048576).toFixed(1)} MB · .${ext}` +
    (ext === 'webm' ? ' — si alguna app no acepta .webm, crea el video desde Chrome o Safari recientes para obtener .mp4.' : '');
  $('#shareBtn').hidden = !(navigator.canShare && navigator.canShare({ files: [lastFile] }));
  $('#recView').hidden = true; $('#doneView').hidden = false;
}

async function exportPng() {
  await document.fonts.ready;
  clearFitCache();
  const { W, H } = exportSize();
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  // Si está al inicio, usa un instante con la portada completa.
  const t = playT < 0.5 ? Math.min(2.6, tl.total) : Math.min(playT, tl.total);
  renderFrame(c.getContext('2d'), W, H, t, state, tl);
  c.toBlob((b) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `tarjeta-${state.occasion}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ---------- eventos ----------
function bind() {
  $('#occGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.occ');
    if (b) applyOccasion(b.dataset.id);
  });
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    state.orient = b.dataset.orient;
    renderRatios(); layoutCanvas(); changed(false);
  }));
  $('#ratioGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.ratio');
    if (!b) return;
    state.ratio = b.dataset.id;
    renderRatios(); layoutCanvas(); changed(false);
  });
  $('#quality').addEventListener('change', (e) => { state.quality = +e.target.value; layoutCanvas(); changed(false); });
  $('#speed').addEventListener('change', (e) => { state.speed = +e.target.value; changed(); });

  $('#bgGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.sw');
    if (!b) return;
    state.bg = b.dataset.bg;
    renderBackgrounds();
    if (state.bg === 'image' && !state.bgImage) $('#bgFile').click();
    changed(false);
  });
  $('#c1').addEventListener('input', (e) => { state.customColors[0] = e.target.value; changed(false); });
  $('#c2').addEventListener('input', (e) => { state.customColors[1] = e.target.value; changed(false); });
  $('#bgFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { state.bgImage = (await loadImage(f, 2200)).img; state.bg = 'image'; renderBackgrounds(); changed(false); }
    catch { toast('No se pudo leer la imagen'); }
    e.target.value = '';
  });
  $('#bgDim').addEventListener('input', (e) => { state.bgDim = +e.target.value; changed(false); });
  $('#pattern').addEventListener('change', (e) => { state.pattern = e.target.value; changed(false); });
  $('#particleGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    state.particles = b.dataset.p;
    renderParticles(); changed(false);
  });

  const drop = $('#drop');
  $('#photoIn').addEventListener('change', (e) => { addPhotos(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => addPhotos(e.dataTransfer.files));
  $('#photoList').addEventListener('click', (e) => {
    const el = e.target.closest('[data-i]');
    if (!el) return;
    const i = +el.dataset.i, P = state.photos;
    if (el.tagName === 'IMG') {
      const sc = tl.scenes.find((s) => s.type === 'photo' && s.i === i);
      if (sc) seek(sc.start + 1.2);
      return;
    }
    if (el.dataset.act === 'snd') {
      P[i].sound = !P[i].sound;
      ensureAudio();
      routeVideo(P[i]);
      renderPhotos();
      toast(P[i].sound ? '🔊 Se incluirá el sonido de este video' : '🔇 Video sin sonido');
      return;
    }
    if (el.dataset.act === 'del') removeMedia(P.splice(i, 1)[0]);
    else if (el.dataset.act === 'left' && i > 0) [P[i - 1], P[i]] = [P[i], P[i - 1]];
    else if (el.dataset.act === 'right' && i < P.length - 1) [P[i + 1], P[i]] = [P[i], P[i + 1]];
    renderPhotos(); changed();
  });
  $('#frame').addEventListener('change', (e) => { state.frame = e.target.value; changed(false); });
  $('#photoAnim').addEventListener('change', (e) => { state.photoAnim = e.target.value; changed(false); });

  TEXT_IDS.forEach((id) => $('#' + id).addEventListener('input', (e) => {
    state[id] = e.target.value;
    if (id === 'message') renderSuggestions();
    changed(id === 'message');
  }));
  $('#suggestions').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    suggIdx = +b.dataset.i;
    state.message = occ().messages[suggIdx];
    $('#message').value = state.message;
    renderSuggestions(); changed();
    const sc = tl.scenes.find((s) => s.type === 'message');
    if (sc && !playing) seek(sc.start + sc.dur * 0.8);
  });
  $('#shuffle').addEventListener('click', () => {
    const m = occ().messages;
    suggIdx = (suggIdx + 1) % m.length;
    state.message = m[suggIdx];
    $('#message').value = state.message;
    renderSuggestions(); changed();
  });
  $('#showDetails').addEventListener('change', (e) => {
    state.showDetails = e.target.checked;
    $('#detailsBox').hidden = !state.showDetails;
    changed();
  });

  $('#titleFont').addEventListener('change', (e) => { state.titleFont = e.target.value; changed(false); });
  $('#bodyFont').addEventListener('change', (e) => { state.bodyFont = e.target.value; changed(false); });
  $('#textAnim').addEventListener('change', (e) => { state.textAnim = e.target.value; changed(false); });
  $('#textAuto').addEventListener('change', (e) => { state.textAuto = e.target.checked; $('#colorBox').hidden = state.textAuto; changed(false); });
  $('#textColor').addEventListener('input', (e) => { state.textColor = e.target.value; changed(false); });
  $('#accentColor').addEventListener('input', (e) => { state.accentColor = e.target.value; changed(false); });
  $('#showEmoji').addEventListener('change', (e) => { state.showEmoji = e.target.checked; changed(false); });

  $('#musicGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    state.music = b.dataset.m;
    musicManual = true;
    renderMusic();
    ensureAudio();
    if (state.music === 'file' && !audio.src) { $('#musicIn').click(); return; }
    if (playing) restartMusic(playT);
    else if (state.music !== 'none') play();
  });
  $('#musicIn').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(f);
    $('#musicName').textContent = '🎵 ' + f.name;
    state.music = 'file';
    musicManual = true;
    e.target.value = '';
    renderMusic();
    ensureAudio();
    toast('⚖️ Recuerda: usa solo música que tengas derecho a compartir', 4000);
    if (playing) restartMusic(playT); else play();
  });
  $('#musicRemove').addEventListener('click', () => {
    stopMusic();
    URL.revokeObjectURL(audio.src);
    audio.removeAttribute('src');
    audio.load();
    state.music = MUSIC_BY_OCCASION[state.occasion] || 'fiesta';
    renderMusic();
    if (playing) restartMusic(playT);
  });
  $('#volume').addEventListener('input', (e) => { state.volume = +e.target.value; });
  // El audio solo puede arrancar tras una interacción del usuario.
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => ensureAudio(), { capture: true }));

  $('#playBtn').addEventListener('click', () => (playing ? pause() : play()));
  $('#scrub').addEventListener('input', (e) => seek(+e.target.value));
  $('#videoBtn').addEventListener('click', exportVideo);
  $('#pngBtn').addEventListener('click', exportPng);
  $('#cancelBtn').addEventListener('click', () => { cancelRec = true; });
  $('#closeBtn').addEventListener('click', () => { $('#outVideo').pause(); $('#dlg').close(); });
  $('#dlg').addEventListener('cancel', (e) => { if (exporting) e.preventDefault(); });
  $('#shareBtn').addEventListener('click', async () => {
    try { await navigator.share({ files: [lastFile], title: state.title }); } catch { /* cancelado */ }
  });

  new ResizeObserver(() => layoutCanvas()).observe($('#stage'));
  window.addEventListener('resize', layoutCanvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && exporting) toast('⚠️ Vuelve a esta pestaña: la grabación necesita estar visible', 5000);
  });
}

// ---------- inicio ----------
function init() {
  opt($('#quality'), Object.fromEntries(Object.entries(QUALITIES).map(([k, v]) => [k, v.name])), String(state.quality));
  opt($('#pattern'), PATTERNS, state.pattern);
  opt($('#frame'), FRAMES, state.frame);
  opt($('#photoAnim'), PHOTO_ANIMS, state.photoAnim);
  opt($('#textAnim'), TEXT_ANIMS, state.textAnim);
  opt($('#titleFont'), FONTS, state.titleFont);
  opt($('#bodyFont'), FONTS, state.bodyFont);
  renderRatios();
  bind();
  applyOccasion('cumple');
  layoutCanvas();
  requestAnimationFrame(frame);
  // Las fuentes web llegan después: al cargar, se recalcula el texto.
  Promise.all(Object.values(FONTS).map((f) => document.fonts.load(`${f.weight} 40px "${f.name}"`).catch(() => {})))
    .then(() => { clearFitCache(); dirty = true; });
  setTimeout(play, 400);
}
init();
