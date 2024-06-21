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

  /// main

  const main = () => {

    /// getEl, onSavedClick

    const getEl = (id) => {
      const el = document.getElementById(id);
      el.on = el.addEventListener;

      el.onSavedClick = (onSaved) => {
        const handle = () => saved(onSaved);
        el.on("click", handle);
 
        let timer;
        const millis = 500;

        const cancel = () => {
          ta.focus();
          if (timer) clearInterval(timer);
        };
        
        el.on("touchstart", () => {
          cancel();
          timer = setInterval(handle, millis);
        });

        el.on("touchcancel", cancel);
        el.on("touchmove", cancel);
        el.on("touchend", cancel);
      };

      return el;
    };

    /// elements, toast

    const ta = getEl("ta"); // TextArea
    const tagHeader = getEl("tag");
    
    const toast = (line) => {
      tagHeader.textContent = line;
      setTimeout(() => {
        tagHeader.textContent = page ? page.tag : "";
      }, 2000);
    };

    /// db

    let db, page, depth = 0;
    const pageStore = "page";
    const opStore = "op";

    const updateAppVersion = () => {
      ta.readOnly = true;
      tagHeader.textContent = "Update available...";
      setTimeout(() => {
        location.reload();
      }, 1000);
    };

    const onDbError = (event) => {
      throw event.target.error;
    };

    const openingDb = indexedDB.open("WhyoletText", 2);

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
        db.createObjectStore(pageStore, {
          keyPath: "tag"
        });
      }
      
      if (oldVersion < 2) {
        db.createObjectStore(opStore, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    }

    openingDb.onsuccess = (event) => {
      db = event.target.result;
      db.onerror = onDbError;
      db.onversionchange = updateAppVersion;

      const hash = "#draft";
      if (location.hash === hash) {
        onHashChange();
      } else location.replace(hash);
    };
    
    /// onHashChange

    const onHashChange = (event) => {
      let tag = location.hash;
      while (tag.charAt(0) === "#") {
        tag = tag.slice(1);
      }

      db
      .transaction(pageStore)
      .objectStore(pageStore)
      .get(tag)
      .onsuccess = (event) => {
        page = Object.assign(
          {
            tag,
            text: "",
            sel1: 0,
            sel2: 0,
          },
          event.target.result,
        );

        tagHeader.textContent = tag;
        ta.value = page.text;
        ta.readOnly = false;
        ta.focus();
        ta.setSelectionRange(page.sel1, page.sel2);
      };
    };

    addEventListener("hashchange", onHashChange);

    /// input, save, saved

    ta.on("input", () => save(false));

    const save = (anyChange, onSaved) => {
      if (!page) return;

      const next = {
        text: ta.value,
        sel1: ta.selectionStart,
        sel2: ta.selectionEnd,
      };

      if (
        page.text === next.text && (
          anyChange
          ? page.sel1 === next.sel1 &&
            page.sel2 === next.sel2
          : true
        )
      ) return onSaved && onSaved();

      const op = {
        tag: page.tag,

        // prev:
        p1: page.sel1,
        p2: page.sel2,

        // next:
        n1: next.sel1,
        n2: next.sel2,

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

      Object.assign(page, next);
      const opGroup = {ops: [op]};

      const txn = db.transaction([opStore, pageStore], "readwrite");
      txn.objectStore(opStore).add(opGroup);
      txn.objectStore(pageStore).put(page);
      txn.oncomplete = onSaved;
    };

    const saved = (onSaved) => {
      ta.focus();
      if (!page) return;
      save(true, onSaved);
    };

    /// hash

    getEl("hash").onSavedClick(() => {
      let i = page.sel1;

      if (!(
        isTag(i) ||
        i > 0 && isTag(i - 1)
      )) return toast("Click a word first!");
      
      while (i > 0 && isTag(i - 1)) i--;
      const start = i;

      while (i < page.text.length && isTag(i)) i++;
      let tag = page.text.slice(start, i);

      if (tag.charAt(0) === "#") {
        while (tag.charAt(0) === "#") tag = tag.slice(1);
      } else {
        ta.setRangeText("#", start, start);
      }

      save(true, () => {
        location.hash = tag;
        depth++;
      });
    });

    const isTag = (charIndex) => /\S/.test(page.text.charAt(charIndex));

    /// back

    getEl("back").onSavedClick(() => {
      if (depth > 0) {
        depth--;
        history.back();
      } else toast("No way back!");
    });

    /// call main
  };

  if (document.readyState === "complete") return main();
  document.addEventListener("DOMContentLoaded", main);
})();
