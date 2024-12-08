import {decrypt, encrypt, getDbName, getKey, getSalt, setKey} from "./crypto.js";
import {o, showBanner} from "./ui.js";

/// idb, stores, conf, mem

let idb;

const stores = Object.seal({
  page: "page",
  op: "op",
  conf: "conf",
});

const conf = Object.seal({
  salt: "salt",
  zoom: "zoom",
  recentTags: "recentTags",
  opIds: "opIds",
});

export const mem = Object.seal({
  salt: null,
  zoom: null,
  recentTags: null,
  opIds: null,
  pages: null,
  tag: null,
});

/// onDbError, updateAppVersion

const onDbError = (event) => {
  throw event.target.error;
};

const updateAppVersion = () => {
  showBanner({},
    o(".header", "Updating..."),
  );
  setTimeout(() => {
    location.reload();
  }, 1000);
};

/// Load from db to mem.

export const load = async () => await new Promise(async (doneLoading) => {
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
    const idb = event.target.result;
    idb.onerror = onDbError;
    const oldVersion = event.oldVersion || 0;

    if (oldVersion < 1) {
      idb.createObjectStore(stores.conf);
      idb.createObjectStore(stores.page);

      idb.createObjectStore(stores.op, {
        autoIncrement: true,
      });
    }
  };

  /// onsuccess of openingDb

  openingDb.onsuccess = async (event) => {
    idb = event.target.result;  // module-level
    idb.onerror = onDbError;
    idb.onversionchange = updateAppVersion;

    await loadOrCreateSalt();
    setKey(await getKey(mem.salt));

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

    doneLoading();
  };
});

/// loadOrCreateSalt

const loadOrCreateSalt = async () => {
  const event = await new Promise(done => {
    idb
    .transaction(stores.conf)
    .objectStore(stores.conf)
    .get(conf.salt)
    .onsuccess = done;
  });

  mem.salt = event.target.result;
  if (mem.salt) return;

  mem.salt = getSalt();
  await new Promise(done => {
    idb
    .transaction(stores.conf, "readwrite")
    .objectStore(stores.conf)
    .put(mem.salt, conf.salt)
    .onsuccess = done;
  });
};

/// loadConf

const loadConf = async (id, getDefault) => {
  const event = await new Promise(done => {
    idb
    .transaction(stores.conf)
    .objectStore(stores.conf)
    .get(id)
    .onsuccess = done;
  });

  const value = event.target.result;
  mem[id] = (
    value ? await decrypt(value)
    : getDefault()
  );
};

/// loadPages

const loadPages = async () => {
  const event = await new Promise(done => {
    idb
    .transaction(stores.page)
    .objectStore(stores.page)
    .getAll()
    .onsuccess = done;
  });

  const encryptedPages = event.target.result;

  const pages = await Promise.all(
    encryptedPages.map(encryptedPage => decrypt(encryptedPage))
  );

  mem.pages = {};
  for (const page of pages) {
    mem.pages[page.tag] = page;
  }
};

/// savePage

export const savePage = async (page) => {
  const encryptedPage = await encrypt(page);

  await new Promise(done => {
    const txn = idb.transaction(
      [stores.op, stores.page],
      "readwrite",
    );

    // TODO:
    //txn
    //.objectStore(stores.op)
    //.add(encryptedPage);

    txn
    .objectStore(stores.page)
    .put(encryptedPage, page.id);

    txn.oncomplete = done;
  });
};

/// close

export const close = () => {
  if (!idb) return;
  idb.close();
};
