import {decrypt, encrypt, getDbName, getSalt, setDbKey, setExportKey1} from "./crypto.js";
import {o, showBanner} from "./ui.js";
import {createOp, getRevertedOp} from "./undo.js";

/// idb, stores, conf, mem

let idb;

const stores = Object.seal({
  page: "page",
  op: "op",
  conf: "conf",
});

export const conf = Object.seal({
  salt: "salt",
  nonce: "nonce",
  mono: "mono",
  zoom: "zoom",
  recentTags: "recentTags",
  opIds: "opIds",
});

export const mem = Object.seal({
  salt: null,
  nonce: null,
  mono: null,
  zoom: null,
  recentTags: null,
  opIds: null,
  pages: null,

  /// Not saved

  page: null,
  textLength: 0,  // for `autoindent`
  oldPages: null, // for `createOp`
  screens: {},
  fileHandles: {},
  searchQuery: "",
  isSecret: false,
});

/// onDbError, updateAppVersion

const onDbError = (event) => {
  throw event.target.error;
};

const updateAppVersion = () => {
  showBanner({}, "Updating...");
  setTimeout(() => {
    location.reload();
  }, 1000);
};

/// Load from db to mem.

export const load = async (passphrase) => await new Promise(async (doneLoading) => {
  const dbName = await getDbName(passphrase);
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
    await setDbKey(passphrase, mem.salt);
    await setExportKey1(passphrase);
    mem.isSecret = !!passphrase;
    passphrase = "";  // forget asap!

    await Promise.all([
      loadConf(conf.nonce, () => ""),
      loadConf(conf.mono, () => false),
      loadConf(conf.zoom, () => 100),
      loadConf(conf.recentTags, () => []),

      loadConf(conf.opIds, () => ({
        min: null,
        undo: null,
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
    const txn = idb.transaction(
      stores.conf,
      "readwrite",
     );

    txn
    .objectStore(stores.conf)
    .put(mem.salt, conf.salt);

    txn.oncomplete = done;
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

/// saveConf

export const saveConf = async (id) => {
  const encryptedValue = await encrypt(mem[id]);

  await new Promise(done => {
    const txn = idb.transaction(
      stores.conf,
      "readwrite",
    );

    txn
    .objectStore(stores.conf)
    .put(encryptedValue, id);

    txn.oncomplete = done;
  });
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
  mem.oldPages = {};
  mem.screens = {};
  mem.fileHandles = {};
  mem.searchQuery = "";
  for (const page of pages) {
    mem.pages[page.tag] = page;
    mem.oldPages[page.tag] = Object.assign({}, page);
  }
};

/// savePage

export const savePage = async (page, props) => {
  const {
    hasPrev,
    hasNext,
    withoutOp,
  } = props ?? {};

  const encryptedPage = await encrypt(page);

  const encryptedOp = withoutOp ? null
    : await encrypt(createOp(page, {hasPrev, hasNext}));

  await new Promise(done => {
    const txn = idb.transaction(
      [stores.page, stores.op],
      "readwrite",
    );

    txn
    .objectStore(stores.page)
    .put(encryptedPage, page.id);

    if (withoutOp) {
      txn.oncomplete = done;
      return;
    }

    /// op

    const addingOp = txn
    .objectStore(stores.op)
    .add(encryptedOp);

    if (hasNext) {
      txn.oncomplete = done;
      return;
    };

    finalizeAddingOp(addingOp, done);
  });
};

/// finalizeAddingOp

const finalizeAddingOp = (addingOp, done) => {
  addingOp.onsuccess = async (event) => {
    await Promise.all([
      onOpAdded(event),
      new Promise(doneTxn => {
        addingOp.transaction.oncomplete = doneTxn;
      }),
    ]);

    done();
  };
};

/// onOpAdded

const onOpAdded = async (event) => {
  const opId = event.target.result;

  mem.opIds.min ??= opId;
  mem.opIds.undo = null;
  mem.opIds.max = opId;

  const opIdToDelete = opId - 1000;
  if (mem.opIds.min <= opIdToDelete) {
    mem.opIds.min = opIdToDelete + 1;
  }
  const deleteRange = IDBKeyRange.upperBound(opIdToDelete);

  const encryptedOpIds = await encrypt(mem.opIds);

  await new Promise(done => {
    const txn = idb.transaction(
      [stores.conf, stores.op],
      "readwrite",
    );

    txn
    .objectStore(stores.conf)
    .put(encryptedOpIds, conf.opIds);

    txn
    .objectStore(stores.op)
    .delete(deleteRange);

    txn.oncomplete = done;
  });
};

/// loadOp

export const loadOp = async (id) => {
  const event = await new Promise(done => {
    idb
    .transaction(stores.op)
    .objectStore(stores.op)
    .get(id)
    .onsuccess = done;
  });

  const encryptedOp = event.target.result;
  if (!encryptedOp) return null;

  return await decrypt(encryptedOp);
};

/// saveUndoneOps

export const saveUndoneOps = async () => {
  const event = await new Promise(done => {
    idb
    .transaction(stores.op)
    .objectStore(stores.op)
    .getAll(IDBKeyRange.bound(
      mem.opIds.undo, mem.opIds.max,
      // undo <= id <= max
    ))
    .onsuccess = done;
  });

  const encryptedOps = event.target.result;
  if (!encryptedOps) return;

  encryptedOps.reverse();

  const ops = await Promise.all(
    encryptedOps.map(encryptedOp => decrypt(encryptedOp))
  );

  const revertedOps = ops.map(op => getRevertedOp(op));

  const encRevOps = await Promise.all(
    revertedOps.map(revertedOp => encrypt(revertedOp))
  );

  await new Promise(done => {
    const txn = idb.transaction(
      stores.op,
      "readwrite",
    );

    const opStore = txn.objectStore(stores.op);
    let addingOp;

    for (const encRevOp of encRevOps) {
      addingOp = opStore.add(encRevOp);
    }

    finalizeAddingOp(addingOp, done);
  });
};

/// close

export const close = () => {
  if (!idb) return;
  idb.close();
};
