"use strict";
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

  /// serviceWorker

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }

  /// toHash, toTag
  
  const toHash = (tag) => "#" + encodeURIComponent(tag.replace(/^#+/, ""));

  const toTag = (hash) => decodeURIComponent(hash.replace(/^#+/, ""));

  /// main

  const main = () => {

    /// getEl, on, onSavedClick, onTextSavedClick, saveTimerId
    
    let saveTimerId;

    const getEl = (id) => {
      const el = document.getElementById(id);
      el.on = el.addEventListener;
      el.onClick = (onClick) => el.on("click", onClick);
      el.onSavedClick = (onSaved) => onSavedClick(false, onSaved);
      el.onSavedTextClick = (onSaved) => onSavedClick(true, onSaved);

      const onSavedClick = (compareTextOnly, onSaved) => {

        const onClick = () => {
          ta.focus();
          if (saveTimerId) clearTimeout(saveTimerId);
          save(compareTextOnly, onSaved)
        };

        el.onClick(onClick);

        let clickTimer;
        const millis = 500;

        const start = (event) => {
          stop(event);
          clickTimer = setInterval(onClick, millis);
        };

        const stop = (event) => {
          ta.focus();
          if (clickTimer) clearInterval(clickTimer);
        };
        
        el.on("touchstart", start);
        el.on("mousedown", start);

        el.on("touchcancel", stop);
        el.on("mouseleave", stop);

        // `move` events are fired after soft keyboard reopens on `focus`,
        // so we don't use them to avoid stopping auto-clicks.
        // el.on("touchmove", stop);
        // el.on("mousemove", stop);

        el.on("touchend", stop);
        el.on("mouseup", stop);
      };

      return el;
    };

    /// elements

    const ta = getEl("ta"); // TextArea
    const header = getEl("header");

    /// toast
    
    let toastTimerId;

    const toast = (line) => {
      header.textContent = line;
      if (toastTimerId) clearTimeout(toastTimerId);
      toastTimerId = setTimeout(() => {
        header.textContent = current.page ? current.page.tag : "";
      }, 2000);
    };

    /// db

    let db, depth = 0;

    const stores = {
      conf: "conf",
      op: "op",
      page: "page",
    };

    const current = {
      page: null,
      zoom: 100,
      textLength: 0, // for `autoindent`
    };

    const conf = {
      undoneOpId: "undoneOpId",
      zoom: "zoom",
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
      getZoom();

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

    ta.on("input", () => {
      autoindent();
      if (saveTimerId) clearTimeout(saveTimerId);
      saveTimerId = setTimeout(save, 1000);
      // To group quickly typed characters to one `op`,
      // and to give `ta.scrollTop` time to change.
    });

    const save = (compareTextOnly, onSaved) => {
      if (!current.page) return;

      if (saveTimerId) clearTimeout(saveTimerId);

      const page = current.page;
      const next = {
        text: ta.value,
        sel1: ta.selectionStart,
        sel2: ta.selectionEnd,
        scro: ta.scrollTop,
      };

      if (
        page.text === next.text && (
          compareTextOnly || (
            page.sel1 === next.sel1 &&
            page.sel2 === next.sel2 &&
            page.scro === next.scro
          )
        )
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
        txn.oncomplete = () => {
          if (onSaved) onSaved(page);
          trimOps();
        };
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

      save(false, () => {
        const hash = toHash(tag);
        if (location.hash === hash) return;
        location.hash = hash;
        depth++;
      });
    });

    const isTag = (charIndex) => /\S/.test(charAt(charIndex));

    const charAt = (charIndex) => current.page.text.charAt(charIndex);

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

    getEl("undo"). onSavedTextClick(() => {
      // `undo` should not use `onSavedClick` because:
      // imagine the `save` detects a diff of `scrollTop` or cursor,
      // so `onInputWhileUndone` may add multiple `ops`,
      // then `doSave` adds a new `op` with that diff,
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
          txn.oncomplete = () => {
            onComplete();
            trimOps();
          };
        }
      };
    };

    /// redo

    getEl("redo").onSavedTextClick(() => {
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
        .openKeyCursor(query, "next")
        .onsuccess = (event) => {
          const cursor = event.target.result;
          const nextOpId = cursor ? cursor.key : null;
          saveAndShowPage(page, nextOpId);
        };
      });
    };

    /// trimOps

    const maxOps = 1000;

    const trimOps = () => {
      setTimeout(() => {
        db
        .transaction(stores.op)
        .objectStore(stores.op)
        .count()
        .onsuccess = (event) => {
          const totalOps = event.target.result;
          if (totalOps <= maxOps) return;

          getMaxOpIdToTrim(totalOps - maxOps);
        };
      }, 2000);
    };

    const getMaxOpIdToTrim = (numOps) => {
      const query = IDBKeyRange.lowerBound(0);

      db
      .transaction(stores.op)
      .objectStore(stores.op)
      .openKeyCursor(query, "next")
      .onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;

        if (numOps > 1) {
          numOps--;
          cursor.continue();
          return;
        }
        
        const maxOpIdToTrim = cursor.key;
        doTrimOps(maxOpIdToTrim);
      };
    };

    const doTrimOps = (maxOpIdToTrim) => {
      const query = IDBKeyRange.upperBound(maxOpIdToTrim);
  
      db
      .transaction(stores.op, "readwrite")
      .objectStore(stores.op)
      .delete(query);
    };

    /// download

    getEl("download").onSavedClick((page) => {
      // TODO: Move to menu.
      const a = document.createElement("a");
      a.href = "data:application/octet-stream;charset=utf-8," + encodeURIComponent(page.text);
      a.download = page.tag;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    /// up, down

    getEl("up").onSavedClick((page) => {
      ensureTextEndsWithNewline();
      const prevStart = getPrevLineStartIndex(page.sel1);
      const thisStart = getThisLineStartIndex(page.sel1);
      const nextStart = getNextLineStartIndex(page.sel2);
      const thisStop = decreaseByNewline(nextStart);
      const thisLength = thisStop - thisStart;

      const prevLine = page.text.slice(prevStart, thisStart);
      const thisLine = page.text.slice(thisStart, nextStart);

      ta.setRangeText(thisLine + prevLine, prevStart, nextStart);
      ta.setSelectionRange(prevStart, prevStart + thisLength);
      save();
    });

    getEl("down").onSavedClick((page) => {
      ensureTextEndsWithNewline();
      const thisStart = getThisLineStartIndex(page.sel1);
      const nextStart = getNextLineStartIndex(page.sel2);
      const thisStop = decreaseByNewline(nextStart);
      const thisLength = thisStop - thisStart;
      const nextNextStart = getNextLineStartIndex(nextStart);

      const thisLine = page.text.slice(thisStart, nextStart);
      const nextLine = page.text.slice(nextStart, nextNextStart);

      ta.setRangeText(nextLine + thisLine, thisStart, nextNextStart);
      const newThisStart = thisStart + nextLine.length;
      ta.setSelectionRange(newThisStart, newThisStart + thisLength);
      save();
    });

    const getPrevLineStartIndex = (charIndex) => {
      let i = getThisLineStartIndex(charIndex);
      i = decreaseByNewline(i);
      return getThisLineStartIndex(i);
    };

    const getThisLineStartIndex = (charIndex) => {
      let i = charIndex;

      while (
        i > 0 &&
        !isNewline(i - 1)
      ) i--;

      return i;
    };

    const getNextLineStartIndex = (charIndex) => {
      let i = charIndex;
      const length = current.page.text.length;

      while (
        i < length &&
        !isNewline(i)
      ) i++;

      if (
        i <= length - 2 &&
        charAt(i) === "\r" &&
        charAt(i + 1) === "\n"
      ) {
        i += 2;
      } else if (
        i <= length - 1 &&
        charAt(i) === "\n"
      ) {
        i++;
      }

      return i;
    };

    const decreaseByNewline = (charIndex) => {
      let i = charIndex;
      if (
        i >= 2 &&
        charAt(i - 2) === "\r" &&
        charAt(i - 1) === "\n"
      ) {
        i -= 2;
      } else if (
        i >= 1 &&
        charAt(i - 1) === "\n"
      ) {
        i--;
      }
      return i;
    };

    const ensureTextEndsWithNewline = () => {
      const page = current.page;
      if (!page.text) return;

      const newline = page.text.includes("\r\n") ? "\r\n" : "\n";
      if (page.text.endsWith(newline)) return;

      page.text += newline;
    };

    const isNewline = (charIndex) => /[\r\n]/.test(charAt(charIndex));

    /// delete

    const doDelete = (page) => {
      const thisStart = getThisLineStartIndex(page.sel1);
      const nextStart = getNextLineStartIndex(page.sel2);
      ta.setRangeText("", thisStart, nextStart, "start");
      save();
    };

    getEl("delete").onSavedClick(doDelete);

    /// strike

    getEl("strike").onSavedClick((page) => {
      toast("TODO");
    });

    /// zoom

    const minZoom = 10, maxZoom = 1000;
    let saveZoomTimerId;

    const getZoom = () => {
      db
      .transaction(stores.conf)
      .objectStore(stores.conf)
      .get(conf.zoom)
      .onsuccess = (event) => {
        current.zoom = event.target.result || current.zoom;
        ta.style.fontSize = `${current.zoom}%`;
      };
    };

    const setZoom = () => {
      let newZoom = prompt("Zoom %", current.zoom);
      if (!newZoom) return;

      newZoom = parseInt(newZoom, 10);
      if (
        newZoom < minZoom ||
        newZoom > maxZoom
      ) return toast(`From ${minZoom}% to ${maxZoom}%`);

      saveZoom(newZoom);
    };

    const saveZoom = (newZoom) => {
      current.zoom = newZoom;
      ta.style.fontSize = `${current.zoom}%`;
      toast(`${current.zoom}%`);
        
      if (saveZoomTimerId) clearTimeout(saveZoomTimerId);
      saveZoomTimerId = setTimeout(doSaveZoom, 100);
    };

    const doSaveZoom = () => {
      db
      .transaction(stores.conf, "readwrite")
      .objectStore(stores.conf)
      .put(current.zoom, conf.zoom);
    };

    getEl("menu").onClick(() => {
      // TODO: Move to menu as
      // "🤏 Zoom: {input number}%"
      // "{input range}"
      setZoom();
    });

    /// gestures: zoom, TODO: delete, strike

    const fingersByIds = new Map();
    let singleFinger;
    let distance = 0;

    ta.on("pointerdown", (event) => {
      if (!fingersByIds.has(event.pointerId)) {
        distance = 0; // New finger? Reset diff!
      }
      fingersByIds.set(event.pointerId, event);
      singleFinger = (fingersByIds.size === 1) ? event : null;
    });

    ta.on("pointermove", (event) => {
      fingersByIds.set(event.pointerId, event);
      if (fingersByIds.size < 2) return;

      let newDistance = 0;
      let fingers = Array.from(fingersByIds.values());
      for (let i = 0; i < fingers.length; i++) {
        for (let j = i + 1; j < fingers.length; j++) {
          const fi = fingers[i], fj = fingers[j];
          const dx = Math.abs(fi.clientX - fj.clientX);
          const dy = Math.abs(fi.clientY - fj.clientY);
          newDistance += dx * dx + dy * dy;
        }
      }
      if (newDistance === distance) return;

      if (!distance) {
        // Init diff.
        distance = newDistance;
        return;
      }

      let dZoom = 0;
      if (newDistance > distance && current.zoom < maxZoom) dZoom = 1;
      if (newDistance < distance && current.zoom > minZoom) dZoom = -1;
      if (!dZoom) return;

      distance = newDistance;
      if (current.zoom > 100) dZoom *= Math.round(current.zoom / 100);
      saveZoom(Math.min(maxZoom, current.zoom + dZoom));
    });

    const onFingerCancel = (event) => {

      if (
        !fingersByIds.delete(event.pointerId) ||
        !current.page ||
        !singleFinger ||
        singleFinger.pointerId !== event.pointerId 
      ) return;

      const dx = event.clientX - singleFinger.clientX;
      const dy = event.clientY - singleFinger.clientY;

      const minDx = Math.max(
        ta.clientWidth / 3,
        Math.abs(dy * 2),
      );

      if (Math.abs(dx) < minDx) return;

      save(false, (page) => {
        if (dx < 0) doDelete(page);
        else toast("TODO");
      });
    };

    for (const action of ["cancel", "leave", "out", "up"]) {
      ta.on(`pointer${action}`, onFingerCancel);
    }

    /// autoindent

    const autoindent = () => {
      // It is called before debounced `save`, so `page` is outdated and we should not update it to keep the diff for `save`.

      const text = ta.value;
      if (current.textLength >= text.length) {
        current.textLength = text.length;
        return;
      }
      current.textLength = text.length;

      const i = ta.selectionStart;
      if (
        i !== ta.selectionEnd ||
        i === 0 ||
        !/[\r\n]/.test(text.charAt(i - 1))
      ) return;

      const head = text.slice(0, i);
      const groups = /([^\r\n]*)([\r\n]*)$/.exec(head);
      const notEmpty = groups[1];
      const indent = /^[\t ]*/.exec(notEmpty)[0];
      if (notEmpty === indent) {
        ta.setRangeText(groups[2] + indent, i - groups[0].length, i, "end");
      } else {
        ta.setRangeText(indent, i, i, "end");
      }
    };

    /// indent, dedent

    getEl("indent").onSavedClick((page) => {
      toast("TODO");
    });

    getEl("dedent").onSavedClick((page) => {
      toast("TODO");
    });

    /// find, replace

    getEl("find").onSavedClick((page) => {
      toast("TODO 2");
    });

    /// debug sw.js

    addEventListener("message", (event) => {
      setTimeout(() => {
        toast(event.data);
      }, 500);
    });

    /// call main
  };

  if (document.readyState === "complete") return main();
  document.addEventListener("DOMContentLoaded", main);
})();
