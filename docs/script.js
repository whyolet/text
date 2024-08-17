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

  /// isDate

  const isDate = (tag) => /^\d{4}-\d{2}-\d{2}$/.test(tag);

  /// o - bullet point in a tree of elements

  const o = function(tag, attrs /* , kids */) {
    const el = document.createElement(tag);

    if (typeof attrs === "string") {
      el.className = attrs;
    } else if (attrs) for (const key in attrs) {
      const val = attrs[key];
      if (val !== null) el.setAttribute(key, val);
    }

    for (let i = 2; i < arguments.length; i++) {
      const kid = arguments[i];
      if (kid !== null) el.appendChild(
        typeof kid === "string"
        ? document.createTextNode(kid)
        : kid
      );
    }

    return el;
  };

  /// getEl

  const getEl = (id) => document.getElementById(id);

  /// on, onClick

  const on = (el, eventName, handler) => {
    if (typeof el === "string") el = getEl(el);
    el.addEventListener(eventName, handler);
  };

  const onClick = (el, handler) => on(el, "click", handler);

  /// hide, show, isHidden

  const hidden = "hidden";
  const hide = (el) => el.classList.add(hidden);
  const show = (el) => el.classList.remove(hidden);
  const isHidden = (el) => el.classList.contains(hidden);

  /// main

  const main = () => {

    /// elements

    const findReplaceRow = getEl("find-replace-row");
    const findWhat = getEl("find-what");
    const replaceWith = getEl("replace-with");

    const pageTopRow = getEl("page-top-row");
    const pageHeader = getEl("page-header");
    const findReplaceButton = getEl("find-replace");

    const pageMainRow = getEl("page-main-row");
    const ta = getEl("ta"); // TextArea

    const pageBottomRow = getEl("page-bottom-row");

    const findAllRow = getEl("find-all-row");
    const findAllWhat = getEl("find-all-what");

    const menuTopRow = getEl("menu-top-row");
    const menuHeader = getEl("menu-header");

    const itemsRow = getEl("items-row");
    const helpRow = getEl("help-row");

    /// toast
    
    let toastTimerId, pinnedToast = "";

    const toast = (line, pin) => {
      if (pin) pinnedToast = line;

      if (toastTimerId) {
        if (pin) return; // Keep message.

        clearTimeout(toastTimerId);
        toastTimerId = 0;
      }

      pageHeader.textContent = line;
      alignToast();
      if (pin) return;

      toastTimerId = setTimeout(() => {
        toastTimerId = 0;
        pageHeader.textContent = pinnedToast;
        alignToast();
      }, 2000);
    };

    const alignToast = () => {
      doAlignToast();
      setTimeout(doAlignToast, 100);
    };

    const doAlignToast = () => {
      if (pageHeader.scrollWidth > pageHeader.clientWidth) {
        pageHeader.classList.add("start");
      } else {
        pageHeader.classList.remove("start");
      }
    };

    const todo = () => toast("TODO");

    /// reservedTags, reservedActions

    const reservedTags = {
      prefix: "--",
      findAll: "--find-all",
      help: "--help",
      menu: "--menu",
    };

    const reservedActions = {};

    /// db

    let db;

    const stores = {
      conf: "conf",
      op: "op",
      page: "page",
    };

    const conf = {
      recentTags: "recentTags",
      undoneOpId: "undoneOpId",
      zoom: "zoom",
    };

    const current = {
      page: null,
      pages: [], // for `find-all`
      textLength: 0, // for `autoindent`
      zoom: 100,

      findWhatOnGotPage: "",
      lineNumberOnGotPage: null,
    };

    const updateAppVersion = () => {
      ta.readOnly = true;
      toast("Update available...", true);
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
      goTag("draft", true);
    };

    /// goTag

    const goTag = (tag, isReplace) => {
      const hash = toHash(tag);
      if (location.hash === hash) return onHashChange();
      if (isReplace) return location.replace(hash);
      location.assign(hash);
    };

    /// onHashChange

   let historyStateOnStart = null;

    const onHashChange = (event) => {
      const tag = toTag(location.hash);

      if (!history.state) {
        history.replaceState(history.length, "");
      }
      if (historyStateOnStart === null) {
        historyStateOnStart = history.state;
        if (tag === reservedTags.menu) {
          goTag("draft");
          return;
        }
      }

      for (const el of [
        findReplaceRow,
        pageTopRow,
        pageMainRow,
        pageBottomRow,
        findAllRow,
        menuTopRow,
        itemsRow,
        helpRow,
      ]) hide(el);

      if (!menu.isSaved) saveMenu();

      if (tag.startsWith(reservedTags.prefix)) {
        const action = reservedActions[tag];
        if (action) return action();

        alert(`Please don't use tags starting with "${reservedTags.prefix}"`);
        history.back();
        return;
      };

      showPage(tag);
    };

    on(window, "hashchange", onHashChange);

    /// showPage

    const showPage = (tag) => {
      clearFindReplaceValues();
      show(findReplaceButton);
      
      show(pageTopRow);
      show(pageMainRow);
      show(pageBottomRow);
      ta.focus();

      getRecentTags((recentTags) => {
        const i = recentTags.indexOf(tag);
        if (i !== -1) recentTags.splice(i, 1);
        recentTags.unshift(tag);
        if (recentTags.length > 100) {
          recentTags.pop();
        }

        db
        .transaction(stores.conf, "readwrite")
        .objectStore(stores.conf)
        .put(recentTags, conf.recentTags);
      });

      getPage(tag, (page) => {
        current.page = page;
        current.textLength = page.text.length;

        toast(tag, true);
        ta.value = page.text;
        ta.readOnly = false;

        if (current.findWhatOnGotPage) {
          showFindReplaceRow(); // with ^
          doFind(page, 0, true);
        } else if (current.lineNumberOnGotPage) {
          const i = getLineStop(current.lineNumberOnGotPage);
          current.lineNumberOnGotPage = null;
          ta.setSelectionRange(i, i);
        } else {
          ta.setSelectionRange(page.sel1, page.sel2);
          ta.scrollTop = page.scro;
        }
      });
    };

    /// getRecentTags

    const getRecentTags = (onGotRecentTags) => {
      db
      .transaction(stores.conf)
      .objectStore(stores.conf)
      .get(conf.recentTags)
      .onsuccess = (event) => {
        const recentTags = event.target.result || [];
        onGotRecentTags(recentTags);
      };
    };

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

    /// getSelText

    const getSelText = () => {
      return ta.value.slice(
        ta.selectionStart,
        ta.selectionEnd,
      );
    };

    /// input, saveTimerId, save, createOp

    let saveTimerId;

    on(ta, "input", () => {
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
      current.textLength = next.text.length;

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

    /// onSavedClick

    const onSavedClick = (el, options, handler, heldHandler) => {
      const anyFocus = options.includes("a");
      const noFocus = options.includes("n");
      const compareTextOnly = options.includes("t");

      let prevFocused, clickTimerId = 0;

      const getPrevFocused = () => (
        noFocus ? null :
        anyFocus ? document.activeElement :
        ta
      );

      const clickHandler = () => {
        if (!clickTimerId) prevFocused = getPrevFocused();
        if (prevFocused) prevFocused.focus();

        if (saveTimerId) clearTimeout(saveTimerId);

        if (clickTimerId && heldHandler) {
          stop();
          save(compareTextOnly, heldHandler);
          return;
        }

        save(compareTextOnly, handler);
      };

      onClick(el, clickHandler);

      const start = () => {
        prevFocused = getPrevFocused();
        stop();
        clickTimerId = setInterval(clickHandler, 500);
      };
  
      const stop = () => {
        if (prevFocused) prevFocused.focus();
        if (clickTimerId) clearInterval(clickTimerId);
        clickTimerId = 0;
      };
  
      on(el, "touchstart", start);
      on(el, "mousedown", start);

      on(el, "touchend", stop);
      on(el, "mouseup", stop);
      on(el, "touchcancel", stop);
      on(el, "mouseleave", stop);
      // `...move` events are fired after soft keyboard reopens on `focus`, so we don't use them.
    };

    /// hash

    onSavedClick("hash", "", (page) => {
      let i = page.sel1;

      if (!(
        isTag(i) ||
        i > 0 && isTag(i - 1)
      )) return toast("Click a word first!");
      
      while (i > 0 && isTag(i - 1)) i--;
      const start = i;

      while (i < page.text.length && isTag(i)) i++;
      const tag = page.text.slice(start, i).replaceAll(strikeChar, "");

      if (tag.charAt(0) !== "#") {
        ta.setRangeText("#", start, start);
      }

      save(false, () => goTag(tag));
    });

    const isTag = (charIndex) => /\S/.test(charAt(charIndex));

    const charAt = (charIndex) => current.page.text.charAt(charIndex);

    /// back

    onSavedClick("back", "", () => {
      if (history.state > historyStateOnStart) {
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

    onSavedClick("undo", "t", () => {
      // `undo` should use `"t" = compareTextOnly` because:
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
      txn.oncomplete = () => goTag(page.tag);
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

    onSavedClick("redo", "t", () => {
      // `redo` should use "t" for a similar reason `undo` has.

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

    /// up, down

    onSavedClick("up", "", (page) => {
      ensureTextEndsWithNewline();
      const prevStart = getPrevLineStartIndex(page.sel1);
      const thisStart = getThisLineStartIndex(page.sel1);
      const nextStart = getNextLineStartIndex(page.sel2);
      const thisStop = decreaseByNewline(nextStart);
      if (thisStop < thisStart) return;
      const thisLength = thisStop - thisStart;

      const prevLine = page.text.slice(prevStart, thisStart);
      const thisLine = page.text.slice(thisStart, nextStart);

      ta.setRangeText(thisLine + prevLine, prevStart, nextStart);
      ta.setSelectionRange(prevStart, prevStart + thisLength);
      save();
    });

    onSavedClick("down", "", (page) => {
      ensureTextEndsWithNewline();
      const thisStart = getThisLineStartIndex(page.sel1);
      const nextStart = getNextLineStartIndex(page.sel2);
      const thisStop = decreaseByNewline(nextStart);
      if (thisStop < thisStart) return;
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
      const focused = document.activeElement;
      if (!focused) return;

      if (focused.id !== "ta") {
        focused.value = "";
        return;
      }

      const thisStart = getThisLineStartIndex(page.sel1);
      const nextStart = getNextLineStartIndex(page.sel2);
      ta.setRangeText("", thisStart, nextStart, "start");
      save();
    };

    onSavedClick("delete", "a", doDelete);

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

    const getLineNumbers = () => {
      const text = ta.value;
      const cursor = ta.selectionStart;
      let cur = 1, max = 1, i = -1;
      while ((i = text.indexOf("\n", i + 1)) !== -1) {
        max++;
        if (i < cursor) cur++;
      }
      return {cur, max};
    };

    const getLineStop = (lineNumber) => {
      const text = ta.value;
      let i = -1;
      while (
        lineNumber > 0 &&
        (i = text.indexOf("\n", i + 1)) !== -1
      ) lineNumber--;
      return i > 0 ? i : text.length;
    };

    /// gestures: zoom, delete, send

    const fingersByIds = new Map();
    let singleFinger;
    let distance = 0;

    on(ta, "pointerdown", (event) => {
      if (!fingersByIds.has(event.pointerId)) {
        distance = 0; // New finger? Reset diff!
      }
      fingersByIds.set(event.pointerId, event);
      singleFinger = (
        fingersByIds.size === 1
        ? event
        : null
      );
    });

    on(ta, "pointermove", (event) => {
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
        singleFinger.pointerId !== event.pointerId ||
        !event.clientX && !event.clientY
        // e.g. on `pointercancel`
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
        else todo();
      });
    };

    for (const action of ["cancel", "leave", "out", "up"]) {
      on(ta, `pointer${action}`, onFingerCancel);
    }

    /// copy, paste

    onSavedClick("copy", "a", () => {
      const focused = document.activeElement;
      if (!focused) return;

      const isTa = focused.id === "ta";
      let start = focused.selectionStart;
      let stop = focused.selectionEnd;
      if (start === stop) {
        if (isTa) {
          start = getThisLineStartIndex(start);
          stop = getNextLineStartIndex(stop);
          stop = decreaseByNewline(stop);
          if (stop < start) return;
        } else {
          start = 0;
          stop = focused.value.length;
        }
        focused.setSelectionRange(start, stop);
        if (isTa) save();
      }

      if ("clipboard" in navigator) {
        const text = focused.value.slice(start, stop);
        navigator.clipboard.writeText(text);
        return;
      }

      if ("execCommand" in document) {
        document.execCommand("copy", false, null);
      }
    });

    onSavedClick("paste", "a", () => {
      const focused = document.activeElement;
      if (!focused) return;

      if ("clipboard" in navigator) {
        navigator.clipboard.readText()
        .then((text) => {
          focused.setRangeText(
            text,
            focused.selectionStart,
            focused.selectionEnd,
            "end",
          );
        });
      } else if ("execCommand" in document) {
        document.execCommand("paste", false, null);
      }

      if (focused.id === "ta") save();
    });

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
      current.textLength = ta.value.length;
    };

    /// indent, dedent

    const indent = "  ";

    onSavedClick("indent", "", (page) => {
      doIndent(page, true);
    });

    onSavedClick("dedent", "", (page) => {
      doIndent(page, false);
    });

    const doIndent = (page, isAdding) => {
      const hasSel = page.sel1 !== page.sel2;
      const thisStart = getThisLineStartIndex(page.sel1);
      const nextStart = getNextLineStartIndex(page.sel2);
      const lines = page.text.slice(thisStart, nextStart).split("\n");
      let firstAdded = 0, totalAdded = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if ((hasSel || i) && (
          line === "" ||
          line === "\r"
        )) continue;

        let diff = indent, added = indent.length;
        if (isAdding) {
          lines[i] = diff + line;
        } else do {
          if (line.startsWith(diff)) {
            lines[i] = line.slice(added);
            break;
          }
          diff = diff.slice(0, --added);
        } while (diff);

        if (!isAdding) added = -Math.min(
          added,
          page.sel1 - thisStart,
        );

        if (!i) firstAdded = added;
        totalAdded += added;
      }

      ta.setRangeText(
        lines.join("\n"),
        thisStart,
        nextStart,
      );

      ta.setSelectionRange(
        page.sel1 + firstAdded,
        page.sel2 + totalAdded,
      );

      save();
    };

    /// strike

    const strikeChar = "\u0336";

    onSavedClick("strike", "a", () => {
      const focused = document.activeElement;
      if (!focused) return;

      const isTa = focused.id === "ta";
      let start = focused.selectionStart;
      let stop = focused.selectionEnd;
      if (start === stop) {
        if (isTa) {
          start = getThisLineStartIndex(start);
          stop = getNextLineStartIndex(stop);
          stop = decreaseByNewline(stop);
          if (stop < start) return;
        } else {
          start = 0;
          stop = focused.value.length;
        }
      }

      let text = focused.value.slice(start, stop);

      text = text.includes(strikeChar)
        ? text.replaceAll(strikeChar, "")
        : text.replaceAll("", strikeChar).slice(1);

      focused.setRangeText(text, start, stop, "end");
      if (isTa) save();
    });

    /// find-replace

    onClick(findReplaceButton, () => {
      if (isHidden(findReplaceRow)) {
        showFindReplaceRow();
      } else hideFindReplaceRow();
    });

    const showFindReplaceRow = () => {
      clearFindReplaceValues();
      show(findReplaceRow);

      if (current.findWhatOnGotPage) {
        findWhat.value = current.findWhatOnGotPage;
        current.findWhatOnGotPage = "";
        // Keep focus on `ta` to show the found text selected.
      } else {
        findWhat.value = getSelText();
        findWhat.focus();
      }
    };

    const clearFindReplaceValues = () => {
      findWhat.value = "";
      replaceWith.value = "";
    };

    const hideFindReplaceRow = () => {
      clearFindReplaceValues();
      hide(findReplaceRow);
      ta.focus();
    };

    onSavedClick("find-prev", "", (page) => {
      doFind(page, page.sel1 - 1, false);
    });

    onSavedClick("find-next", "", (page) => {
      doFind(page, page.sel2, true);
    });

    const doFind = (page, start, forward) => {
      const what = getFindWhat().toLowerCase();
      if (!what) return;

      const where = page.text.toLowerCase();
  
      if (
        start < 0 ||
        start >= where.length
      ) return toast("Not found!");
  
      const found = forward
        ? where.indexOf(what, start)
        : where.lastIndexOf(what, start);
      if (found === -1) return toast("Not found!");

      ta.setSelectionRange(found, found + what.length);
      save();
    };

    const getFindWhat = () => {
      const what = findWhat.value;
      if (what) return what;

      findWhat.focus();
      toast("Find what?");
      return "";
    };

    onSavedClick("replace", "n", (page) => {
      ta.focus();
      ta.setRangeText(replaceWith.value, page.sel1, page.sel2, "select");
      save();
      // Do not auto find next or prev: to verify replacement.
    }, (page) => {
      // On held button:

      const what = getFindWhat();
      if (!what) return;

      const withValue = replaceWith.value;

      if (!confirm(`Replace all "${what}" ➔ "${withValue}"?`)) return;

      const lineNumbers = getLineNumbers();
      ta.value = page.text.replaceAll(what, withValue);
      const i = getLineStop(lineNumbers.cur);
      ta.setSelectionRange(i, i);
      ta.focus();
      save();
    });

    /// find-all

    const goFindAll = () => goTag(reservedTags.findAll);

    onClick("find-all", goFindAll);

    reservedActions[reservedTags.findAll] = () => {
      findAllWhat.value = findWhat.value || getSelText();
      show(findAllRow);
      findAllWhat.focus();

      itemsRow.textContent = "";
      show(itemsRow);

      db
      .transaction(stores.page)
      .objectStore(stores.page)
      .getAll()
      .onsuccess = onGotPagesForFind;
    };

    const onGotPagesForFind = (event) => {
      if (isHidden(findAllRow)) return;
  
      current.pages = event.target.result;
      for (const page of current.pages) {
        page.lowerTag = page.tag.toLowerCase();
        page.lowerText = page.text.toLowerCase();
      }

      doFindAll();
    };

    const doFindAll = () => {
      const what = findAllWhat.value.toLowerCase();
      itemsRow.textContent = "";

      if (!what) {
        getRecentTags((recentTags) => {
          for (const tag of recentTags) {
            const item = (
              o("div", "mid row start button item",
                o("div", "gap"),
                o("div", "mid found-tag", tag),
                o("div", "gap"),
              )
            );
            onClick(item, onFindResultClick);
            itemsRow.appendChild(item); 
          }
        });
        return;
      }

      for (const page of current.pages) {
        const tagIndex = page.lowerTag.indexOf(what);
        const textIndex = page.lowerText.indexOf(what);
        if (tagIndex === -1 && textIndex === -1) continue;

        let line = "", found = 0, i = textIndex;
        if (i !== -1) {
          let head = page.text.slice(0, i);
          let tail = page.text.slice(i);
          head = /[^\n]*$/.exec(head)[0];
          tail = /^[^\r\n]*/.exec(tail)[0];
          line = head + tail;
        }
        while (i !== -1) {
          found++;
          i = page.lowerText.indexOf(what, i + 1);
        }

        const item = (
          o("div", "mid row start button item",
            o("div", "gap"),
            o("div", "mid found-tag", page.tag),
            found ? o("div", "gap") : null,
            found ? o("div", "big start found-text", line) : null,
            found > 1 ? o("div", "gap") : null,
            found > 1 ? o("div", "mid found-more", `(+${found - 1})`) : null,
            o("div", "gap")
          )
        );
        onClick(item, onFindResultClick);
        itemsRow.appendChild(item);
      }
    };

    on(findAllWhat, "input", doFindAll);

    const onFindResultClick = (event) => {
      const kids = event.currentTarget.children;
      const tag = kids[1]. textContent;
      if (kids.length > 1) {
        current.findWhatOnGotPage = findAllWhat.value;
      }

      // We need `ta.focus()` for auto-scroll of `ta` to selection that will be set by `findWhatOnGotPage`.
      // However `ta.focus()` has no effect when called in `onHashChange` or when `ta` is still hidden, so:
      hide(itemsRow);
      show(pageMainRow);
      ta.focus();
      goTag(tag);
    };

    onClick("find-all-close", () => {
      history.back();
    });

    /// move-to

    onSavedClick("to", "", todo);

    /// menu

    const menu = {
      isSaved: true,
    };

    onSavedClick("menu", "n", () => goTag(reservedTags.menu));

    reservedActions[reservedTags.menu]  = () => {
      menuHeader.textContent = "Menu";
      show(menuTopRow);

      /// help

      menu.helpItem = (
        o("div", "mid row start button item",
          o("div", "gap"),
          o("div", "ibox",
            o("div", "icon", "info"),
          ),
          o("div", "gap"),
          o("div", "big start", "Cheatsheet"),
          o("div", "gap"),
        )
      );

      onClick(menu.helpItem, () => goTag(reservedTags.help));

      /// sync

      menu.rsSyncIcon = o("div", "icon button", "layers");
      onClick(menu.rsSyncIcon, todo);

      menu.gdSyncIcon = o("div", "icon button", "drive_export");
      onClick(menu.gdSyncIcon, todo);

      menu.syncItem = (
        o("div", "mid row start item",
          o("div", "gap"),
          o("div", "ibox",
            o("div", "icon", "sync"),
          ),
          o("div", "gap"),
          o("div", "mid", "Sync"),
          o("div", "gap"),
          o("div", "ibox", menu.rsSyncIcon),
          o("div", "ibox", menu.gdSyncIcon),
          o("div", "gap"),
        )
      );

      /// all pages

      menu.allPagesFileName = "whyolet.txt";

      menu.uploadAllPagesIcon = o("div", "icon button", "west");
      onClick(menu.uploadAllPagesIcon, todo);

      menu.downloadAllPagesIcon = o("div", "icon button", "east");
      onClick(menu.downloadAllPagesIcon, todo);

      menu.allPagesItem = (
        o("div", "mid row start item",
          o("div", "gap"),
          o("div", "ibox",
            o("div", "icon", "folder_open"),
          ),
          o("div", "gap"),
          o("div", "mid", "Data"),
          o("div", "gap"),
          o("div", "ibox", menu.uploadAllPagesIcon),
          o("div", "ibox", menu.downloadAllPagesIcon),
          o("div", "gap"),
          o("div", "big start", menu.allPagesFileName),
        )
      );

      /// one page

      if (current.page) {
        menu.tag =  current.page.tag;

        menu.pageFileName = menu.tag
        .replaceAll("/", "_")
        .replaceAll("\\", "_")
        + (menu.tag.includes(".") ? "" : ".txt");

        menu.uploadPageIcon = o("div", "icon button", "west");
        onClick(menu.uploadPageIcon, todo);

        menu.downloadPageIcon = o("div", "icon button", "east");
        onClick(menu.downloadPageIcon, downloadPage);

        menu.onePageItem = (
          o("div", "mid row start item",
            o("div", "gap"),
            o("div", "ibox",
              o("div", "icon", "draft"),
            ),
            o("div", "gap"),
            o("div", "mid", "Page"),
            o("div", "gap"),
            o("div", "ibox", menu.uploadPageIcon),
            o("div", "ibox", menu.downloadPageIcon),
            o("div", "gap"),
            o("div", "big start", menu.pageFileName),
          )
        );
      } else menu.onePageItem = null;

      /// line

      menu.lineNumbers = getLineNumbers();

      menu.lineInput = (
        o("input", {
          "class": "small",
          "type": "number",
          min: 1,
          max: menu.lineNumbers.max,
          step: 1,
          value: menu.lineNumbers.cur,
        })
      );

      menu.lineItem = (
        o("div", "mid row start item",
          o("div", "gap"),
          o("div", "ibox",
            o("div", "icon", "format_list_numbered"),
          ),
          o("div", "gap"),
          o("div", "mid", "Line"),
          o("div", "gap"),
          o("div", "mid", menu.lineInput),
          o("div", "gap"),
          o("div", "mid", "/"),
          o("div", "gap"),
          o("div", "big start", `${menu.lineNumbers.max}`),
          o("div", "gap"),
        )
      );

      /// zoom

      menu.zoomInput = (
        o("input", {
          "class": "small",
          "type": "number",
          min: minZoom,
          max: maxZoom,
          step: 1,
          value: current.zoom,
        })
      );

      menu.zoomItem = (
        o("div", "mid row start item",
          o("div", "gap"),
          o("div", "ibox",
            o("div", "icon", "pan_zoom"),
          ),
          o("div", "gap"),
          o("div", "mid", "Zoom"),
          o("div", "gap"),
          o("div", "mid", menu.zoomInput),
          o("div", "gap"),
          o("div", "big start", "%"),
          o("div", "gap"),
        )
      );

      /// go

      menu.findAllIcon = o("div", "icon button", "manage_search");
      onClick(menu.findAllIcon, goFindAll);

      menu.dateInput = o("input", {
        "class": "small",
        "type": "date",
      });

      on(menu.dateInput, "change", () => {
        goTag(menu.dateInput.value);
      });

      menu.goItem = (
        o("div", "mid row start borderless item",
          o("div", "gap"),
          o("div", "ibox",
            o("div", "icon", "tag"),
          ),
          o("div", "gap"),
          o("div", "mid", "Go to"),
          o("div", "gap"),
          o("div", "mid", menu.dateInput),
          o("div", "gap"),
          o("div", "ibox", menu.findAllIcon),
          o("div", "gap"),
        )
      );

      /// tags

      const tagsSection = o("div", "section");
      menu.tagsItem = o("div", "big block", tagsSection);

      getTags((tags) => {
        for (const tag of tags) {
          const tagButton = o("span", "found-tag button", `#${tag}`);
          onClick(tagButton, () => goTag(tag));
          tagsSection.appendChild(tagButton);

          tagsSection.appendChild(
            o("span", "", "\u00a0 ")
            // Non-breakable space adds gap,
            // breakable space enables text wrap.
          );
        }
      });

      /// menu items

      menu.isSaved = false;

      const items = [
        menu.helpItem,
        menu.syncItem,
        menu.allPagesItem,
        menu.onePageItem,
        menu.lineItem,
        menu.zoomItem,
        menu.goItem,
        menu.tagsItem,
      ];

      itemsRow.textContent = "";
      for (const item of items) {
        itemsRow.appendChild(item);
      }
      show(itemsRow);
    };

    /// saveMenu

    const saveMenu = () => {
      saveLineMenuItem();
      saveZoomMenuItem();
      menu.isSaved = true;
    };

    const saveLineMenuItem = () => {
      saveIntMenuItem(
        menu.lineInput,
        menu.lineNumbers.cur,
        1,
        menu.lineNumbers.max,
        "",
        (lineNumber) => {
          current.lineNumberOnGotPage = lineNumber;
        },
      );
    };

    const saveZoomMenuItem = () => {
      saveIntMenuItem(
        menu.zoomInput,
        current.zoom,
        minZoom,
        maxZoom,
        "%",
        saveZoom,
      );
    };

    const saveIntMenuItem = (
      input, cur, min, max, unit,
      useNewValue
    ) => {
      let newValue = input.value;
      if (!newValue) return;

      newValue = parseInt(newValue, 10);
      if (newValue === cur) return;

      if (
        newValue < min ||
        newValue > max
      ) return toast(`From ${min}${unit} to ${max}${unit}`);

      useNewValue(newValue);
    };

    onClick("menu-close", () => {
      history.back();
    });

    /// help

    reservedActions[reservedTags.help]  = () => {
      menuHeader.textContent = "Cheatsheet";
      show(menuTopRow);
      show(helpRow);
    };

    /// download page

    const downloadPage = () => {
      const a = o("a", {
        "class": "hidden",
        href: "data:application/octet-stream;charset=utf-8," + encodeURIComponent(current.page.text),
        download: menu.pageFileName,
      });

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    /// getTags

    const getTags = (onGotTags) => {
      db
      .transaction(stores.page)
      .objectStore(stores.page)
      .getAll()
      .onsuccess = (event) => {
        const tags = [], dateTags = [];
        for (const page of event.target.result) {
          if (!page.text) continue;
          const tag = page.tag;
          if (isDate(tag)) {
            dateTags.push(tag);
          } else tags.push(tag);
        }
        tags.push(...dateTags);
        onGotTags(tags);
      };
    };

    /// auto-focus

    if (!isHidden(pageMainRow)) ta.focus();

    /// call main
  };

  if (document.readyState === "complete") return main();
  on(document, "DOMContentLoaded", main);
})();
