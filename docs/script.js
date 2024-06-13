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
    let db;

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
        db.createObjectStore("page", {
          keyPath: "tag"
        });
      }
    }

    openingDb.onsuccess = (event) => {
      db = event.target.result;
      db.onerror = onDbError;
      db.onversionchange = upgradeAppVersion;

      // "Loading..." is finished:
      ta.value = "";
      ta.readOnly = false;
      ta.focus();
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else main();
})();
