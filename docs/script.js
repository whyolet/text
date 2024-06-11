(function() {
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
