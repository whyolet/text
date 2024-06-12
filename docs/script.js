(() => {

  addEventListener("error", (e) => {
    const banner = "Error! Please help to fix it by writing a line how it happened and/or sending this info";

    location.assign(
      "mailto:support@whyolet.com" +
      "?subject=Whyolet%20Text" +
      "&body=" +
      encodeURIComponent(
        `${banner}:

${e.message || ""}
${e.filename || ""}:${e.lineno || ""}:${e.colno || ""}

${e.error && e.error.stack || ""}

${banner} above.
Thank you!`
      )
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
