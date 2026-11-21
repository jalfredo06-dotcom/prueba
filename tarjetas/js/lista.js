// Lectura de listas de nombres: .txt, .csv (UTF-8 o Windows/Excel) y .xlsx (Excel).

// Texto de un archivo: intenta UTF-8 y, si hay caracteres inválidos, Windows-1252 (CSV de Excel en Windows).
async function readText(file) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

// Primera columna de cada línea. sep = true divide también por , ; y tabulador.
export function parseLines(text, sep) {
  return text.split(/\r?\n/)
    .map((l) => (sep ? l.split(/[;,\t]/)[0] : l.split('\t')[0]))
    .map((l) => l.replace(/^\s*["']|["']\s*$/g, '').trim())
    .filter(Boolean);
}

const HEADER = /^(nombres?|names?|invitados?|lista)$/i;
const dropHeader = (rows) => (rows.length && HEADER.test(rows[0]) ? rows.slice(1) : rows);

// ---------- Excel .xlsx (es un ZIP con XML adentro) ----------
async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('sin-descompresion');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

async function zipEntries(buf) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('no-zip');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const files = {};
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const size = dv.getUint32(p + 20, true);
    const nLen = dv.getUint16(p + 28, true), xLen = dv.getUint16(p + 30, true), cLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nLen));
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    files[name] = { method, bytes: new Uint8Array(buf, start, size) };
    p += 46 + nLen + xLen + cLen;
  }
  return files;
}

async function readXlsx(file) {
  const files = await zipEntries(await file.arrayBuffer());
  const text = async (name) => {
    const f = files[name];
    if (!f) return null;
    return f.method === 8 ? inflate(f.bytes) : new TextDecoder().decode(f.bytes);
  };
  const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const shared = [];
  const ss = await text('xl/sharedStrings.xml');
  if (ss) xml(ss).querySelectorAll('si').forEach((si) => shared.push([...si.getElementsByTagName('t')].map((t) => t.textContent).join('')));
  const sheetName = files['xl/worksheets/sheet1.xml'] ? 'xl/worksheets/sheet1.xml'
    : Object.keys(files).filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n)).sort()[0];
  const sheet = sheetName && (await text(sheetName));
  if (!sheet) return [];
  const rows = [];
  xml(sheet).querySelectorAll('row').forEach((row) => {
    // Primera celda con contenido de cada fila.
    for (const c of row.getElementsByTagName('c')) {
      const type = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0];
      let val = '';
      if (type === 's' && v) val = shared[+v.textContent] || '';
      else if (type === 'inlineStr') val = [...c.getElementsByTagName('t')].map((t) => t.textContent).join('');
      else if (v) val = v.textContent;
      val = val.trim();
      if (val) { rows.push(val); break; }
    }
  });
  return rows;
}

// Devuelve la lista de nombres del archivo (sin encabezado). Lanza error con .message legible.
export async function readNamesFile(file) {
  const name = file.name.toLowerCase();
  if (/\.xlsx$/.test(name)) {
    try { return dropHeader(await readXlsx(file)); }
    catch { throw new Error('No se pudo leer el Excel. Guárdalo como "CSV" o copia la columna de nombres y pégala en el recuadro.'); }
  }
  if (/\.(xls|numbers|ods|docx?|pdf)$/.test(name)) {
    throw new Error('Ese formato no se puede leer. Guarda la lista como .xlsx, .csv o .txt, o copia y pega los nombres en el recuadro.');
  }
  const text = await readText(file);
  const csv = /\.csv$/.test(name) || /[;\t]/.test(text);
  return dropHeader(parseLines(text, csv));
}
