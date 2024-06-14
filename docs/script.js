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
    const tagSpan = elem("tag");
    const pageStore = "page";
    let db, page;

    const onDbError = (event) => {
      throw event.target.error;
    };

    const upgradeAppVersion = () => {
      ta.readOnly = true;
      ta.value = "Upgrading app version...";
      setTimeout(() => {
        location.reload();
      }, 1000);
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

      location.replace("#draft");
    };

    addEventListener("hashchange", (event) => {
      let tag = location.hash;
      if (tag.charAt(0) === "#") {
        tag = tag.slice(1);
      }

      db
      .transaction(pageStore)
      .objectStore(pageStore)
      .get(tag)
      .onsuccess = (event) => {
        page = event.target.result || {tag};
        if (!page.text) page.text = "";
        if (!page.sel1) page.sel1 = 0;
        if (!page.sel2) page.sel2 = 0;

        tagSpan.textContent = tag;
        ta.value = page.text;
        ta.readOnly = false;
        ta.focus();
        ta.setSelectionRange(page.sel1, page.sel2);
      };
    });

    const save = () => {
      if (!page) return;
      page.text = ta.value;
      page.sel1 = ta.selectionStart;
      page.sel2 = ta.selectionEnd;

      db
      .transaction(pageStore, "readwrite")
      .objectStore(pageStore)
      .put(page);
    };

    ta.addEventListener("input", save);
    ta.addEventListener("select", save);
    document.addEventListener("selectionchange", save);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else main();
})();
