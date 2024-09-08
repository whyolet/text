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

  const isDate = (tag) => /^\d+-\d{2}-\d{2}$/.test(tag);

  /// getNow

  const getNow = () => (
    new Date()
  ).toISOString();

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
    const overdueBox = getEl("overdue-box");
    const overdueButton = getEl("overdue-button");
    const pageHeader = getEl("page-header");
    const findReplaceButton = getEl("find-replace");

    const pageMainRow = getEl("page-main-row");
    const ta = getEl("ta"); // TextArea
    const moveToDateButton = getEl("move-to-date-button");
    const moveToDateInput = getEl("move-to-date-input");

    const pageBottomRow = getEl("page-bottom-row");

    const findAllRow = getEl("find-all-row");
    const findAllWhat = getEl("find-all-what");

    const menuTopRow = getEl("menu-top-row");
    const menuHeader = getEl("menu-header");

    const itemsRow = getEl("items-row");
    const helpRow = getEl("help-row");

    const localProblemRow = getEl("local-problem-row");
    const localOkRow = getEl("local-ok-row");

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

    const todo = () => alert("TODO");

    /// reservedTags, reservedActions

    const reservedTags = {
      prefix: "--",
      find: "--find",
      help: "--help",
      local: "--local",
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
      backupPassphrase: null,
      overdueDate: null,
      page: null,
      pages: [], // for `find-all`
      textLength: 0, // for `autoindent`
      zoom: 100,

      findReplaceOnShowPage: false,
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
      goTag(getTodayPlus(0), true);
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

    const onHashChange = () => {
      if (saveTimerId) {
        clearTimeout(saveTimerId);
        saveTimerId = 0;
        save(false, doHashChange);
      } else doHashChange();
    };

    const doHashChange = () => {
      const tag = toTag(location.hash);

      if (!history.state) {
        history.replaceState(history.length, "");
      }
      if (historyStateOnStart === null) {
        historyStateOnStart = history.state;
      }

      if (!isHidden(pageTopRow)) {
        current.findReplaceOnShowPage = !isHidden(findReplaceRow);
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
        localProblemRow,
        localOkRow,
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
      show(findReplaceButton);
      if (current.findReplaceOnShowPage) {
        // Just show keeping old values.
        show(findReplaceRow);
      } else clearFindReplaceValues();

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

      getOverdueDate((overdueDate) => {
        current.overdueDate = overdueDate;
        if (overdueDate) {
          show(overdueBox);
        } else hide(overdueBox);
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
        const page = ensurePage(event.target.result, tag);
        onGotPage(page);
      };
    };

    /// ensurePage

    const ensurePage = (page, tag) => Object.assign(
      {
        tag,
        text: "",
        sel1: 0,
        sel2: 0,
        scro: 0,
        upd: getNow(),
      },
      page,
    );

    /// getPages

    const getPages = (onGotPages) => {
      db
      .transaction(stores.page)
      .objectStore(stores.page)
      .getAll()
      .onsuccess = (event) => {
        onGotPages(event.target.result);
      };
    };

    /// getSelText

    const getSelText = () => {
      return ta.value.slice(
        ta.selectionStart,
        ta.selectionEnd,
      );
    };

    /// input, saveTimerId, save, doSave, createOp

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
        upd: getNow(),
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
          onInputWhileUndone(undoneOpId, () => {
            doSave(page, next, onSaved);
          });
        } else doSave(page, next, onSaved);
      });
    };

    const doSave = (page, next, onSaved) => {
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

    const onSavedClick = (el, options, handler, longPressHandler) => {
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

        if (clickTimerId && longPressHandler) {
          stop();
          save(compareTextOnly, longPressHandler);
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
      const text = page.text;
      let i = page.sel1;

      if (!(
        isTag(text, i) ||
        i > 0 && isTag(text, i - 1)
      )) return toast("Click a word first!");
      
      while (i > 0 && isTag(text, i - 1)) i--;
      const start = i;

      while (i < text.length && isTag(text, i)) i++;
      const tag = text.slice(start, i).replaceAll(strikeChar, "");

      if (tag.charAt(0) !== "#") {
        ta.setRangeText("#", start, start);
      }

      save(false, () => goTag(tag));
    });

    const isTag = (text, charIndex) => /\S/.test(text.charAt(charIndex));

    /// back

    onSavedClick("back", "", () => {
      // Using `onSavedClick` here for auto-repeat on long press only.
      if (history.state > historyStateOnStart) {
        history.back();
      } else toast("Click # first!");
    });

    /// today

    onClick("today", () => goTag(getTodayPlus(0)));

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
      page.upd = getNow();
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

    /// move-up, move-down

    onSavedClick("move-up", "", (page) => {
      const text = ensureTextEndsWithNewline(page.text);
      const prevStart = getPrevLineStartIndex(text, page.sel1);
      const thisStart = getThisLineStartIndex(text, page.sel1);
      const nextStart = getNextLineStartIndex(text, page.sel2);
      const thisStop = decreaseByNewline(text, nextStart);
      if (thisStop < thisStart) return;
      const thisLength = thisStop - thisStart;

      const prevLine = text.slice(prevStart, thisStart);
      const thisLine = text.slice(thisStart, nextStart);

      ta.setRangeText(thisLine + prevLine, prevStart, nextStart);
      ta.setSelectionRange(prevStart, prevStart + thisLength);
      save();
    });

    onSavedClick("move-down", "", (page) => {
      const text = ensureTextEndsWithNewline(page.text);
      const thisStart = getThisLineStartIndex(text, page.sel1);
      const nextStart = getNextLineStartIndex(text, page.sel2);
      const thisStop = decreaseByNewline(text, nextStart);
      if (thisStop < thisStart) return;
      const thisLength = thisStop - thisStart;
      const nextNextStart = getNextLineStartIndex(text, nextStart);

      const thisLine = text.slice(thisStart, nextStart);
      const nextLine = text.slice(nextStart, nextNextStart);

      ta.setRangeText(nextLine + thisLine, thisStart, nextNextStart);
      const newThisStart = thisStart + nextLine.length;
      ta.setSelectionRange(newThisStart, newThisStart + thisLength);
      save();
    });

    const getPrevLineStartIndex = (text, charIndex) => {
      let i = getThisLineStartIndex(text, charIndex);
      i = decreaseByNewline(text, i);
      return getThisLineStartIndex(text, i);
    };

    const getThisLineStartIndex = (text, charIndex) => {
      let i = charIndex;

      while (
        i > 0 &&
        !isNewline(text, i - 1)
      ) i--;

      return i;
    };

    const getNextLineStartIndex = (text, charIndex) => {
      let i = charIndex;
      const length = text.length;

      while (
        i < length &&
        !isNewline(text, i)
      ) i++;

      if (
        i <= length - 2 &&
        text.charAt(i) === "\r" &&
        text.charAt(i + 1) === "\n"
      ) {
        i += 2;
      } else if (
        i <= length - 1 &&
        text.charAt(i) === "\n"
      ) {
        i++;
      }

      return i;
    };

    const decreaseByNewline = (text, charIndex) => {
      let i = charIndex;
      if (
        i >= 2 &&
        text.charAt(i - 2) === "\r" &&
        text.charAt(i - 1) === "\n"
      ) {
        i -= 2;
      } else if (
        i >= 1 &&
        text.charAt(i - 1) === "\n"
      ) {
        i--;
      }
      return i;
    };

    const ensureTextEndsWithNewline = (text) => {
      if (!text) return "";

      const newline = text.includes("\r\n") ? "\r\n" : "\n";

      return text.endsWith(newline)
        ? text
        : text + newline;
    };

    const isNewline = (text, charIndex) => /[\r\n]/.test(text.charAt(charIndex));

    /// delete

    const doDelete = (page) => {
      const focused = document.activeElement;
      if (!focused) return;

      if (focused.id !== "ta") {
        focused.value = "";
        return;
      }

      const thisStart = getThisLineStartIndex(page.text, page.sel1);
      const nextStart = getNextLineStartIndex(page.text, page.sel2);
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
      if (!fingersByIds.has(event.pointerId)) return;

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
        else moveToDate();
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
          const text = focused.value;
          start = getThisLineStartIndex(text, start);
          stop = getNextLineStartIndex(text, stop);
          stop = decreaseByNewline(text, stop);
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
      const thisStart = getThisLineStartIndex(page.text, page.sel1);
      const nextStart = getNextLineStartIndex(page.text, page.sel2);
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
          const text = focused.value;
          start = getThisLineStartIndex(text, start);
          stop = getNextLineStartIndex(text, stop);
          stop = decreaseByNewline(text, stop);
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
    }, (page) => { // Long press.
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

    const goFindAll = () => goTag(reservedTags.find);

    onClick("find-all", goFindAll);

    reservedActions[reservedTags.find] = () => {
      findAllWhat.value = findWhat.value || getSelText();
      show(findAllRow);
      findAllWhat.focus();

      itemsRow.textContent = "";
      show(itemsRow);

      getPages(onGotPagesForFind);
    };

    const onGotPagesForFind = (pages) => {
      if (isHidden(findAllRow)) return;
  
      current.pages = pages;
      for (const page of pages) {
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

    /// menu

    const menu = {
      isSaved: true,
    };

    onClick("menu", () => goTag(reservedTags.menu));

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

      /// local

      menu.localItem = (
        o("div", "mid row start button item",
          o("div", "gap"),
          o("div", "ibox",
            o("div", "icon", "pending"),
          ),
          o("div", "gap"),
          o("div", "big start", "Local data: "),
          o("div", "gap"),
        )
      );

      getPersisted((persisted) => {
        menu.localItem
        .children[1].children[0]
        .textContent = persisted
        ? "health_and_safety" : "warning";

        menu.localItem.children[3]
        .textContent += persisted
        ? "OK" : "problem";
      });

      onClick(menu.localItem, () => goTag(reservedTags.local));

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
          o("div", "mid mid-label", "Sync"),
          o("div", "gap"),
          o("div", "ibox", menu.rsSyncIcon),
          o("div", "ibox", menu.gdSyncIcon),
          o("div", "gap"),
        )
      );

      /// backup

      menu.backupFileName = "whyolet-text.db";

      menu.uploadBackupIcon = o("div", "icon button", "west");
      onClick(menu.uploadBackupIcon, uploadBackup);

      menu.downloadBackupIcon = o("div", "icon button", "east");
      onClick(menu.downloadBackupIcon, downloadBackup);

      menu.backupKeyIcon = o("div", "icon button", "key");
      onClick(menu.backupKeyIcon, () => setBackupPassphrase());

      menu.backupItem = (
        o("div", "mid row start item",
          o("div", "gap"),
          o("div", "ibox",
            o("div", "icon", "folder_open"),
          ),
          o("div", "gap"),
          o("div", "mid mid-label", "Data"),
          o("div", "gap"),
          o("div", "ibox", menu.uploadBackupIcon),
          o("div", "ibox", menu.downloadBackupIcon),
          o("div", "gap"),
          o("div", "mid", "Backup"),
          o("div", "gap"),
          o("div", "ibox", menu.backupKeyIcon),
        )
      );

      /// one page

      if (current.page) {
        menu.tag =  current.page.tag;

        menu.pageFileName = menu.tag
        .replace(/^.*[\/\\]/, "")
        + (menu.tag.includes(".") ? "" : ".txt");

        menu.uploadPageIcon = o("div", "icon button", "west");
        onClick(menu.uploadPageIcon, uploadPage);

        menu.downloadPageIcon = o("div", "icon button", "east");
        onClick(menu.downloadPageIcon, downloadPage);

        menu.onePageItem = (
          o("div", "mid row start item",
            o("div", "gap"),
            o("div", "ibox",
              o("div", "icon", "draft"),
            ),
            o("div", "gap"),
            o("div", "mid mid-label", "Page"),
            o("div", "gap"),
            o("div", "ibox", menu.uploadPageIcon),
            o("div", "ibox", menu.downloadPageIcon),
            o("div", "gap"),
            o("div", "big start", "File"),
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
          o("div", "mid big-label", "Line"),
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
          o("div", "mid big-label", "Zoom"),
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
          o("div", "mid big-label", "Go to"),
          o("div", "gap"),
          o("div", "mid", menu.dateInput),
          o("div", "gap"),
          o("div", "mid", "date or tag"),
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
        menu.localItem,
        menu.syncItem,
        menu.backupItem,
        menu.onePageItem,
        menu.lineItem,
        menu.zoomItem,
        menu.goItem,
        menu.tagsItem,
      ];

      const fragment = document.createDocumentFragment();
      for (const item of items) {
        fragment.appendChild(item);
      }

      itemsRow.textContent = "";
      itemsRow.appendChild(fragment);
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

    /// local

    const isPersistSupported = (
      "storage" in navigator &&
      "persist" in navigator.storage
    );

    const getPersisted = (onGotPersisted) => {
      if (isPersistSupported) {
        navigator.storage.persisted()
        .then(onGotPersisted);
      } else onGotPersisted(false);
    };

    const tryPersist = (onGotPersisted) => {
      if (onGotPersisted === undefined) {
        onGotPersisted = () => {};
      }
      if (isPersistSupported) {
        navigator.storage.persist()
        .then(onGotPersisted);
      } else onGotPersisted(false);
    };

    reservedActions[reservedTags.local]  = () => {
      menuHeader.textContent = "Local data";
      show(menuTopRow);

      getPersisted((persisted) => {
        if (persisted) return show(localOkRow);

        tryPersist((persisted) => show(
          persisted
          ? localOkRow
          : localProblemRow
        ));
      });
    };

    onClick("local-request-button", () => {
      if (!isPersistSupported) {
        alert("Persistence is not supported, get a new browser!");
        return;
      }

      if (!("Notification" in window)) {
        alert("Notification is not supported, get a new browser!");
        return;
      }

      if (Notification.permission === "granted") {
        alert("Notification was allowed already, but it does not help. Try another browser.");
        return;
      }

      Notification.requestPermission()
      .then((permission) => {
        if (permission !== "granted") {
          alert("Notification is NOT allowed! Please try again.");
          return;
        }

        tryPersist((persisted) => {
          if (!persisted) {
            alert("Notification is allowed, but it does not help. Try another browser.");
            return;
          }

          alert("Success! 🐱");
          history.back();
        });
      });
    });

    /// setBackupPassphrase

    const setBackupPassphrase = (onSuccess) => {
      const newPassphrase = prompt(`A passphrase (few words)
to encrypt and decrypt
Backup and Sync files:`);
      if (newPassphrase === null) return;

      current.backupPassphrase = newPassphrase;

      alert(`This passphrase will be kept in memory
until you set a new passphrase
or close this app.`);

      if (onSuccess) onSuccess();
    };

    /// withBackupPassphrase

    const withBackupPassphrase = (onSuccess) => {
      if (current.backupPassphrase === null) {
        setBackupPassphrase(onSuccess);
      } else onSuccess();
    };

    /// getSalt, getIV, getRandomBytes

    const getSalt = () => getRandomBytes(24);

    const getIV = () => getRandomBytes(12);

    const getRandomBytes = (size) => crypto.getRandomValues(new Uint8Array(size));

    /// getKey

    const getKey = async (salt, passphrase, onGotKey) => {
      const encoder = new TextEncoder();

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"],
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt,
          iterations: 1000000,
        },
        keyMaterial,
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"],
      );

      onGotKey(key);
    };

    /// getEncrypted

    const getEncrypted = async (key, data, onGotEncrypted) => {
      const iv = getIV();
      const dataBlob = new Blob([data]);
      const dataBuffer = await dataBlob.arrayBuffer();

      const encrypted = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
        },
        key,
        dataBuffer,
      );

      onGotEncrypted(iv, encrypted);
    };

    /// uploadBackup

    const uploadBackup = () => {
      return todo(); // decrypt, detect gzip, decompress

      getUploadedText((text) => {
        importText(text, (report) => {
          alert(`Success:
* Created: ${report.created}
* Updated: ${report.updated}

Skipped:
* Outdated: ${report.outdated}
* Not changed: ${report.notChanged}
`);
        });
      });
    };

    /// downloadBackup

    const downloadBackup = () => withBackupPassphrase(() => {
      getPages((pages) => {
        const lines = [];
        for (const page of pages) {
          lines.push(JSON.stringify(page));
        }
        const text = `[\n${lines.join(",\n")}\n]\n`;

        if ("CompressionStream" in window) {
          const jsonified = new Response(text);

          const gzipped = new Response(
            jsonified.body.pipeThrough(new CompressionStream("gzip")),
            {headers: {"Content-Type": "application/octet-stream"}},
          );

          gzipped.blob().then(encryptAndDownloadBackup);
        } else encryptAndDownloadBackup(text);
      });
    });

    const encryptAndDownloadBackup = (data) => {
      const salt = getSalt();
      const key = getKey(salt, current.backupPassphrase, (key) => {
        getEncrypted(key, data, (iv, encrypted) => {
          const blob = new Blob(
            [salt, iv, encrypted],
            {"type": "application/octet-stream"},
          );

          const url = URL.createObjectURL(blob);
          downloadURL(url, menu.backupFileName);
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
        });
      });
    };

    /// uploadPage

    const uploadPage = () => {
      if (!current.page) return;

      const page = current.page;

      getUploadedText((text) => {
        const next = {
          tag: page.tag,
          text,
          sel1: 0,
          sel2: 0,
          scro: 0,
          upd: getNow(),
        };

        doSave(page, next, () => {
          history.back();
        });
      });
    };

    /// downloadPage

    const downloadPage = () => {
      downloadText(current.page.text, menu.pageFileName);
    };

    /// getUploadedText

    const getUploadedText = (onGotUploadedText) => {
      const fileInput = o("input", {
        "class": "hidden",
        "type": "file",
      });

      on(fileInput, "change", () => {
        const file = fileInput.files[0];
        const reader = new FileReader();

        on(reader, "load", () => {
          onGotUploadedText(reader.result);
        });

        reader.readAsText(file);
      });

      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    };

    /// downloadURL

    const downloadURL = (url, fileName) => {
      const a = o("a", {
        "class": "hidden",
        href: url,
        download: fileName,
      });

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    /// downloadText

    const downloadText = (text, fileName) => downloadURL(
      "data:application/octet-stream;charset=utf-8," + encodeURIComponent(text),
      fileName,
    );

    /// importText

    const importText = (text, onImported) => {
      let importedPages;
      try {
        importedPages = JSON.parse(text);
      } catch {
        return importFailed();
      }

      if (!Array.isArray(importedPages)) return importFailed();

      getPages((localPages) => {
        let created = 0, updated = 0;
        let outdated = 0, notChanged = 0;

        const localPagesByTag = {};
        for (const localPage of localPages) {
          localPagesByTag[localPage.tag] = localPage;
        }

        for (const importedPage of importedPages) {
          if (!(
            "tag" in importedPage &&
            typeof importedPage.tag === "string"
          )) return importFailed();

          const tag = importedPage.tag;
          const localPage = localPagesByTag[tag];

          if (localPage) {
            const localUpd = localPage.upd || "";
            const importedUpd = importedPage.upd || "";

            if (localUpd === importedUpd) {
              notChanged++;
              continue;
            }

            if (localUpd > importedUpd) {
              outdated++;
              continue;
            }

            updated++;
          } else created++;

          doSave(
            ensurePage(localPage, tag),
            ensurePage(importedPage, tag),
          );
        }

        if (onImported) onImported({
          created,
          updated,
          outdated,
          notChanged,
        });
      });
    };

    const importFailed = () => {
      alert("Cannot import this file!\nPlease use a file exported previously with:\nMenu - Backup or Sync");
    };

    /// getTags

    const getTags = (onGotTags) => {
      getPages((pages) => {
        const tags = [], dateTags = [];
        for (const page of pages) {
          if (!page.text) continue;

          const tag = page.tag;
          if (isDate(tag)) {
            dateTags.push(tag);
          } else tags.push(tag);
        }
        tags.push(...dateTags);
        onGotTags(tags);
      });
    };

    /// move-to-date

    onSavedClick(moveToDateButton, "", () => {
      moveToDate();
    }, () => { // Long press.
      moveToDateInput.value = "";
      moveToDateInput.min = getTodayPlus(0);
      if ("showPicker" in moveToDateInput) {
        try { // May fail without interaction!
          moveToDateInput.showPicker();
          return;
        } catch {}
      }
      moveToDateInput.click();
    });

    on(moveToDateInput, "change", () => {
      moveToDate(moveToDateInput.value);
    });

    const getTodayPlus = (days) => {
      const date = new Date(Date.now() + days * 1000*60*60*24);
      return date.toISOString().split("T")[0];
    };

    const moveToDate = (date) => {
      const page = current.page;
      if (!page) return;

      if (!date) date = getTodayPlus(
        (
          isDate(page.tag) &&
          page.tag < getTodayPlus(0)
        ) ? 0 : 1
      );
      if (date === page.tag) return;

      const text = page.text;
      const thisStart = getThisLineStartIndex(text, page.sel1);
      const nextStart = getNextLineStartIndex(text, page.sel2);
      const movedText = text.slice(thisStart, nextStart);
      if (!movedText) return toast("Move what?");

      toast(`▷ ${date}`);
      ta.setRangeText("", thisStart, nextStart, "start");

      save(false, () => {
        getPage(date, (datePage) => {
          const next = Object.assign({}, datePage);
          next.text = ensureTextEndsWithNewline(next.text) + movedText;
          next.upd = getNow();
          doSave(datePage, next);
        });
      });
    };

    /// getOverdueDate, overdueButton

    const getOverdueDate = (onGotOverdueDate) => {
      const query = IDBKeyRange.bound("0", getTodayPlus(-1));
      
      db
      .transaction(stores.page)
      .objectStore(stores.page)
      .getAll(query)
      .onsuccess = (event) => {
        for (const page of event.target.result) {
          if (!isDate(page.tag)) continue;

          // Blank (with spaces) page is not empty.
          // "Undo" will be broken if we delete not empty page.
          if (page.text) return onGotOverdueDate(page.tag);

          db
          .transaction(stores.page, "readwrite")
          .objectStore(stores.page)
          .delete(page.tag);
        }
        onGotOverdueDate(null);
      };
    };

    onClick(overdueButton, () => {
      if (!current.page) return;

      if (current.page.tag !== current.overdueDate) return goTag(current.overdueDate);

      getOverdueDate((overdueDate) => {
        current.overdueDate = overdueDate;
        goTag(overdueDate || getTodayPlus(0));
      });
    });

    /// try

    if (!isHidden(pageMainRow)) ta.focus();

    getPersisted((persisted) => {
      if (!persisted) tryPersist();
    });

    /// call main
  };

  if (document.readyState === "complete") return main();
  on(document, "DOMContentLoaded", main);
})();
