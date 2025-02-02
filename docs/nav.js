import {anchor} from "./anchor.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {hideFindForm, onFindNext, showFindForm} from "./find.js";
import {hideFontForm} from "./font.js";
import {openInfo} from "./info.js";
import {hideLineForm} from "./line.js";
import {hideMenuForm} from "./menu.js";
import {getDone, getPage, openPage, openPageByTag, save, splitDoneText, zeroCursor} from "./page.js";
import {openSearch} from "./search.js";
import {getSel, strikes} from "./sel.js";
import {getDateInput, debounce, hide, o, on, getRestartButton, show, showBanner, showDateInput, toast, ui} from "./ui.js";

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
    "Paused!",
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
  info: "info",
  page: "page",
  search: "search",
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
  if (!i || !ui.isActive) return;

  const screen = screens[i];
  if (!screen) return;

  await save();

  for (const screenType in screenTypes) {
    const el = ui[screenType];
    if (screenType === screen.type) {
      show(el);
    } else hide(el);
  }

  if (screen.type === screenTypes.page) {
    const {tag, query} = screen.props;
    await openPageByTag(tag);

    if (query) {
      // Find only once: when page is opened from Search, not when it is opened later on Back.
      screen.props.query = "";

      showFindForm();
      ui.findInput.value = query;
      Object.assign(mem.page, zeroCursor);
      onFindNext();
    }

  } else if (screen.type === screenTypes.search) {
    openSearch(screen.props.query);

  } else if (screen.type === screenTypes.info) {
    const {header, items} = screen.props;
    openInfo(header, items);

  } else throw new Error(screen.type);
});

/// initNavUI

export const initNavUI = () => {
  on(window, "popstate", onSetState);
  on(document, "focusin", onFocus);

  ui.attic = o(".attic collapsible collapsed");
  ui.attic2 = o(".attic collapsible collapsed");
  ui.openDateInput = getDateInput(onOpenDateInput);
  ui.moveToDateInput = getDateInput(onMoveToDateInput);
};

/// hideAtticForms

export const hideAtticForms = () => {
  hideMenuForm();
  hideFontForm();
  hideLineForm();
  hideFindForm();
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

export const onBack = () => {
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

  for (const page of Object.values(mem.pages)) {
    if (!isOverdue(page, today)) continue;

    show(ui.moveOverdue);
    return;
  }

  hide(ui.moveOverdue);
};

const isOverdue = (page, today) => (
  page.tag < today &&
  isDateTag(page.tag) &&
  !page.done
);

export const onMoveOverdue = async () => {
  const today = getTodayPlus(0);
  if (mem.page.tag !== today) {
    // Midnight happened.
    openScreen(screenTypes.page, {tag: today});
    // Opening is debounced, so:
    setTimeout(() => {
      alert("Welcome to a new day!");
      onMoveOverdue();
    }, 500);
    return;
  }

  if (!confirm(
`Move overdue to today?

${strikes}Done lines${strikes}
and text after ${anchor}
will not be moved.`
  )) return;

  const overdueTags = [];
  for (const page of Object.values(mem.pages)) {
    if (isOverdue(page, today)) overdueTags.push(page.tag);
  }
  overdueTags.sort();

  const now = getNow();
  const parts = [];

  for (const tag of overdueTags) {
    const page = mem.pages[tag];
    const {notDoneText, doneText} = splitDoneText(page);

    if (notDoneText) parts.push(notDoneText);

    Object.assign(page, {
      text: doneText,
      done: true,
      edited: now,
    }, zeroCursor);

    await db.savePage(page, {
      withoutFinalize: true,
    });
  }

  const text = mem.page.text.trim();
  if (text) parts.push(text);

  Object.assign(mem.page, {
    text: parts
      .filter(value => value)
      .join("\n"),
    edited: now,
  }, zeroCursor);

  mem.page.done = getDone(mem.page);
  await db.savePage(mem.page);
  await openPage(mem.page);
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

  ui.ta.setRangeText("", start, end, "end");
  await save();

  const page = getPage(date);

  const parts = [
    page.text.trim(),
    part.trim(),
  ].filter(value => value);

  Object.assign(page, {
    text: parts.join("\n"),
    edited: getNow(),
  }, zeroCursor);

  page.done = getDone(page);
  await db.savePage(page);
  showOrHideOverdue();
  toast(`Moved to ${date}`);
};

/// onFocus

const onFocus = (event) => {
  // Set `ui.focusedInput` only if it should be supported by `focused: true` actions.

  const el = event.target;
  if ([
    ui.ta,
    ui.findInput,
    ui.replaceInput,
  ].includes(el)) ui.focusedInput = el;
  // `document.activeElement` may be `body` on button click!
};
