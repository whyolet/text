(() => {

  window.addEventListener("error", (e) => {
    window.location.assign(
      "mailto:support@whyolet.com" +
      "?subject=Whyolet%20Text" +
      "&body=" +
      encodeURIComponent([
        "Error! Please help to fix it by writing a line how it happened and/or sending this info:",
        "",
        e.message || "",
        (e.filename || "") + ":" +
        (e.lineno || "") + ":" +
        (e.colno || ""),
        "",
        e.error && e.error.stack || "",
      ].join("\n"))
    ); 
  });

  const elem = (id) => document.getElementById(id);

  const main = () => {
    // TextArea:
    const ta = elem("ta");

    // "Loading..." is finished:
    ta.value = "";
    ta.readOnly = false;
    ta.focus();
  };
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else main();
})();
