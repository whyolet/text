import {decrypt, getDbName, getKey, getSalt} from "./crypto.js";
import {o, showBanner} from "./ui.js";

/// db, stores, conf, mem, onDbError

let db;

const stores = {
  page: "page",
  op: "op",
  conf: "conf",
};

const conf = {
  salt: "salt",
  zoom: "zoom",
  recentTags: "recentTags",
  opIds: "opIds",
};

export const mem = {};

const onDbError = (event) => {
  throw event.target.error;
};

/// updateAppVersion

const updateAppVersion = () => {
  showBanner(o(".header", "Updating..."));
  setTimeout(() => {
    location.reload();
  }, 1000);
};

/// Load from db to mem.

export const load = async () => {
  const dbName = await getDbName();
  const openingDb = indexedDB.open(dbName, 1);

  /// onerror while opening

  openingDb.onerror = (event) => {
    const error = event.target.error;
    if (error.name === "VersionError") {
      updateAppVersion();
    } else throw error;
  };

  /// onupgradeneeded

  openingDb.onupgradeneeded = (event) => {
    db = event.target.result;
    db.onerror = onDbError;
    const oldVersion = event.oldVersion || 0;

    if (oldVersion < 1) {
      db.createObjectStore(stores.conf);
      db.createObjectStore(stores.page);

      db.createObjectStore(stores.op, {
        autoIncrement: true,
      });
    }
  };

  /// onsuccess of openingDb

  openingDb.onsuccess = async (event) => {
    db = event.target.result;
    db.onerror = onDbError;
    db.onversionchange = updateAppVersion;

    await loadConf(conf.salt, getSalt, true);
    mem.key = await getKey(mem.salt);

    await Promise.all([
      loadConf(conf.zoom, () => 100),
      loadConf(conf.recentTags, () => []),

      loadConf(conf.opIds, () => ({
        min: null,
        undone: null,
        max: null,
      })),

      loadPages(),
    ]);
  };
};

/// loadConf

const loadConf = async (id, defaultFn, isPlain) => {
  const event = await new Promise(done => {
    db
    .transaction(stores.conf)
    .objectStore(stores.conf)
    .get(id)
    .onsuccess = done;
  });

  const value = event.target.result;
  mem[id] = (
    value ? (
      isPlain ? value
      : await decrypt(value, mem.key)
    )
    : defaultFn()
  );
};

/// loadPages

const loadPages = async () => {
  const event = await new Promise(done => {
    db
    .transaction(stores.page)
    .objectStore(stores.page)
    .getAll()
    .onsuccess = done;
  });

  const buffers  = event.target.result;

  const pages = await Promise.all(
    buffers.map(buffer => decrypt(buffer, mem.key))
  );

  mem.pages = {};
  for (const page of pages) {
    mem.pages[page.tag] = page;
  }
};

/// close

export const close = () => {
  if (!db) return;
  db.close();
};
