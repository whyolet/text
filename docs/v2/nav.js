import {mem} from "./db.js";
import {debounced, o, on, restartButton, showBanner, ui} from "./ui.js";

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

/// openScreen, screenTypes, onSetState

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
    openPage(screen.props.tag);
  } else throw new Error(screen.type);
});

on(window, "popstate", onSetState);

/// openPage

const openPage = (tag) => {
  const page = mem.pages[tag] || {
    tag,
    text: "",
    ss: 0,  // selectionStart
    se: 0,  // selectionEnd
    st: 0,  // scrollTop
    tu: (new Date()).toISOString(),
    // when the Text was Updated, ISO UTC
  };

  ui.ta.value = page.text;
  ui.ta.setSelectionRange(page.ss, page.se);
  ui.ta.scrollTop = page.st;
};
