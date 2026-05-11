if (
  window.opener &&
  location.hash.includes("state")
) {
  window.opener.postMessage({
    "type": "oauth-redirect",
    "hash": location.hash,
  }, location.origin);

  window.close();

  // Prevent further execution.
  await new Promise(() => {});
}
