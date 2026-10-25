/* Grabador de tracks GPS: un punto cada 5 s, límite de duración, pantalla encendida y recuperación. */
(function (root) {
  'use strict';
  const GAP_MS = 30000;          // sin puntos más de 30 s -> nuevo segmento
  const RESUME_MS = 600000;      // al reabrir: si pasaron más de 10 min, el track se da por interrumpido
  const T = {
    interval: 5000,
    cfg: { limitH: 4, wake: true, maxAcc: 50 },
    source: null, cur: null, wakeOn: false, lastErr: null, onChange: () => {}, onStop: () => {}
  };
  let timer = 0, wl = null, ticks = 0;

  const last = () => T.cur && T.cur.points[T.cur.points.length - 1];
  const emit = () => { try { T.onChange(T.cur); } catch (_) { /* UI */ } };
  const flush = () => T.cur ? DB.put('tracks', T.cur).catch(() => {}) : Promise.resolve();

  async function lock() {
    if (!T.cfg.wake || !('wakeLock' in navigator) || wl) return;
    try {
      wl = await navigator.wakeLock.request('screen'); T.wakeOn = true;
      wl.addEventListener('release', () => { wl = null; T.wakeOn = false; emit(); });
    } catch (_) { T.wakeOn = false; }
    emit();
  }
  function unlock() { try { wl && wl.release(); } catch (_) { /* nada */ } wl = null; T.wakeOn = false; }

  /** Toma la última posición del GPS de la app (ya activo) si es reciente. */
  function accept(fix) {
    const c = T.cur; if (!c) return;
    const now = Date.now(), prev = last();
    const p = { t: now, lat: fix.lat, lon: fix.lon, alt: fix.alt, acc: fix.acc };
    T.lastErr = null;
    if (T.cfg.maxAcc && p.acc > T.cfg.maxAcc) { c.discarded = (c.discarded || 0) + 1; return; }
    p.s = prev ? (p.t - prev.t > GAP_MS ? prev.s + 1 : prev.s) : 0;
    if (prev && p.s === prev.s) c.dist = (c.dist || 0) + TrackFmt.hav(prev, p);
    c.points.push(p); c.end = p.t;
    if (++ticks % 3 === 0) flush();
  }

  function tick() {
    const c = T.cur; if (!c) return;
    if (Date.now() - c.start >= c.limitMs) return stop('limit');
    const fix = T.source && T.source();
    if (!fix) { T.lastErr = 'Sin señal GPS'; return emit(); }
    if (Date.now() - fix.rx > Math.max(15000, T.interval * 3)) { T.lastErr = 'Sin posiciones nuevas del GPS'; return emit(); }
    accept(fix); emit();
  }

  function begin() {
    clearInterval(timer); timer = setInterval(tick, T.interval); lock(); tick(); emit();
  }

  T.start = async (name) => {
    if (T.cur) return T.cur;
    const now = Date.now();
    T.cur = { name: name || 'Track ' + TrackFmt.ymd(now) + ' ' + TrackFmt.hms(now).slice(0, 5), start: now, end: now, status: 'recording', limitMs: Math.round(T.cfg.limitH * 3600000), points: [], dist: 0, discarded: 0 };
    T.cur.id = await DB.put('tracks', T.cur); ticks = 0; begin();
    return T.cur;
  };

  async function stop(reason) {
    const c = T.cur; if (!c) return;
    clearInterval(timer); unlock(); T.cur = null;
    c.status = reason || 'done';
    c.end = c.points.length ? c.points[c.points.length - 1].t : Date.now();
    await DB.put('tracks', c);
    try { T.onStop(c, reason); } catch (_) { /* UI */ }
    T.onChange(null);
  }
  T.stop = () => stop('done');

  /** Al abrir la app: reanuda un track reciente o cierra uno que quedó colgado. */
  T.recover = async () => {
    const all = (await DB.all('tracks')).filter(t => t.status === 'recording');
    for (const t of all) {
      const lastT = t.points.length ? t.points[t.points.length - 1].t : t.start;
      const expired = Date.now() - t.start >= t.limitMs;
      if (expired || Date.now() - lastT > RESUME_MS || T.cur) {
        t.status = expired ? 'limit' : 'interrupted'; t.end = lastT; await DB.put('tracks', t); T.onStop(t, t.status);
      } else { T.cur = t; ticks = 0; begin(); }
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (!T.cur) return;
    if (document.visibilityState === 'visible') { lock(); tick(); } else flush();
  });
  addEventListener('pagehide', flush);

  root.Track = T;
})(self);
