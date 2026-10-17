/* Exportación: PDF, KML/KMZ y respaldo ZIP (con importación). */
(function (root) {
  'use strict';
  const toBlob = (c, type = 'image/jpeg', q = 0.88) => new Promise(r => c.toBlob(r, type, q));
  const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
  const safeName = (s) => String(s || 'libreta').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'libreta';
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]));
  const label = (e, i) => e.title || (e.type === 'board' ? 'Pizarra' : 'Foto') + ' ' + (i + 1);

  function save(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  /** Canvas de la hoja ya dibujada (foto con sello / pizarra). */
  async function sheetCanvas(e, nbName, maxDim) {
    if (e.type === 'board') return Render.board(e, null, nbName);
    const bmp = await createImageBitmap(e.blob);
    const c = Render.photo(e, bmp, maxDim); bmp.close && bmp.close();
    return c;
  }

  /* ---------- PDF ---------- */
  const PW = 1240, PH = 1754;
  async function pdf(nb, entries, progress) {
    const pages = [];
    const addPage = async (c) => { const b = await toBlob(c, 'image/jpeg', 0.86); pages.push({ jpeg: await bytes(b), w: c.width, h: c.height }); };
    const newPage = () => {
      const c = document.createElement('canvas'); c.width = PW; c.height = PH;
      const x = c.getContext('2d'); x.fillStyle = '#fbf8ef'; x.fillRect(0, 0, PW, PH); x.textBaseline = 'top';
      return [c, x];
    };
    const F = Render.FONT;
    // Portada
    let [c, x] = newPage();
    x.fillStyle = '#1f3a2f'; x.fillRect(0, 0, PW, 520);
    x.fillStyle = '#f6f1e4'; x.font = `700 40px ${F}`; x.fillText('LIBRETA DE CAMPO', 80, 150);
    x.font = `700 84px Georgia, serif`;
    Render.wrap(x, nb.name, PW - 160).slice(0, 3).forEach((l, i) => x.fillText(l, 80, 215 + i * 96));
    x.fillStyle = '#1d2b24'; x.font = `500 34px ${F}`;
    const dates = entries.map(e => e.created);
    const lines = [
      `${entries.length} hoja${entries.length === 1 ? '' : 's'}`,
      dates.length ? `Registros: ${Render.fmtDate(Math.min(...dates))} – ${Render.fmtDate(Math.max(...dates))}` : '',
      `Exportado: ${Render.fmtDate(Date.now())}`,
      '', 'Coordenadas: MAGNA-SIRGAS ≈ WGS84 (diferencia < 1 m).',
      'Planas: EPSG 9377 (Origen Nacional) y 3114–3118 (zonas).'
    ];
    lines.forEach((l, i) => x.fillText(l, 80, 590 + i * 54));
    await addPage(c);

    for (let i = 0; i < entries.length; i++) {
      progress && progress(i + 1, entries.length);
      const e = entries[i];
      [c, x] = newPage();
      x.fillStyle = '#1f3a2f'; x.fillRect(0, 0, PW, 96);
      x.fillStyle = '#f6f1e4'; x.font = `600 34px ${F}`; x.fillText(nb.name.slice(0, 40), 60, 30);
      x.textAlign = 'right'; x.fillText(`Hoja ${i + 1} / ${entries.length}`, PW - 60, 30); x.textAlign = 'left';
      const img = await sheetCanvas(e, nb.name, 1800);
      const bx = 60, by = 130, bw = PW - 120, bh = 1010, k = Math.min(bw / img.width, bh / img.height);
      const iw = img.width * k, ih = img.height * k;
      x.fillStyle = '#e8e1cd'; x.fillRect(bx, by, bw, bh);
      x.drawImage(img, bx + (bw - iw) / 2, by + (bh - ih) / 2, iw, ih);
      let y = by + bh + 34;
      x.fillStyle = '#1d2b24'; x.font = `700 36px ${F}`;
      x.fillText(`${label(e, i)} · ${Render.fmtDate(e.created)}`, 60, y); y += 56;
      if (e.tags.length) y = Render.pills(x, e.tags, 60, y, PW - 120, 28, true) + 22;
      x.fillStyle = '#1d2b24'; x.font = `500 30px ${F}`;
      if (e.coords) {
        const ids = [...new Set([e.stampCrs || 9377, 4326, 9377, Geo.suggestZone(e.coords.lon)])];
        for (const id of ids) { x.fillText(Render.coordText({ coords: { ...e.coords, source: 'gps', acc: 0 } }, id), 60, y); y += 42; }
      } else { x.fillText('Sin coordenadas', 60, y); y += 42; }
      if (e.note) {
        x.font = `500 30px ${F}`; x.fillStyle = '#3b4a42'; y += 8;
        for (const l of Render.wrap(x, e.note, PW - 120).slice(0, Math.max(1, Math.floor((PH - 50 - y) / 40)))) { x.fillText(l, 60, y); y += 40; }
      }
      await addPage(c);
    }
    save(Pdf.build(pages, 595, 842, nb.name), safeName(nb.name) + '.pdf');
  }

  /* ---------- KML / KMZ ---------- */
  function kmlDoc(nb, entries, withImages) {
    const pm = entries.map((e, i) => {
      if (!e.coords) return '';
      const geo = Geo.describe(4326, e.coords.lat, e.coords.lon), plane = Geo.describe(9377, e.coords.lat, e.coords.lon);
      const img = withImages ? `<p><img src="images/${e.id}.jpg" width="420"/></p>` : '';
      const desc = `${img}<p><b>${esc(e.tags.join(', '))}</b></p><p>${esc(e.note).replace(/\n/g, '<br/>')}</p>` +
        `<p>${esc(geo.label)} ${esc(geo.text)}<br/>${esc(plane.label)} ${esc(plane.text)}</p><p>${esc(Render.fmtDate(e.created))}</p>`;
      const alt = e.coords.alt != null && !isNaN(e.coords.alt) ? e.coords.alt : 0;
      return `<Placemark><name>${esc(label(e, i))}</name><description><![CDATA[${desc}]]></description>` +
        `<TimeStamp><when>${new Date(e.created).toISOString()}</when></TimeStamp>` +
        `<ExtendedData><Data name="etiquetas"><value>${esc(e.tags.join(', '))}</value></Data>` +
        `<Data name="origen"><value>${e.coords.source === 'manual' ? 'manual' : 'gps'}</value></Data></ExtendedData>` +
        `<Point><coordinates>${e.coords.lon.toFixed(8)},${e.coords.lat.toFixed(8)},${alt}</coordinates></Point></Placemark>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(nb.name)}</name>\n${pm}\n</Document></kml>`;
  }
  async function kml(nb, entries, withImages, progress) {
    const te = new TextEncoder();
    if (!withImages) return save(new Blob([kmlDoc(nb, entries, false)], { type: 'application/vnd.google-earth.kml+xml' }), safeName(nb.name) + '.kml');
    const files = [{ name: 'doc.kml', data: te.encode(kmlDoc(nb, entries, true)) }];
    for (let i = 0; i < entries.length; i++) {
      progress && progress(i + 1, entries.length);
      const c = await sheetCanvas(entries[i], nb.name, 1400);
      files.push({ name: `images/${entries[i].id}.jpg`, data: await bytes(await toBlob(c, 'image/jpeg', 0.82)) });
    }
    save(new Blob([Zip.write(files)], { type: 'application/vnd.google-earth.kmz' }), safeName(nb.name) + '.kmz');
  }

  /* ---------- Respaldo ---------- */
  async function backup(nb, entries) {
    const files = [], meta = [];
    for (const e of entries) {
      const m = { type: e.type, created: e.created, tags: e.tags, note: e.note, coords: e.coords, stampCrs: e.stampCrs, stampOn: e.stampOn, title: e.title, bg: e.bg, strokes: e.strokes, w: e.w, h: e.h };
      if (e.blob) { m.file = `media/${e.id}.jpg`; files.push({ name: m.file, data: await bytes(e.blob) }); }
      meta.push(m);
    }
    const json = JSON.stringify({ format: 'libreta-campo', version: 1, exported: Date.now(), notebook: { name: nb.name }, entries: meta });
    files.unshift({ name: 'data.json', data: new TextEncoder().encode(json) });
    save(Zip.write(files), safeName(nb.name) + '_respaldo.zip');
  }
  /** Devuelve { name, entries:[{...sin id, blob?}] } */
  async function readBackup(file) {
    const z = await Zip.read(await file.arrayBuffer());
    if (!z['data.json']) throw new Error('No es un respaldo de la libreta');
    const d = JSON.parse(new TextDecoder().decode(z['data.json']));
    if (d.format !== 'libreta-campo') throw new Error('Formato de respaldo desconocido');
    const entries = d.entries.map(m => {
      const e = { ...m }; delete e.file;
      if (m.file && z[m.file]) e.blob = new Blob([z[m.file]], { type: 'image/jpeg' });
      return e;
    });
    return { name: d.notebook.name, entries };
  }

  root.Exp = { pdf, kml, backup, readBackup, toBlob, sheetCanvas };
})(self);
