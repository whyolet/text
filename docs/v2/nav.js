import {o, restartButton, showBanner} from "./ui.js";

/// getAppLock
///
/// Usage: getAppLock();
/// Note NO `await` to avoid blocking current thread until another tab calls `getAppLock` too.

export const getAppLock = async () => {
  try {
    await navigator.locks.request(
      "app",
      {steal: true},
      () => new Promise(() => {}),
    );
  } catch {}

  showBanner(
    o(".header", "Paused!"),
    o("",
      "You've opened Whyolet Text", o("br"),
      "in another tab.", o("br"),
      o("br"),
      "Please close it here or:"
    ),
    restartButton,
  );
};
