/* Persistencia local (IndexedDB): libretas y hojas (fotos / pizarras). */
(function (root) {
  'use strict';
  let dbp;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('libreta-campo', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore('notebooks', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true }).createIndex('nb', 'nb');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode), s = t.objectStore(store);
      const rq = fn(s);
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  root.DB = {
    put: (store, v) => tx(store, 'readwrite', s => s.put(v)),
    get: (store, id) => tx(store, 'readonly', s => s.get(id)),
    all: (store) => tx(store, 'readonly', s => s.getAll()),
    del: (store, id) => tx(store, 'readwrite', s => s.delete(id)),
    entriesOf: (nb) => tx('entries', 'readonly', s => s.index('nb').getAll(nb)),
    async deleteNotebook(id) {
      const es = await this.entriesOf(id);
      for (const e of es) await this.del('entries', e.id);
      await this.del('notebooks', id);
    }
  };
})(self);
