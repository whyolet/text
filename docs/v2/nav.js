import * as db from "./db.js";
import {hideFindForm} from "./find.js";
import {hideLineForm} from "./line.js";
import {getNewPage, openPage, openPageByTag, save} from "./page.js";
import {getSel} from "./sel.js";
import {getDateInput, debounce, hide, o, on, getRestartButton, show, showBanner, showDateInput, toast, ui} from "./ui.js";

const mem = db.mem;

const folder = "📂";
const folderCodePoint = folder.codePointAt(0);

/// getNow, getTodayPlus, isDateTag

export const getNow = () => (new Date()).toISOString();  // UTC

export const getTodayPlus = (days) => {
  const date = new Date(Date.now() + days * 1000*60*60*24);
  return date.toISOString().split("T")[0];
};

export const isDateTag = (tag) => /^\d+-\d{2}-\d{2}$/.test(tag);

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

/// initNavUI

export const initNavUI = () => {
  on(window, "popstate", onSetState);

  ui.attic = o(".attic collapsible collapsed");
  ui.openDateInput = getDateInput(onOpenDateInput);
  ui.moveToDateInput = getDateInput(onMoveToDateInput);
};

/// hideAtticForms

export const hideAtticForms = () => {
  hideFindForm();
  hideLineForm();
};

/// onOpenDate, onOpenDateInput

export const onOpenDate = () => {
  showDateInput(ui.openDateInput);
};

const onOpenDateInput = (date) => {
  openScreen(screenTypes.page, {tag: date});
};

/// onOpenTag

export const onOpenTag = async () => {
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

  if (tag === mem.page.tag) {
    toast("It's opened already!");
    return;
  }

  openScreen(screenTypes.page, {tag});
};

/// onBack

export const onBack = async () => {
  if (history.state > 1) {
    history.back();
  } else toast("Open something first!");
};

/// onOpenHome

export const onOpenHome = () => {
  const today = getTodayPlus(0);
  if (mem.page.tag === today) {
    toast("It's today already!");
    return;
  }

  openScreen(screenTypes.page, {tag: today});
};

/// showOrHideOverdue, onMoveOverdue

export const showOrHideOverdue = () => {
  const today = getTodayPlus(0);
  if (mem.page.tag !== today) {
    hide(ui.moveOverdue);
    return;
  }

  for (const tag in mem.pages) {
    if (!isOverdueTag(tag, today)) continue;

    show(ui.moveOverdue);
    return;
  }

  hide(ui.moveOverdue);
};

const isOverdueTag = (tag, today) => (
  tag < today &&
  isDateTag(tag) &&
  mem.pages[tag].text
);

export const onMoveOverdue = async () => {
  const today = getTodayPlus(0);
  if (mem.page.tag !== today) {
    // Midnight happened.
    openScreen(screenTypes.page, {tag: today});
    // It's debounced, so:
    alert("Welcome to a new day!");
    setTimeout(onMoveOverdue, 500);
    return;
  }

  if (!confirm("Move overdue to today?")) return;

  const overdueTags = [];
  for (const tag in mem.pages) {
    if (isOverdueTag(tag, today)) overdueTags.push(tag);
  }
  overdueTags.sort();

  const now = getNow();
  const parts = [];

  for (const tag of overdueTags) {
    const page = mem.pages[tag];
    const text = page.text.trim();
    if (text) parts.push(text);

    await db.savePage(page, {
      withoutFinalize: true,
    });  // For undo.

    Object.assign(page, {
      text: "",
      edited: now,
      selStart: 0,
      selEnd: 0,
      scroll: 0,
    });

    await db.savePage(page, {
      withoutFinalize: true,
    });
  }

  const text = mem.page.text.trim();
  if (text) parts.push(text);

  await db.savePage(mem.page, {
    withoutFinalize: true,
  });  // For undo.

  Object.assign(mem.page, {
    text: parts.join("\n"),
    edited: now,
    selStart: 0,
    selEnd: 0,
    scroll: 0,
  });

  await db.savePage(mem.page);
  openPage(mem.page);
};

/// onMoveToDate, onMoveToDateInput

export const onMoveToDate = () => {
  const {start, end} = getSel({wholeLines: true});
  ui.ta.setSelectionRange(start, end);
  showDateInput(ui.moveToDateInput);
};

const onMoveToDateInput = async (date) => {
  const {start, end, part} = getSel({
    wholeLines: true,
    withNewline: true,
  });

  const page = mem.pages[date] ??= getNewPage(date);

  await db.savePage(page, {
    withoutFinalize: true,
  });  // For undo.

  const parts = [
    page.text.trim(),
    part.trim(),
  ];

  Object.assign(page, {
    text: parts.join("\n"),
    edited: getNow(),
    selStart: 0,
    selEnd: 0,
    scroll: 0,
  });

  await db.savePage(page, {
    withoutFinalize: true,
  });

  ui.ta.setRangeText("", start, end, "end");
  await save();

  toast(`Moved to ${date}`);
};