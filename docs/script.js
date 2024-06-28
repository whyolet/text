(() => {

  /// error

  addEventListener("error", (event) => {
    const banner = "Error! Please help to fix it by writing a line how it happened and/or sending this info";

    location.assign(
      "mailto:support@whyolet.com" +
      "?subject=Whyolet%20Text" +
      "&body=" +
      encodeURIComponent(
        `${banner}:

${event.message || ""}
${event.filename || ""}:${event.lineno || ""}:${event.colno || ""}

${event.error && event.error.stack || ""}

${banner} above.
Thank you!`
      )
    ); 
  });

  /// toHash, toTag
  
  const toHash = (tag) => "#" + encodeURIComponent(tag.replace(/^#+/, ""));

  const toTag = (hash) => decodeURIComponent(hash.replace(/^#+/, ""));

  /// main

  const main = () => {

    /// getEl, on, onClick, onSavedClick

    const getEl = (id) => {
      const el = document.getElementById(id);
      el.on = el.addEventListener;

      el.onClick = (onClick) => {
        // `.onClick()` should always be used instead of `.on("click")`
        // because it also focuses the textarea and auto-repeats clicks on long click.

        const onFocusedClick = () => {
          ta.focus();
          onClick();
        };

        el.on("click", onFocusedClick);

        let timer;
        const millis = 500;

        const start = (event) => {
          stop(event);
          timer = setInterval(onFocusedClick, millis);
        };

        const stop = (event) => {
          ta.focus();
          if (timer) clearInterval(timer);
        };
        
        el.on("touchstart", start);
        el.on("mousedown", start);

        el.on("touchcancel", stop);
        el.on("mouseleave", stop);

        el.on("touchmove", stop);
        el.on("mousemove", stop);

        el.on("touchend", stop);
        el.on("mouseup", stop);
      };

      el.onSavedClick = (onSaved) => {
        // `onSavedClick` should always be used instead of `onClick`
        // unless there is a special reason to avoid it, e.g. see `undo`.

        el.onClick(() => save(onSaved));
      };

      return el;
    };

    /// elements, toast

    const ta = getEl("ta"); // TextArea
    const header = getEl("header");
    
    const toast = (line) => {
      header.textContent = line;
      setTimeout(() => {
        header.textContent = current.page ? current.page.tag : "";
      }, 2000);
    };

    ta.on("blur", () => {
      ta.focus();
      setTimeout(() => {
        ta.focus();
      });
    });

    /// db

    let db, depth = 0;

    const stores = {
      conf: "conf",
      op: "op",
      page: "page",
    };

    const current = {
      page: null,
    };

    const conf = {
      undoneOpId: "undoneOpId",
    };

    const updateAppVersion = () => {
      ta.readOnly = true;
      header.textContent = "Update available...";
      setTimeout(() => {
        location.reload();
      }, 1000);
    };

    const onDbError = (event) => {
      throw event.target.error;
    };

    const openingDb = indexedDB.open("WhyoletText", 3);

    openingDb.onerror = (event) => {
      const error = event.target.error;
      if (error.name === "VersionError") {
        updateAppVersion();
      } else throw error;
    };

    openingDb.onupgradeneeded = (event) => {
      db = event.target.result;
      db.onerror = onDbError;
      const oldVersion = event.oldVersion || 0;

      if (oldVersion < 1) {
        db.createObjectStore(stores.page, {
          keyPath: "tag"
        });
      }
      
      if (oldVersion < 2) {
        db.createObjectStore(stores.op, {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      if (oldVersion < 3) {
        db.createObjectStore(stores.conf);
      }
    }

    openingDb.onsuccess = (event) => {
      db = event.target.result;
      db.onerror = onDbError;
      db.onversionchange = updateAppVersion;

      const hash = toHash("draft");
      if (location.hash === hash) {
        onHashChange();
      } else location.replace(hash);
    };

    /// onHashChange

    const onHashChange = (event) => {
      const tag = toTag(location.hash);

      getPage(tag, (page) => {
        current.page = page;

        header.textContent = tag;
        ta.value = page.text;
        ta.readOnly = false;
        ta.focus();
        ta.setSelectionRange(page.sel1, page.sel2);
        ta.scrollTop = page.scro;
      });
    };

    addEventListener("hashchange", onHashChange);

    /// getPage

    const getPage = (tag, onGotPage) => {
      db
      .transaction(stores.page)
      .objectStore(stores.page)
      .get(tag)
      .onsuccess = (event) => {
        const page = Object.assign(
          {
            tag,
            text: "",
            sel1: 0,
            sel2: 0,
            scro: 0,
          },
          event.target.result,
        );
        onGotPage(page);
      };
    };

    /// input, save

    let inputTimerId;

    ta.on("input", () => {
      if (inputTimerId) clearTimeout(inputTimerId);
      inputTimerId = setTimeout(save, 1000);
      // To group quickly typed characters to one `op`,
      // and to give `ta.scrollTop` time to change.
    });

    const save = (onSaved) => {
      if (!current.page) return;

      const page = current.page;
      const next = {
        text: ta.value,
        sel1: ta.selectionStart,
        sel2: ta.selectionEnd,
        scro: ta.scrollTop,
      };

      if (
        page.text === next.text &&
        page.sel1 === next.sel1 &&
        page.sel2 === next.sel2 &&
        page.scro === next.scro
      ) return onSaved && onSaved(page);

      getUndoneOpId((undoneOpId) => {
        if (undoneOpId) {
          onInputWhileUndone(undoneOpId, doSave);
        } else doSave();
      });

      const doSave = () => {
        const op = createOp(page, next);
        Object.assign(page, next);

        const txn = db.transaction([stores.op, stores.page], "readwrite");
        txn.objectStore(stores.op).add(op);
        txn.objectStore(stores.page).put(page);
        if (onSaved) txn.oncomplete = () => onSaved(page);
      };
    };

    const createOp = (page, next) => {
      const op = {
        tag: page.tag,

        // prev:
        p1: page.sel1,
        p2: page.sel2,
        ps: page.scro,

        // next:
        n1: next.sel1,
        n2: next.sel2,
        ns: next.scro,

        // text:
        at: null,
      };

      if (page.text !== next.text) {
        let head = 0, tail = 0;
        const minLength = Math.min(
          page.text.length,
          next.text.length,
        );

        while (
          head < minLength &&
          page.text.charAt(head) ==
          next.text.charAt(head)
        ) head++;

        while (
          tail < minLength - head &&
          page.text.charAt(page.text.length - 1 - tail) ==
          next.text.charAt(next.text.length - 1 - tail)
        ) tail++;

        op.at = head;
        op.del = page.text.slice(head, page.text.length - tail);
        op.ins = next.text.slice(head, next.text.length - tail);
      }

      return op;
    };

    /// hash

    getEl("hash").onSavedClick((page) => {
      const isTag = (charIndex) => /\S/.test(page.text.charAt(charIndex));
      let i = page.sel1;

      if (!(
        isTag(i) ||
        i > 0 && isTag(i - 1)
      )) return toast("Click a word first!");
      
      while (i > 0 && isTag(i - 1)) i--;
      const start = i;

      while (i < page.text.length && isTag(i)) i++;
      const tag = page.text.slice(start, i);

      if (tag.charAt(0) !== "#") {
        ta.setRangeText("#", start, start);
      }

      save(() => {
        const hash = toHash(tag);
        if (location.hash === hash) return;
        location.hash = hash;
        depth++;
      });
    });

    /// back

    getEl("back").onSavedClick(() => {
      if (depth > 0) {
        depth--;
        history.back();
      } else toast("Click # first!");
    });

    /// undo

    const getUndoneOpId = (onGotUndoneOpId) => {
      db
      .transaction(stores.conf)
      .objectStore(stores.conf)
      .get(conf.undoneOpId)
      .onsuccess = (event) => {
        const undoneOpId = event.target.result;
        onGotUndoneOpId(undoneOpId);
      };
    };

    getEl("undo").onClick(() => {
      // `undo` should not use `onSavedClick` because:
      // imagine the `save` detects a diff (especially of `scrollTop`),
      // so `onInputWhileUndone` may add multiple `ops`,
      // then `doSave` adds a new `op` with that diff for sure,
      // and then `undo` applies undo for this new op.
      // User observes no visual change at all, unexpectedly,
      // so they keep clicking `undo` without any visual result,
      // just growing oplog silently.

      getUndoneOpId((undoneOpId) => {
        const query = IDBKeyRange
        .upperBound(undoneOpId || Infinity, true);

        db
        .transaction(stores.op)
        .objectStore(stores.op)
        .openCursor(query, "prev")
        .onsuccess = onOpToUndo;
      });
    });

    const onOpToUndo = (event) => {
      const cursor = event.target.result;
      if (!cursor) return toast("This is the oldest!");

      const op = cursor.value;

      getPage(op.tag, (page) => {
        if (op.at !== null) page.text = (
          page.text.slice(0, op.at) +
          op.del +
          page.text.slice(op.at + op.ins.length)
        );

        page.sel1 = op.p1;
        page.sel2 = op.p2;
        page.scro = op.ps;

        saveAndShowPage(page, op.id);
      });
    };

    const saveAndShowPage = (page, undoneOpId) => {
      const txn = db.transaction([stores.page, stores.conf], "readwrite");
      txn.objectStore(stores.page).put(page);
      txn.objectStore(stores.conf).put(undoneOpId, conf.undoneOpId);

      txn.oncomplete = () => {
        const hash = toHash(page.tag);
        if (location.hash === hash) {
          onHashChange();
        } else location.hash = hash;
      }
    };

    /// input while undone

    const onInputWhileUndone = (undoneOpId, onComplete) => {
      const ops = [];
      const query = IDBKeyRange.lowerBound(undoneOpId);

      db
      .transaction(stores.op)
      .objectStore(stores.op)
      .openCursor(query, "next")
      .onsuccess = (event) => {
        const cursor = event.target.result;

        if (cursor) {
          const op = cursor.value;
          ops.push(op);
          cursor.continue();

        } else {
          const txn = db.transaction([stores.op, stores.conf], "readwrite");
          const opStore = txn.objectStore(stores.op);

          ops.reverse();
          for (const op of ops) {
            const undoneOp = {
              tag: op.tag,

              // prev:
              p1: op.n1,
              p2: op.n2,
              ps: op.ns,

              // next:
              n1: op.p1,
              n2: op.p2,
              ns: op.ps,

              // text:
              at: op.at,
            };

            if (op.at !== null) {
              undoneOp.del = op.ins;
              undoneOp.ins = op.del;
            }

            opStore.add(undoneOp);
          }

          txn.objectStore(stores.conf).put(null, conf.undoneOpId);
          txn.oncomplete = onComplete;
        }
      };
    };

    /// redo

    getEl("redo").onClick(() => {
      // `redo` should not use `onSavedClick`
      // for a similar reason `undo` has.

      getUndoneOpId((undoneOpId) => {
        if (!undoneOpId) return toast("This is the newest!");

        db
        .transaction(stores.op)
        .objectStore(stores.op)
        .get(undoneOpId)
        .onsuccess = onOpToRedo;
      });
    });

    const onOpToRedo = (event) => {
      const op = event.target.result;

      getPage(op.tag, (page) => {
        if (op.at !== null) page.text = (
          page.text.slice(0, op.at) +
          op.ins +
          page.text.slice(op.at + op.del.length)
        );

        page.sel1 = op.n1;
        page.sel2 = op.n2;
        page.scro = op.ns;

        const query = IDBKeyRange.lowerBound(op.id, true);

        db
        .transaction(stores.op)
        .objectStore(stores.op)
        .openCursor(query, "next")
        .onsuccess = (event) => {
          const cursor = event.target.result;
          const nextOpId = cursor ? cursor.value.id : null;
          saveAndShowPage(page, nextOpId);
        };
      });
    };

    /// call main
  };

  if (document.readyState === "complete") return main();
  document.addEventListener("DOMContentLoaded", main);
})();
