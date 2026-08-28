/* =========================================================
   ad. studio — LOCAL data layer (Simple mode)
   IndexedDB first, localStorage fallback, in-memory last.
   ========================================================= */
(function () {
  "use strict";

  var NS = "adstudio";
  var DB_NAME = "adstudio-db";
  var DB_VERSION = 1;
  var COLLECTIONS = ["projects", "clients", "tasks"];
  var LS_BACKUP_KEY = NS + ".local.v1";

  var memory = { projects: [], clients: [], tasks: [] };
  var db = null;
  var engine = "memory";
  var localStorageOk = false;

  function lsGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function lsSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      localStorageOk = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function requireLS() {
    if (!localStorageOk) {
      try {
        localStorageOk = typeof window.localStorage !== "undefined";
      } catch (e) {
        localStorageOk = false;
      }
    }
    return localStorageOk;
  }

  /* ---------- localStorage backup store ---------- */
  function lsReadAll() {
    try {
      var raw = lsGet(LS_BACKUP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function lsWriteAll(data) {
    if (!requireLS()) return false;
    return lsSet(LS_BACKUP_KEY, JSON.stringify(data));
  }
  function lsGetAll(collection) {
    var data = lsReadAll();
    return data && data[collection] ? data[collection].slice() : [];
  }
  function lsPut(collection, row) {
    var data = lsReadAll() || { projects: [], clients: [], tasks: [] };
    var list = data[collection] || (data[collection] = []);
    var i = list.findIndex(function (r) { return r.id === row.id; });
    if (i >= 0) list[i] = row;
    else list.push(row);
    return lsWriteAll(data);
  }
  function lsDelete(collection, id) {
    var data = lsReadAll() || { projects: [], clients: [], tasks: [] };
    if (!data[collection]) return true;
    data[collection] = data[collection].filter(function (r) { return r.id !== id; });
    return lsWriteAll(data);
  }

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
        COLLECTIONS.forEach(function (name) {
          if (!d.objectStoreNames.contains(name)) {
            d.createObjectStore(name, { keyPath: "id" });
          }
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("IndexedDB open failed")); };
      req.onblocked = function () { reject(new Error("IndexedDB blocked by another tab")); };
    });
  }

  function reqP(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("IndexedDB request failed")); };
    });
  }

  function idbGetAll(collection) {
    return new Promise(function (resolve, reject) {
      var t = db.transaction(collection, "readonly");
      var r = t.objectStore(collection).getAll();
      r.onsuccess = function () { resolve(r.result || []); };
      r.onerror = function () { reject(r.error); };
    });
  }
  function idbPut(collection, row) {
    var t = db.transaction(collection, "readwrite");
    return reqP(t.objectStore(collection).put(row));
  }
  function idbDelete(collection, id) {
    var t = db.transaction(collection, "readwrite");
    return reqP(t.objectStore(collection).delete(id));
  }
  function idbCount(collection) {
    var t = db.transaction(collection, "readonly");
    return reqP(t.objectStore(collection).count());
  }

  /* ---------- public API ---------- */
  function init() {
    var hasIDB = typeof window.indexedDB !== "undefined";
    if (hasIDB) {
      return openDB()
        .then(function (d) {
          db = d;
          engine = "indexeddb";
          // migrate localStorage backup -> IndexedDB on first run
          var backup = lsReadAll();
          if (backup) {
            return Promise.all(
              COLLECTIONS.map(function (c) {
                return idbCount(c).then(function (n) {
                  if (n === 0 && backup[c] && backup[c].length) {
                    return Promise.all(backup[c].map(function (r) { return idbPut(c, r); }));
                  }
                });
              })
            ).then(function () {
              try { window.localStorage.removeItem(LS_BACKUP_KEY); } catch (e) {}
            });
          }
          return null;
        })
        .catch(function () {
          db = null;
          engine = requireLS() ? "localStorage" : "memory";
          return null;
        });
    }
    engine = requireLS() ? "localStorage" : "memory";
    return Promise.resolve(null);
  }

  function getAll(collection) {
    if (db) return idbGetAll(collection);
    if (requireLS()) return Promise.resolve(lsGetAll(collection));
    return Promise.resolve(memory[collection].slice());
  }

  function put(collection, row) {
    if (db) return idbPut(collection, row).then(function () { return row; });
    if (requireLS()) { lsPut(collection, row); return Promise.resolve(row); }
    var list = memory[collection];
    var i = list.findIndex(function (r) { return r.id === row.id; });
    if (i >= 0) list[i] = row;
    else list.push(row);
    return Promise.resolve(row);
  }

  function remove(collection, id) {
    if (db) return idbDelete(collection, id);
    if (requireLS()) { lsDelete(collection, id); return Promise.resolve(true); }
    memory[collection] = memory[collection].filter(function (r) { return r.id !== id; });
    return Promise.resolve(true);
  }

  function engineName() {
    return engine === "indexeddb" ? "IndexedDB" : engine === "localStorage" ? "localStorage" : "in-memory";
  }

  window.AdStudio = window.AdStudio || {};
  window.AdStudio.Db = {
    init: init,
    getAll: getAll,
    put: put,
    remove: remove,
    engineName: engineName,
  };
})();
