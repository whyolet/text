(() => {
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

  const elem = (id) => document.getElementById(id);

  const main = () => {
    const ta = elem("ta"); // TextArea
    const tagHeader = elem("tag");
    const pageStore = "page";
    let db, page;

    const upgradeAppVersion = () => {
      ta.readOnly = true;
      ta.value = "Upgrading app version...";
      setTimeout(() => {
        location.reload();
      }, 1000);
    };

    const onDbError = (event) => {
      throw event.target.error;
    };

    const openingDb = indexedDB.open("WhyoletText", 1);

    openingDb.onerror = (event) => {
      const error = event.target.error;
      if (error.name === "VersionError") {
        upgradeAppVersion();
      } else throw error;
    };

    openingDb.onupgradeneeded = (event) => {
      db = event.target.result;
      db.onerror = onDbError;
      const oldVersion = event.oldVersion;

      if (!oldVersion) {
        db.createObjectStore(pageStore, {
          keyPath: "tag"
        });
      }
    }

    openingDb.onsuccess = (event) => {
      db = event.target.result;
      db.onerror = onDbError;
      db.onversionchange = upgradeAppVersion;

      const hash = "#draft";
      if (location.hash === hash) {
        onHashChange();
      } else location.replace(hash);
    };

    const onHashChange = (event) => {
      let tag = location.hash;
      if (tag.charAt(0) === "#") {
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

    const ui2model = () => {
      page.text = ta.value;
      page.sel1 = ta.selectionStart;
      page.sel2 = ta.selectionEnd;
    };

    const ui2db = () => {
      if (!page) return;
      ui2model();

      db
      .transaction(pageStore, "readwrite")
      .objectStore(pageStore)
      .put(page);
    };

    ta.addEventListener("input", ui2db);
    ta.addEventListener("select", ui2db);
    document.addEventListener("selectionchange", ui2db);

    const toast = (line) => {
      tagHeader.textContent = line;
      setTimeout(() => {
        tagHeader.textContent = page ? page.tag : "";
      }, 2000);
      ta.focus();
    };

    const isTag = (charIndex) => /\S/.test(page.text.charAt(charIndex));

    elem("hash").addEventListener("click", () => {
      if (!page) return;
      ui2model();

      let i = page.sel1;
      if (
        isTag(i) ||
        i > 0 && isTag(i - 1)
      ) {
        while (i > 0 && isTag(i - 1)) i--;
      } else return toast("Click a word first!");
      const start = i;

      while (i < page.text.length && isTag(i)) i++;
      let tag = page.text.slice(start, i);

      if (tag.charAt(0) === "#") {
        while (tag.charAt(0) === "#") tag = tag.slice(1);
      } else {
        ta.setRangeText("#", start, start);
        ui2db();
      }

      location.hash = tag;
      ta.focus();
    });

    elem("back").addEventListener("click", () => {
      history.back();
      ta.focus();
    });
  };

  if (document.readyState === "complete") return main();
    document.addEventListener("DOMContentLoaded", main);
})();
