(function() {
  const elem = (id) => document.getElementById(id);

  const main = () => {
    const ta = elem("ta");
    ta.value = "";
    ta.readOnly = false;
    ta.focus();
  }
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else main();
})();