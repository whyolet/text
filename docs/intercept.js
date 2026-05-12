if (location.hash.includes("state")) {
  if (window.opener) {
    window.opener.postMessage({
      "type": "oauth-redirect",
      "hash": location.hash,
    });
  } else {
    location.hash = "";
    alert(`Please don't
"Open in browser":
it breaks the sync!`);
  }

  window.close();

  // Prevent further execution.
  await new Promise(() => {});
}
