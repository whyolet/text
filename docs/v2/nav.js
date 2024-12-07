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

/// screenTypes, openScreen, onSetState

export const screenTypes = Object.seal({
  page: "page",
});

const screens = [null];

export const openScreen = (type, props) => {
  const i = (history.state || 0) + 1;
  screens[i] = {type, props};

  if (history.state) {
    history.pushState(i, "");
  } else history.replaceState(i, "");

  // `pushState/replaceState` may or may not trigger `popstate`, so we call debounced `onSetState`.
  onSetState({state: i});
};

const onSetState = (event) => debounced("onSetState", 100, () => {
  const i = event.state;
  if (!i) return;

  const screen = screens[i];
  if (screen.type === screenTypes.page) {
    alert(screen.props.tag);
  } else throw new Error(screen.type);
});

on(window, "popstate", onSetState);
