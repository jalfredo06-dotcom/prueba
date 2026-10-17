/* PDF mínimo: una imagen JPEG a página completa por hoja. */
(function (root) {
  'use strict';
  const enc = new TextEncoder();

  /** pages: [{ jpeg: Uint8Array, w, h }]; W,H: tamaño de página en puntos. -> Blob */
  function build(pages, W, H, title) {
    const chunks = [], offsets = [];
    let len = 0;
    const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
    const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };

    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push(`<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`));
    pages.forEach((p, i) => {
      const pg = 3 + i * 3, ct = pg + 1, im = pg + 2;
      obj(pg, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`));
      const stream = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
      obj(ct, () => push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
      obj(im, () => {
        push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
        push(p.jpeg); push('\nendstream');
      });
    });
    const info = 3 + pages.length * 3;
    const safe = String(title || 'Libreta de campo').replace(/[^\x20-\x7E]/g, '?').replace(/[()\\]/g, '');
    obj(info, () => push(`<< /Title (${safe}) /Producer (Libreta de campo) >>`));
    const xref = len;
    push(`xref\n0 ${info + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= info; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  root.Pdf = { build };
})(typeof self !== 'undefined' ? self : globalThis);
