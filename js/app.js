(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const DEFAULT_TAGS = ['Afloramiento', 'Muestra', 'Suelo', 'Vegetación', 'Agua', 'Estructura', 'Panorámica', 'Detalle', 'Punto de control'];

  /* ---------- utilidades ---------- */
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    n.append(...kids.flat().filter(k => k != null));
    return n;
  }
  let toastT;
  function toast(msg, ms = 2400) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem('lc.' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('lc.' + k, JSON.stringify(v)); } catch (_) { /* sin almacenamiento */ } }
  };
  const S = { nb: null, nbs: [], entries: [], filter: null, urls: [] };
  const settings = { crs: store.get('crs', 9377), tags: store.get('tags', DEFAULT_TAGS) };

  function sheet(title, build, opts = {}) {
    const bg = el('div', { class: 'sheet-bg' });
    if (document.querySelector('.full')) bg.style.zIndex = 60;
    const body = el('div', { class: 'sheet-b' }), foot = el('div', { class: 'sheet-f' });
    const api = { body, foot, close() { bg.remove(); opts.onClose && opts.onClose(); } };
    const sh = el('div', { class: 'sheet' + (opts.tall ? ' tall' : '') },
      el('div', { class: 'sheet-h' }, el('button', { class: 'ico', text: '✕', 'aria-label': 'Cerrar', onclick: () => api.close() }), el('h2', { text: title }), el('span', { style: 'width:40px' })),
      body, foot);
    bg.addEventListener('pointerdown', (e) => { if (e.target === bg && !opts.tall) api.close(); });
    bg.append(sh); document.body.append(bg);
    build(api);
    if (!foot.children.length) foot.remove();
    return api;
  }

  /* ---------- GPS ---------- */
  const GPS = { fix: null, error: null, subs: [] };
  function gpsStart() {
    if (!('geolocation' in navigator)) { GPS.error = 'Sin GPS'; return gpsUi(); }
    navigator.geolocation.watchPosition((p) => {
      GPS.fix = { lat: p.coords.latitude, lon: p.coords.longitude, alt: p.coords.altitude, acc: p.coords.accuracy, t: p.timestamp };
      GPS.error = null; gpsUi();
    }, (err) => {
      GPS.error = err.code === 1 ? 'GPS sin permiso' : 'Sin señal GPS'; gpsUi();
    }, { enableHighAccuracy: true, maximumAge: 4000, timeout: 30000 });
  }
  function gpsUi() {
    const dot = $('#gpsChip .dot'), txt = $('#gpsText');
    if (GPS.fix) {
      const a = GPS.fix.acc;
      dot.className = 'dot ' + (a <= 15 ? 'ok' : a <= 50 ? 'mid' : 'bad');
      txt.textContent = `${Render.coordText({ coords: GPS.fix }, settings.crs).replace(/\s+m s\.n\.m\./, '')}`.replace(/^EPSG:\d+\s+/, '');
    } else { dot.className = 'dot'; txt.textContent = GPS.error || 'Buscando GPS…'; }
    GPS.subs = GPS.subs.filter(f => f() !== false);
  }
  const gpsCoords = () => GPS.fix ? { lat: GPS.fix.lat, lon: GPS.fix.lon, alt: GPS.fix.alt, acc: GPS.fix.acc, source: 'gps' } : null;

  /* ---------- lista ---------- */
  function revokeUrls() { S.urls.forEach(URL.revokeObjectURL); S.urls = []; }
  async function loadAll() {
    S.nbs = await DB.all('notebooks');
    if (!S.nbs.length) { const id = await DB.put('notebooks', { name: 'Mi libreta', created: Date.now() }); S.nbs = await DB.all('notebooks'); store.set('nb', id); }
    S.nb = S.nbs.find(n => n.id === store.get('nb')) || S.nbs[0];
    store.set('nb', S.nb.id);
    await refreshList();
  }
  async function refreshList() {
    $('#nbName').textContent = S.nb.name;
    S.entries = (await DB.entriesOf(S.nb.id)).sort((a, b) => b.created - a.created);
    renderList();
  }
  function renderList() {
    revokeUrls();
    const used = [...new Set(S.entries.flatMap(e => e.tags))];
    const tf = $('#tagFilter');
    if (S.filter && !used.includes(S.filter)) S.filter = null;
    tf.hidden = used.length === 0;
    tf.replaceChildren(...used.map(t => el('button', { class: 'chip' + (S.filter === t ? ' on' : ''), text: t, onclick: () => { S.filter = S.filter === t ? null : t; renderList(); } })));
    const list = $('#list'); list.replaceChildren();
    const shown = S.entries.filter(e => !S.filter || e.tags.includes(S.filter));
    if (!shown.length) {
      list.append(el('div', { class: 'empty' }, el('b', { text: S.entries.length ? 'Sin hojas con esa etiqueta' : 'Libreta vacía' }),
        S.entries.length ? '' : 'Toma una foto o abre una pizarra. La ubicación se anota sola.'));
      return;
    }
    for (const e of shown) {
      const url = e.thumb ? URL.createObjectURL(e.thumb) : ''; if (url) S.urls.push(url);
      const co = e.coords ? Render.coordText(e, settings.crs).replace(/\s+m s\.n\.m\./, '') : 'Sin coordenadas';
      list.append(el('button', { class: 'card', onclick: () => openEntry(e) },
        el('img', { src: url, alt: '', loading: 'lazy' }),
        el('div', { class: 'info' },
          el('div', { class: 'when', text: `${e.type === 'board' ? '🧾 ' + (e.title || 'Pizarra') : '📷 Foto'} · ${Render.fmtDate(e.created)}` }),
          e.tags.length ? el('div', { class: 'tags' }, e.tags.map(t => el('span', { class: 'tag', style: `background:${Render.tagColor(t)}`, text: t }))) : null,
          el('div', { class: 'co', text: co }),
          e.note ? el('div', { class: 'nt', text: e.note }) : null)));
    }
  }

  /* ---------- panel de datos (etiquetas, nota, coordenadas) ---------- */
  function newEntry(type) {
    return { nb: S.nb.id, type, created: Date.now(), tags: [], note: '', coords: gpsCoords(), stampCrs: settings.crs, stampOn: true };
  }
  function chip(text, on, fn, cls = '') { return el('button', { type: 'button', class: `chip ${on ? 'on' : ''} ${cls}`, text, onclick: fn }); }

  function equivList(c) {
    const box = el('div');
    const rec = Geo.suggestZone(c.lon);
    for (const crs of Geo.CRS) {
      const d = Geo.describe(crs.id, c.lat, c.lon);
      box.append(el('button', { type: 'button', class: 'eq' + (crs.id === rec ? ' rec' : ''), onclick: () => { navigator.clipboard && navigator.clipboard.writeText(d.text).then(() => toast('Copiado: ' + d.text)); } },
        el('span', {}, el('b', { text: `EPSG:${crs.id} · ${crs.name}` }), d.text), el('span', { text: '⧉' })));
    }
    box.append(el('div', { class: 'eq' }, el('span', {}, el('b', { text: 'Grados, minutos, segundos' }), `${Geo.dms(c.lat, 'N', 'S')}  ${Geo.dms(c.lon, 'E', 'O')}`), el('span')));
    return box;
  }

  function metaPanel(entry, onChange, opts = {}) {
    const root = el('div', { style: 'display:flex;flex-direction:column;gap:14px' });
    /* Etiquetas */
    const tagBox = el('div', { class: 'chips' });
    const newTag = el('input', { type: 'text', placeholder: 'Nueva etiqueta…', enterkeyhint: 'done', maxlength: 28 });
    const addTag = () => {
      const t = newTag.value.trim().replace(/\s+/g, ' ').slice(0, 28); if (!t) return;
      const ex = settings.tags.find(x => x.toLowerCase() === t.toLowerCase()) || t;
      if (!settings.tags.includes(ex)) { settings.tags.push(ex); store.set('tags', settings.tags); }
      if (!entry.tags.includes(ex)) entry.tags.push(ex);
      newTag.value = ''; drawTags(); onChange();
    };
    newTag.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
    function drawTags() {
      const all = [...settings.tags, ...entry.tags.filter(t => !settings.tags.includes(t))];
      tagBox.replaceChildren(...all.map(t => chip(t, entry.tags.includes(t), () => {
        entry.tags = entry.tags.includes(t) ? entry.tags.filter(x => x !== t) : [...entry.tags, t]; drawTags(); onChange();
      })));
    }
    drawTags();
    const last = store.get('lastTags', []);
    root.append(el('div', { class: 'sec' }, el('h3', { text: 'Etiquetas' }), tagBox,
      el('div', { class: 'row' }, newTag, el('button', { type: 'button', class: 'btn sm', text: 'Añadir', onclick: addTag }),
        last.length ? el('button', { type: 'button', class: 'btn sm', text: '↺ Últimas', title: 'Repetir etiquetas de la hoja anterior', onclick: () => { entry.tags = [...last]; drawTags(); onChange(); } }) : null)));
    /* Nota */
    const note = el('textarea', { placeholder: 'Observaciones, descripción, número de muestra…', value: entry.note });
    note.value = entry.note; note.addEventListener('input', () => { entry.note = note.value; onChange(); });
    root.append(el('div', { class: 'sec' }, el('h3', { text: 'Nota' }), note));

    /* Coordenadas */
    const coordSec = el('div', { class: 'sec' }, el('h3', { text: 'Coordenadas' }));
    const mode = { v: entry.coords ? (entry.coords.source === 'manual' ? 'manual' : 'gps') : (opts.isNew ? 'gps' : 'none') };
    const segBox = el('div', { class: 'seg' }), body = el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    const eqBox = el('details', {}, el('summary', { text: 'Ver en todos los sistemas' }));
    function seg() {
      segBox.replaceChildren(...[['gps', '📍 GPS'], ['manual', '✍️ Manual'], ['none', 'Sin coords']].map(([k, t]) =>
        el('button', { type: 'button', class: mode.v === k ? 'on' : '', text: t, onclick: () => setMode(k) })));
    }
    function setMode(k) {
      mode.v = k;
      if (k === 'none') entry.coords = null;
      else if (k === 'gps') { entry.coords = (entry.coords && entry.coords.source === 'gps') ? entry.coords : gpsCoords(); }
      else if (!entry.coords || entry.coords.source !== 'manual') entry.coords = entry.coords ? { ...entry.coords, source: 'manual', acc: null } : null;
      seg(); drawBody(); onChange();
    }
    const refs = {};
    function drawBody() {
      body.replaceChildren(); eqBox.hidden = true;
      if (mode.v === 'none') { body.append(el('div', { class: 'hint', text: 'Esta hoja no llevará coordenadas.' })); return; }
      if (mode.v === 'gps') {
        const info = el('div', { class: 'fix' });
        const upd = () => {
          const c = entry.coords;
          info.replaceChildren(c ? document.createTextNode(`${Geo.fmtLat(c.lat)}   ${Geo.fmtLon(c.lon)}`) : document.createTextNode(GPS.error || 'Esperando señal GPS…'),
            c && c.acc ? el('div', { class: 'hint', text: `Precisión ±${Math.round(c.acc)} m${c.alt != null && !isNaN(c.alt) ? ` · altitud ${Math.round(c.alt)} m` : ''} · ${Render.fmtDate(c.t || entry.created)}` }) : '');
        };
        upd();
        body.append(info, el('button', { type: 'button', class: 'btn sm', text: '↻ Actualizar con mi posición', onclick: () => {
          const c = gpsCoords(); if (!c) return toast('Aún no hay señal GPS');
          c.t = Date.now(); entry.coords = c; upd(); fillEq(); onChange(); toast('Posición actualizada');
        } }));
        fillEq(); return;
      }
      /* manual */
      const cur = entry.coords;
      refs.crs = el('select', {}, Geo.CRS.map(c => el('option', { value: c.id, text: `EPSG:${c.id} · ${c.name}` })));
      refs.crs.value = String(manualCrs.v);
      refs.a = el('input', { type: 'text', inputmode: 'text', autocomplete: 'off' });
      refs.b = el('input', { type: 'text', inputmode: 'text', autocomplete: 'off' });
      refs.alt = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'm s.n.m. (opcional)', autocomplete: 'off' });
      refs.msg = el('div', { class: 'warn' });
      const labels = el('div', { class: 'row' });
      const fields = () => {
        const geo = Geo.byId(manualCrs.v).kind === 'geo';
        labels.replaceChildren(el('label', { class: 'f' }, geo ? 'Latitud' : 'Este (X)', refs.a), el('label', { class: 'f' }, geo ? 'Longitud' : 'Norte (Y)', refs.b));
        refs.a.placeholder = geo ? '4.596200  ó  4°35\'46"N' : '1000000.00';
        refs.b.placeholder = geo ? '-74.077508  ó  74°04\'39"O' : '1000000.00';
        refs.a.inputMode = refs.b.inputMode = geo ? 'text' : 'decimal';
      };
      fields();
      const load = () => {
        if (!entry.coords) { refs.a.value = refs.b.value = ''; return; }
        const [a, b] = Geo.fromLatLon(manualCrs.v, entry.coords.lat, entry.coords.lon);
        const geo = Geo.byId(manualCrs.v).kind === 'geo';
        refs.a.value = a.toFixed(geo ? 7 : 2); refs.b.value = b.toFixed(geo ? 7 : 2);
        refs.alt.value = entry.coords.alt != null && !isNaN(entry.coords.alt) ? String(Math.round(entry.coords.alt)) : '';
      };
      load();
      const read = () => {
        const geo = Geo.byId(manualCrs.v).kind === 'geo';
        const a = geo ? Geo.parseAngle(refs.a.value, true) : Geo.parsePlane(refs.a.value);
        const b = geo ? Geo.parseAngle(refs.b.value, false) : Geo.parsePlane(refs.b.value);
        refs.a.classList.toggle('bad', refs.a.value !== '' && isNaN(a)); refs.b.classList.toggle('bad', refs.b.value !== '' && isNaN(b));
        refs.msg.textContent = '';
        if (isNaN(a) || isNaN(b)) { if (refs.a.value && refs.b.value) refs.msg.textContent = 'Revisa el formato de los valores.'; return; }
        const [lat, lon] = Geo.toLatLon(manualCrs.v, a, b);
        if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { refs.msg.textContent = 'Valores fuera de rango para este sistema.'; return; }
        if (!Geo.inColombia(lat, lon)) refs.msg.textContent = '⚠ La posición queda fuera de Colombia; verifica el sistema (EPSG) elegido.';
        const alt = parseFloat(String(refs.alt.value).replace(',', '.'));
        entry.coords = { lat, lon, alt: isNaN(alt) ? null : alt, acc: null, source: 'manual' };
        fillEq(); onChange();
      };
      refs.crs.addEventListener('change', () => { manualCrs.v = Number(refs.crs.value); store.set('manualCrs', manualCrs.v); fields(); load(); read(); });
      [refs.a, refs.b, refs.alt].forEach(i => i.addEventListener('input', read));
      body.append(el('label', { class: 'f' }, 'Sistema de referencia', refs.crs), labels,
        el('label', { class: 'f' }, 'Altitud', refs.alt), refs.msg,
        el('div', { class: 'hint', text: 'Acepta decimales, coma decimal o grados-minutos-segundos. MAGNA-SIRGAS ≈ WGS84.' }));
      fillEq();
    }
    function fillEq() {
      const c = entry.coords; eqBox.hidden = !c;
      eqBox.replaceChildren(el('summary', { text: 'Ver en todos los sistemas' }), c ? equivList(c) : '');
    }
    const manualCrs = { v: store.get('manualCrs', settings.crs) };
    if (!Geo.byId(manualCrs.v)) manualCrs.v = 9377;
    seg(); drawBody();
    GPS.subs.push(() => {
      if (!root.isConnected) return false;
      if (mode.v === 'gps' && !entry.coords && GPS.fix) { entry.coords = gpsCoords(); entry.coords.t = Date.now(); drawBody(); onChange(); }
    });
    coordSec.append(segBox, body, eqBox);

    /* Sello */
    const stampCrs = el('select', {}, Geo.CRS.map(c => el('option', { value: c.id, text: `EPSG:${c.id} · ${c.name}` })));
    stampCrs.value = String(entry.stampCrs || settings.crs);
    stampCrs.addEventListener('change', () => { entry.stampCrs = Number(stampCrs.value); settings.crs = entry.stampCrs; store.set('crs', settings.crs); gpsUi(); onChange(); });
    coordSec.append(el('label', { class: 'f' }, opts.photo ? 'Mostrar en el sello como' : 'Mostrar en el encabezado como', stampCrs));
    if (opts.photo) {
      const cb = el('input', { type: 'checkbox' }); cb.checked = entry.stampOn !== false;
      cb.addEventListener('change', () => { entry.stampOn = cb.checked; onChange(); });
      coordSec.append(el('label', { class: 'check' }, cb, 'Estampar etiquetas y coordenadas en la foto'));
    }
    root.append(coordSec);
    return root;
  }

  /* ---------- guardar ---------- */
  async function saveEntry(entry, thumbCanvas) {
    entry.thumb = await Exp.toBlob(thumbCanvas, 'image/jpeg', 0.8);
    entry.id = await DB.put('entries', entry);
    if (entry.tags.length) {
      store.set('lastTags', entry.tags);
      settings.tags = [...entry.tags, ...settings.tags.filter(t => !entry.tags.includes(t))];
      store.set('tags', settings.tags);
    }
    await refreshList();
  }
  function thumbOf(c, w = 360) {
    const k = Math.min(1, w / Math.max(c.width, c.height)), t = document.createElement('canvas');
    t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
    t.getContext('2d').drawImage(c, 0, 0, t.width, t.height); return t;
  }

  /* ---------- editor de foto ---------- */
  async function fileToStored(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
    return { blob: await Exp.toBlob(c, 'image/jpeg', 0.9), w: c.width, h: c.height };
  }
  async function editPhoto(entry, isNew) {
    const bmp = await createImageBitmap(entry.blob);
    const view = el('canvas'), prev = el('div', { class: 'preview' }, view);
    let raf = 0;
    const draw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const c = Render.photo(entry, bmp, 1100); view.width = c.width; view.height = c.height; view.getContext('2d').drawImage(c, 0, 0); }); };
    const finish = () => bmp.close && bmp.close();
    sheet(isNew ? 'Nueva foto' : 'Foto', (api) => {
      api.body.style.padding = '0'; api.body.style.gap = '0';
      const annotate = () => {
        const W = 1000, H = Math.round(1000 * bmp.height / bmp.width);
        annotator(entry, {
          W, H, ink: () => 'photo', doneText: 'Listo',
          render: (e, cv) => { const c = Render.photo(e, bmp, 1400); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); },
          onDone: (close) => { close(); draw(); }, onCancel: draw
        });
      };
      view.style.cursor = 'pointer'; view.addEventListener('click', annotate);
      const inner = el('div', { style: 'padding:14px;display:flex;flex-direction:column;gap:14px' },
        el('button', { class: 'btn acc', text: '✏️ Dibujar y poner etiquetas sobre la foto', onclick: annotate }),
        metaPanel(entry, draw, { photo: true, isNew }));
      api.body.append(prev, inner); draw();
      const save = async (again) => {
        try {
          await saveEntry(entry, thumbOf(Render.photo(entry, bmp, 480)));
          api.close(); toast('Guardada ✓');
          if (again) setTimeout(() => $('#camIn').click(), 50);
        } catch (err) { toast('No se pudo guardar: ' + err.message, 4000); }
      };
      if (!isNew) api.foot.append(el('button', { class: 'btn danger', text: 'Eliminar', onclick: () => delEntry(entry, api) }));
      if (isNew) api.foot.append(el('button', { class: 'btn', text: 'Guardar y otra 📷', onclick: () => save(true) }));
      api.foot.append(el('button', { class: 'btn pri', text: 'Guardar', onclick: () => save(false) }));
    }, { tall: true, onClose: finish });
  }
  async function delEntry(entry, api) {
    if (!confirm('¿Eliminar esta hoja? No se puede deshacer.')) return;
    await DB.del('entries', entry.id); api.close(); await refreshList(); toast('Hoja eliminada');
  }
  async function openEntry(e) {
    const entry = structuredClone({ ...e, thumb: undefined });
    if (e.type === 'board') editBoard(entry, false); else editPhoto(entry, false);
  }
  async function onPicked(input) {
    const f = input.files[0]; input.value = ''; if (!f) return;
    try {
      toast('Procesando foto…', 1500);
      const { blob, w, h } = await fileToStored(f);
      const entry = newEntry('photo'); entry.blob = blob; entry.w = w; entry.h = h;
      if (entry.coords) entry.coords.t = Date.now();
      $('#toast').classList.remove('show');
      editPhoto(entry, true);
    } catch (err) { toast('No se pudo abrir la imagen', 3500); }
  }

  /* ---------- anotaciones: trazos, etiquetas, deshacer/rehacer ---------- */
  const SIZES = [{ n: 'S', v: 0.75 }, { n: 'M', v: 1 }, { n: 'L', v: 1.5 }];
  function labelSheet(init, ok, del) {
    let size = init.s || 1;
    sheet(init.id ? 'Editar etiqueta' : 'Nueva etiqueta', (api) => {
      const inp = el('input', { type: 'text', placeholder: 'Texto de la etiqueta…', maxlength: 40, enterkeyhint: 'done' });
      inp.value = init.text || '';
      const done = (t) => {
        t = (t == null ? inp.value : t).trim();
        if (!t) return toast('Escribe un texto');
        api.close(); ok({ text: t, s: size });
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } });
      const sizeSeg = el('div', { class: 'seg' });
      const drawSeg = () => sizeSeg.replaceChildren(...SIZES.map(z => el('button', { type: 'button', class: size === z.v ? 'on' : '', text: z.n, onclick: () => { size = z.v; drawSeg(); } })));
      drawSeg();
      api.body.append(
        el('div', { class: 'sec' }, el('h3', { text: init.id ? 'Texto' : 'Toca una etiqueta rápida o escribe una' }),
          el('div', { class: 'chips' }, settings.tags.map(t => chip(t, false, () => init.id ? (inp.value = t) : done(t)))), inp),
        el('div', { class: 'sec' }, el('h3', { text: 'Tamaño' }), sizeSeg));
      if (del) api.foot.append(el('button', { class: 'btn danger', text: 'Borrar', onclick: () => { api.close(); del(); } }));
      api.foot.append(el('button', { class: 'btn pri', text: init.id ? 'Aplicar' : 'Añadir etiqueta', onclick: () => done() }));
      setTimeout(() => init.id && inp.focus(), 250);
    });
  }

  /** Editor a pantalla completa. cfg: { W, H, ink(), render(entry, canvas), barExtra, extraTools, doneText, onDone(close), onCancel } */
  function annotator(entry, cfg) {
    entry.strokes = entry.strokes || []; entry.labels = entry.labels || [];
    const { W, H } = cfg;
    const st = { color: 0, size: 6, tool: 'pen', cur: null, sel: null, drag: null };
    const undo = [], redo = [];
    const snap = () => ({ strokes: [...entry.strokes], labels: entry.labels.map(l => ({ ...l })) });
    const restore = (x) => { entry.strokes = [...x.strokes]; entry.labels = x.labels.map(l => ({ ...l })); if (!entry.labels.some(l => l.id === st.sel)) st.sel = null; };
    const initial = snap();
    const commit = () => { undo.push(snap()); if (undo.length > 150) undo.shift(); redo.length = 0; };
    const cv = el('canvas'), stage = el('div', { class: 'stage' }, cv), root = el('div', { class: 'full' });
    let raf = 0;
    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        Render.selected = st.sel;
        cfg.render(st.cur ? { ...entry, strokes: [...entry.strokes, st.cur] } : entry, cv);
        Render.selected = null; fit();
      });
    };
    const fit = () => {
      const r = stage.getBoundingClientRect(), k = Math.min((r.width - 16) / W, (r.height - 16) / H);
      cv.style.width = Math.floor(W * k) + 'px'; cv.style.height = Math.floor(H * k) + 'px';
    };
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    const hit = (x, y) => {
      for (let i = entry.labels.length - 1; i >= 0; i--) {
        const g = Render.labelGeom(entry.labels[i], W), pad = W / 60;
        if (x >= g.x0 - pad && x <= g.x1 + pad && y >= g.y0 - pad && y <= g.y1 + pad) return entry.labels[i];
      }
      return null;
    };
    const close = () => { removeEventListener('resize', fit); removeEventListener('keydown', keys); cancelAnimationFrame(raf); root.remove(); };
    const doUndo = () => { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); drawTools(); redraw(); };
    const doRedo = () => { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); drawTools(); redraw(); };
    const delSel = () => {
      const l = entry.labels.find(x => x.id === st.sel);
      if (!l) return toast('Elige 👆 y toca una etiqueta para borrarla. Para trazos usa 🧽 o 🧹.', 3500);
      commit(); entry.labels = entry.labels.filter(x => x !== l); st.sel = null; drawTools(); redraw();
    };
    const clearAll = () => {
      if (!entry.strokes.length && !entry.labels.length) return toast('No hay nada que borrar');
      commit(); entry.strokes = []; entry.labels = []; st.sel = null; drawTools(); redraw(); toast('Todo borrado · ↶ para deshacer');
    };
    const editLabel = (l) => labelSheet(l, (r) => { commit(); Object.assign(l, r); redraw(); }, () => { commit(); entry.labels = entry.labels.filter(x => x !== l); st.sel = null; drawTools(); redraw(); });
    const addLabel = () => labelSheet({ text: '', s: 1 }, (r) => {
      commit();
      const l = { id: Date.now() + Math.random(), x: W / 2, y: H * 0.42, text: r.text, s: r.s };
      entry.labels.push(l); st.sel = l.id; st.tool = 'select'; drawTools(); redraw(); toast('Arrastra la etiqueta al punto que quieres señalar', 3500);
    });
    function keys(e) {
      if (document.querySelector('.sheet-bg') || /INPUT|TEXTAREA/.test((e.target || {}).tagName)) return;
      const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z', y = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y';
      if (z && e.shiftKey || y) { e.preventDefault(); doRedo(); } else if (z) { e.preventDefault(); doUndo(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); delSel(); }
    }
    addEventListener('keydown', keys);

    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      const [x, y] = pt(e);
      if (st.tool === 'select') {
        const l = hit(x, y), was = st.sel;
        st.sel = l ? l.id : null;
        st.drag = l ? { l, dx: x - l.x, dy: y - l.y, moved: false, wasSel: was === l.id } : null;
        drawTools(); redraw(); return;
      }
      st.sel = null;
      st.cur = { c: st.color, w: st.tool === 'erase' ? st.size * 3 : st.size, e: st.tool === 'erase', p: [Math.round(x), Math.round(y)] }; redraw();
    });
    cv.addEventListener('pointermove', (e) => {
      if (st.drag) {
        const [x, y] = pt(e), d = st.drag;
        if (!d.moved) { if (Math.hypot(x - d.dx - d.l.x, y - d.dy - d.l.y) < 4) return; commit(); d.moved = true; }
        d.l.x = Math.max(0, Math.min(W, x - d.dx)); d.l.y = Math.max(0, Math.min(H, y - d.dy)); redraw(); return;
      }
      if (!st.cur) return;
      for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) {
        const [x, y] = pt(ev), p = st.cur.p, n = p.length;
        if (Math.hypot(x - p[n - 2], y - p[n - 1]) >= 2) p.push(Math.round(x), Math.round(y));
      }
      redraw();
    });
    const up = () => {
      if (st.drag) { const d = st.drag; st.drag = null; if (!d.moved && d.wasSel) editLabel(d.l); drawTools(); return; }
      if (st.cur) { commit(); entry.strokes.push(st.cur); st.cur = null; drawTools(); redraw(); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    const row1 = el('div', { class: 'tools' }), row2 = el('div', { class: 'tools spread' });
    function drawTools() {
      const ink = Render.INK[cfg.ink()];
      const tb = (txt, on, fn, label, extra = '') => el('button', { class: 'tool' + (on ? ' on' : '') + extra, text: txt, 'aria-label': label, title: label, onclick: fn });
      row1.replaceChildren(
        ...ink.map((c, i) => el('button', { class: 'sw' + (st.tool === 'pen' && st.color === i ? ' on' : ''), style: `background:${c}`, 'aria-label': 'Color ' + (i + 1), onclick: () => { st.color = i; if (st.tool !== 'pen') st.tool = 'pen'; drawTools(); } })),
        el('i', { class: 'sp' }),
        ...[3, 6, 12].map(z => tb(z === 3 ? '·' : z === 6 ? '●' : '⬤', st.size === z, () => { st.size = z; drawTools(); }, 'Grosor')),
        ...(cfg.extraTools ? cfg.extraTools(drawTools, redraw) : []));
      row2.replaceChildren(
        tb('✏️', st.tool === 'pen', () => { st.tool = 'pen'; drawTools(); }, 'Lápiz'),
        tb('🧽', st.tool === 'erase', () => { st.tool = 'erase'; st.sel = null; drawTools(); redraw(); }, 'Borrador'),
        tb('👆', st.tool === 'select', () => { st.tool = 'select'; drawTools(); }, 'Seleccionar y mover etiquetas'),
        tb('🏷', false, addLabel, 'Añadir etiqueta'),
        el('i', { class: 'sp' }),
        tb('↶', false, doUndo, 'Deshacer', undo.length ? '' : ' dim'),
        tb('↷', false, doRedo, 'Rehacer', redo.length ? '' : ' dim'),
        tb('🗑', false, delSel, 'Borrar etiqueta seleccionada', st.sel ? '' : ' dim'),
        tb('🧹', false, clearAll, 'Borrar todo'));
    }
    drawTools();
    const cancel = () => {
      if (undo.length && !confirm('¿Descartar los cambios hechos aquí?')) return;
      restore(initial); close(); cfg.onCancel && cfg.onCancel();
    };
    root.append(
      el('div', { class: 'bar' }, el('button', { class: 'ico', text: '✕', 'aria-label': 'Cerrar', onclick: cancel }), ...(cfg.barExtra || []),
        el('button', { class: 'btn sm acc', text: cfg.doneText || 'Listo', onclick: () => cfg.onDone(close) })),
      stage, row1, row2);
    document.body.append(root); addEventListener('resize', fit); fit(); redraw();
    return { redraw };
  }

  /* ---------- pizarra ---------- */
  const BGS = ['chalk', 'paper', 'grid'], BG_NAMES = { chalk: 'Pizarra', paper: 'Hoja blanca', grid: 'Cuadrícula' };
  function editBoard(entry, isNew) {
    entry.bg = entry.bg || 'chalk';
    const title = el('input', { type: 'text', placeholder: 'Título de la pizarra', maxlength: 38 }); title.value = entry.title || '';
    let ann;
    title.addEventListener('input', () => { entry.title = title.value; ann.redraw(); });
    ann = annotator(entry, {
      W: Render.BOARD_W, H: Render.BOARD_H, doneText: 'Guardar',
      ink: () => entry.bg === 'chalk' ? 'chalk' : 'paper',
      render: (e, cv) => Render.board(e, cv, S.nb.name),
      barExtra: [title, el('button', { class: 'btn sm', text: '🏷 Datos', onclick: () => sheet('Etiquetas y coordenadas', (api) => {
        api.body.append(metaPanel(entry, () => ann.redraw(), { isNew }));
        if (!isNew) api.foot.append(el('button', { class: 'btn danger', text: 'Eliminar hoja', onclick: async () => { await delEntry(entry, api); document.querySelector('.full') && document.querySelector('.full').remove(); } }));
        api.foot.append(el('button', { class: 'btn pri', text: 'Listo', onclick: () => api.close() }));
      }) })],
      extraTools: (drawTools, redraw) => [el('i', { class: 'sp' }), el('button', { class: 'tool', style: 'font-size:.8rem', text: BG_NAMES[entry.bg], onclick: () => { entry.bg = BGS[(BGS.indexOf(entry.bg) + 1) % BGS.length]; drawTools(); redraw(); } })],
      onDone: async (close) => {
        try { Render.selected = null; await saveEntry(entry, thumbOf(Render.board(entry, null, S.nb.name), 360)); close(); toast('Pizarra guardada ✓'); }
        catch (err) { toast('No se pudo guardar: ' + err.message, 4000); }
      }
    });
  }

  /* ---------- menú de libreta ---------- */
  let installEvt;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });

  function menu() {
    sheet('Libreta', (api) => {
      const list = el('div', { class: 'menu-list' });
      S.nbs.forEach(n => list.append(el('button', { class: n.id === S.nb.id ? 'sel' : '', onclick: async () => { S.nb = n; store.set('nb', n.id); S.filter = null; api.close(); await refreshList(); } }, el('span', {}, n.name))));
      list.append(el('button', { onclick: async () => {
        const name = (prompt('Nombre de la nueva libreta:') || '').trim(); if (!name) return;
        const id = await DB.put('notebooks', { name, created: Date.now() }); S.nbs = await DB.all('notebooks'); S.nb = S.nbs.find(x => x.id === id); store.set('nb', id); api.close(); await refreshList();
      } }, '➕ Nueva libreta'));
      const act = (icon, t, sub, fn) => el('button', { onclick: async () => { try { await fn(api); } catch (err) { console.error(err); toast('Error: ' + err.message, 4500); } } }, el('span', { text: icon }), el('span', {}, t, el('small', { text: sub })));
      const need = () => { if (!S.entries.length) { toast('La libreta está vacía'); return false; } return true; };
      const asc = () => [...S.entries].sort((a, b) => a.created - b.created);
      const prog = (i, n) => toast(`Generando… ${i}/${n}`, 60000);
      list.append(
        el('h3', { class: 'hint', text: 'EXPORTAR' }),
        act('📄', 'PDF de la libreta', 'Una hoja por página, con coordenadas', async () => { if (need()) { await Exp.pdf(S.nb, asc(), prog); toast('PDF listo ✓'); } }),
        act('🌍', 'KMZ (Google Earth)', 'Puntos con fotos y coordenadas', async () => { if (need()) { await Exp.kml(S.nb, asc(), true, prog); toast('KMZ listo ✓'); } }),
        act('📍', 'KML (solo puntos)', 'Ligero, sin imágenes', async () => { if (need()) { await Exp.kml(S.nb, asc(), false); toast('KML listo ✓'); } }),
        act('💾', 'Respaldo ZIP', 'Copia completa que se puede importar', async () => { if (need()) { await Exp.backup(S.nb, asc()); toast('Respaldo listo ✓'); } }),
        el('h3', { class: 'hint', text: 'OTROS' }),
        act('📥', 'Importar respaldo', 'Restaura un ZIP como libreta nueva', () => $('#impIn').click()),
        act('✏️', 'Renombrar libreta', S.nb.name, async () => { const n = (prompt('Nuevo nombre:', S.nb.name) || '').trim(); if (!n) return; S.nb.name = n; await DB.put('notebooks', S.nb); api.close(); await refreshList(); }),
        act('🏷', 'Gestionar etiquetas', 'Quitar etiquetas de la lista rápida', () => { api.close(); manageTags(); }),
        act('🗑', 'Eliminar esta libreta', 'Borra todas sus hojas', async () => {
          if (!confirm(`¿Eliminar "${S.nb.name}" y todas sus hojas?`)) return;
          await DB.deleteNotebook(S.nb.id); S.nbs = await DB.all('notebooks'); api.close(); await loadAll();
        }));
      if (installEvt) list.append(act('📲', 'Instalar aplicación', 'Añadir a la pantalla de inicio', async () => { installEvt.prompt(); installEvt = null; api.close(); }));
      api.body.append(list);
    });
  }
  function manageTags() {
    sheet('Etiquetas rápidas', (api) => {
      const box = el('div', { class: 'chips' });
      const draw = () => box.replaceChildren(...settings.tags.map(t => chip(t + '  ✕', false, () => { settings.tags = settings.tags.filter(x => x !== t); store.set('tags', settings.tags); draw(); })));
      draw();
      api.body.append(el('div', { class: 'hint', text: 'Toca una etiqueta para quitarla de la lista. Las nuevas se crean al etiquetar una hoja.' }), box,
        el('button', { class: 'btn sm', text: 'Restaurar etiquetas iniciales', onclick: () => { settings.tags = [...DEFAULT_TAGS]; store.set('tags', settings.tags); draw(); } }));
    });
  }
  async function importBackup(file) {
    try {
      toast('Importando…', 60000);
      const d = await Exp.readBackup(file);
      const id = await DB.put('notebooks', { name: d.name + ' (importada)', created: Date.now() });
      for (const e of d.entries) {
        const entry = { ...e, nb: id, tags: e.tags || [], note: e.note || '' };
        const c = entry.type === 'board' ? Render.board(entry, null, d.name) : entry.blob ? Render.photo(entry, await createImageBitmap(entry.blob), 480) : null;
        if (c) entry.thumb = await Exp.toBlob(thumbOf(c), 'image/jpeg', 0.8);
        await DB.put('entries', entry);
      }
      S.nbs = await DB.all('notebooks'); S.nb = S.nbs.find(n => n.id === id); store.set('nb', id);
      document.querySelectorAll('.sheet-bg').forEach(n => n.remove()); await refreshList(); toast(`Importadas ${d.entries.length} hojas ✓`);
    } catch (err) { toast('No se pudo importar: ' + err.message, 5000); }
  }

  /* ---------- ubicación actual ---------- */
  function locationSheet() {
    sheet('Ubicación actual', (api) => {
      const box = el('div');
      const draw = () => {
        box.replaceChildren();
        if (!GPS.fix) { box.append(el('div', { class: 'hint', text: GPS.error || 'Esperando señal GPS… (requiere HTTPS y permiso de ubicación)' })); return; }
        box.append(el('div', { class: 'hint', text: `Precisión ±${Math.round(GPS.fix.acc)} m` + (GPS.fix.alt != null ? ` · altitud ${Math.round(GPS.fix.alt)} m` : '') }), equivList(GPS.fix));
      };
      draw(); GPS.subs.push(() => box.isConnected ? draw() : false); api.body.append(box);
    });
  }

  /* ---------- arranque ---------- */
  $('#nbBtn').onclick = menu;
  $('#gpsChip').onclick = locationSheet;
  $('#btnPhoto').onclick = () => $('#camIn').click();
  $('#btnGallery').onclick = () => $('#galIn').click();
  $('#btnBoard').onclick = () => editBoard(newEntry('board'), true);
  $('#camIn').onchange = (e) => onPicked(e.target);
  $('#galIn').onchange = (e) => onPicked(e.target);
  $('#impIn').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importBackup(f); };

  loadAll().then(() => { gpsStart(); }).catch(err => { toast('Error al abrir la base de datos: ' + err.message, 6000); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__app = { S, GPS, settings };
})();
