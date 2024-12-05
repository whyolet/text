import {debounced, o, on, restartButton, showBanner} from "./ui.js";

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

/// openPage, onSetState

const openedPages = [];

export const openPage = (id, isTag) => {
  openedPages.push({id, isTag});
  const state = openedPages.length;
  if (history.state !== state) {
    if (history.state) {
      history.pushState(state, "");
    } else history.replaceState(state, "");
  }

  // `pushState/replaceState` may or may not trigger `popstate`, so we call debounced `onSetState`.
  onSetState({state});
};

const onSetState = event => debounced("onSetState", 100, () => {
  const state = event.state;
  if (!state) return;
  alert(`todo ${state}`);
});

on(window, "popstate", onSetState);
