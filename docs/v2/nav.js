import * as db from "./db.js";
import {openPageByTag, save} from "./page.js";
import {debounce, o, on, getRestartButton, showBanner, toast, ui} from "./ui.js";

const mem = db.mem;

const folder = "📂";
const folderCodePoint = folder.codePointAt(0);

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

  showBanner({},
    o(".header", "Paused!"),
    o("",
      "You've opened Whyolet Text", o("br"),
      "in another tab.", o("br"),
      o("br"),
      "Please close it here or:"
    ),
    getRestartButton(),
  );
};

/// openScreen, screenTypes

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

/// onSetState

const onSetState = (event) => debounce("onSetState", 100, async () => {
  const i = event.state;
  if (!i) return;

  await save();

  const screen = screens[i];
  if (screen.type === screenTypes.page) {
    openPageByTag(screen.props.tag);
  } else throw new Error(screen.type);
});

/// initNav

export const initNav = () => {
  on(window, "popstate", onSetState);
};

/// onOpen

export const onOpen = async () => {
  const {text, selStart: cursor} = mem.page;

  const head = text.slice(0, cursor);
  const tail = text.slice(cursor);

  const start = head.search(/[^─\s]*$/);
  const end = cursor + tail.match(/[^─\s]*/)[0].length;

  const hashtag = text.slice(start, end);
  const tag = hashtag.replaceAll(folder, "");

  if (!tag) return toast("Click a word first!");

  if (hashtag.codePointAt(0) !== folderCodePoint) {
    ui.ta.setRangeText(folder, start, start);
    await save();
  }

  openScreen(screenTypes.page, {tag});
};

/// onBack

export const onBack = async () => {
  if (history.state > 1) {
    history.back();
  } else toast("Open something first!");
};
