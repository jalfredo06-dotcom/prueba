/* Dibujo de hojas: sello sobre fotos, pizarras y utilidades de texto. */
(function (root) {
  'use strict';
  const BOARD_W = 1200, BOARD_H = 1600;
  const INK = {
    chalk: ['#f4f1e8', '#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#b388ff'],
    paper: ['#15171a', '#d62828', '#1d4ed8', '#15803d', '#c2410c', '#6d28d9']
  };
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  const tagColor = (t) => {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360;
    return `hsl(${h} 52% 38%)`;
  };

  function wrap(ctx, text, maxW) {
    const out = [];
    for (const para of String(text || '').split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width <= maxW || !line) line = test;
        else { out.push(line); line = word; }
      }
      out.push(line);
    }
    return out;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  /** Dibuja etiquetas en filas; devuelve la y final. Con draw=false solo mide. */
  function pills(ctx, tags, x, y, maxW, fs, draw, color) {
    ctx.font = `600 ${fs}px ${FONT}`;
    const ph = fs * 1.6, px = fs * 0.65, gap = fs * 0.4;
    let cx = x, cy = y;
    for (const t of tags) {
      const w = ctx.measureText(t).width + px * 2;
      if (cx > x && cx + w > x + maxW) { cx = x; cy += ph + gap; }
      if (draw) {
        rr(ctx, cx, cy, w, ph, ph / 2); ctx.fillStyle = color || tagColor(t); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(t, cx + px, cy + ph / 2 + fs * 0.05);
      }
      cx += w + gap;
    }
    return tags.length ? cy + ph : y;
  }

  const fmtDate = (t) => new Date(t).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

  /** Texto de coordenadas de una hoja en el CRS pedido (o null si no hay). */
  function coordText(entry, crsId) {
    const c = entry.coords;
    if (!c) return null;
    const d = Geo.describe(crsId || 4326, c.lat, c.lon);
    let s = `${d.label}  ${d.text}`;
    if (c.alt != null && !isNaN(c.alt)) s += `  ${Math.round(c.alt)} m s.n.m.`;
    s += c.source === 'manual' ? '  (manual)' : c.acc ? `  ±${Math.round(c.acc)} m` : '';
    return s;
  }

  function drawStamp(ctx, w, h, entry) {
    const fs = Math.max(13, Math.round(Math.min(w, h) / 36)), pad = fs * 0.8, maxW = w - pad * 2;
    const small = fs * 0.88;
    const cText = coordText(entry, entry.stampCrs) || 'Sin coordenadas';
    ctx.font = `500 ${small}px ${FONT}`;
    const noteLines = entry.note ? wrap(ctx, entry.note, maxW).slice(0, 3) : [];
    const tagsH = entry.tags.length ? pills(ctx, entry.tags, 0, 0, maxW, small, false) + fs * 0.45 : 0;
    const bandH = pad * 2 + tagsH + fs * 1.35 + small * 1.3 + noteLines.length * small * 1.3;
    const y0 = h - bandH;
    const g = ctx.createLinearGradient(0, y0 - fs, 0, h);
    g.addColorStop(0, 'rgba(8,16,12,0)'); g.addColorStop(0.18, 'rgba(8,16,12,.72)'); g.addColorStop(1, 'rgba(8,16,12,.88)');
    ctx.fillStyle = g; ctx.fillRect(0, y0 - fs, w, bandH + fs);
    let y = y0 + pad * 0.4;
    ctx.textBaseline = 'top';
    if (entry.tags.length) { y = pills(ctx, entry.tags, pad, y, maxW, small, true) + fs * 0.45; }
    ctx.fillStyle = '#fff'; ctx.font = `700 ${fs}px ${FONT}`;
    ctx.fillText(cText, pad, y); y += fs * 1.35;
    ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.font = `500 ${small}px ${FONT}`;
    ctx.fillText(fmtDate(entry.created), pad, y); y += small * 1.3;
    for (const l of noteLines) { ctx.fillText(l, pad, y); y += small * 1.3; }
  }

  /** Foto (ImageBitmap) con el sello opcional. Devuelve un canvas de ancho máximo `maxDim` en el lado mayor. */
  function photo(entry, bmp, maxDim) {
    const k = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0, w, h);
    if (entry.stampOn !== false) drawStamp(ctx, w, h, entry);
    return c;
  }

  let layer;
  function drawStrokes(ctx, strokes, bg) {
    layer = layer || document.createElement('canvas');
    layer.width = BOARD_W; layer.height = BOARD_H;
    const l = layer.getContext('2d');
    const ink = INK[bg === 'chalk' ? 'chalk' : 'paper'];
    l.lineCap = 'round'; l.lineJoin = 'round';
    for (const s of strokes) {
      l.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
      l.strokeStyle = s.e ? '#000' : ink[s.c] || ink[0]; l.fillStyle = l.strokeStyle; l.lineWidth = s.w;
      const p = s.p;
      if (p.length === 2) { l.beginPath(); l.arc(p[0], p[1], s.w / 2, 0, 7); l.fill(); continue; }
      l.beginPath(); l.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length - 2; i += 2) l.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
      l.lineTo(p[p.length - 2], p[p.length - 1]); l.stroke();
    }
    ctx.drawImage(layer, 0, 0);
  }

  /** Pizarra completa en 1200×1600 sobre `canvas` (se crea si no se pasa). */
  function board(entry, canvas, nbName) {
    const c = canvas || document.createElement('canvas');
    c.width = BOARD_W; c.height = BOARD_H;
    const ctx = c.getContext('2d'), bg = entry.bg || 'chalk';
    const chalk = bg === 'chalk', fg = chalk ? '#e9efe6' : '#1d2b24';
    ctx.fillStyle = chalk ? '#243d33' : '#fdfcf8'; ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    if (chalk) {
      const g = ctx.createRadialGradient(600, 800, 200, 600, 800, 1100);
      g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    }
    if (bg === 'grid') {
      ctx.strokeStyle = 'rgba(40,90,140,.18)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= BOARD_W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, BOARD_H); }
      for (let y = 0; y <= BOARD_H; y += 50) { ctx.moveTo(0, y); ctx.lineTo(BOARD_W, y); }
      ctx.stroke();
    }
    drawStrokes(ctx, entry.strokes || [], bg);
    // Encabezado fijo (no se borra)
    ctx.textBaseline = 'top'; ctx.fillStyle = fg;
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText((entry.title || nbName || 'Pizarra').slice(0, 38), 40, 30);
    ctx.font = `500 28px ${FONT}`; ctx.globalAlpha = 0.85;
    const t = fmtDate(entry.created); ctx.textAlign = 'right'; ctx.fillText(t, BOARD_W - 40, 38); ctx.textAlign = 'left';
    ctx.fillText(coordText(entry, entry.stampCrs) || 'Sin coordenadas', 40, 88);
    ctx.globalAlpha = 1;
    let y = 134;
    if (entry.tags.length) { y = pills(ctx, entry.tags, 40, y, BOARD_W - 80, 26, true) + 10; }
    ctx.strokeStyle = chalk ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.25)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(40, y + 6); ctx.lineTo(BOARD_W - 40, y + 6); ctx.stroke();
    if (chalk) { ctx.strokeStyle = '#8b5e34'; ctx.lineWidth = 16; ctx.strokeRect(8, 8, BOARD_W - 16, BOARD_H - 16); }
    return c;
  }

  root.Render = { BOARD_W, BOARD_H, INK, FONT, tagColor, wrap, rr, pills, fmtDate, coordText, photo, board };
})(self);
