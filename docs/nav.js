/*
 * Whyolet Text - personal tasks/text editor.
 * Copyright (C) 2026  Denis Ryzhkov <denisr@denisr.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {anchor} from "./anchor.js";
import {getId} from "./crypto.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {hideFindForm, onFindNext, showFindForm} from "./find.js";
import {applyFont, hideFontForm} from "./font.js";
import {onRedirect} from "./gdrive.js";
import {info, openInfo, openInfoScreen} from "./info.js";
import {hideLineForm} from "./line.js";
import {getPersisted, tryPersist} from "./local.js";
import {hideMenuForm} from "./menu.js";
import {getDone, getPage, openPage, openPageByTag, save, splitDoneText, zeroCursor} from "./page.js";
import {openSearch} from "./search.js";
import {check, getSel, setSel} from "./sel.js";
import {ask, enter, getDateInput, debounce, hide, hideOverlay, o, on, getRestartButton, say, show, showBanner, showDateInput, showOverlay, toast, ui} from "./ui.js";

export const folder = "📂";
const folderCodePoint = folder.codePointAt(0);

/// getNow in UTC

export const getNow = () => (new Date()).toISOString();

/// getToday in local TZ

export const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/// isDateTag

export const isDateTag = (tag) => /^\d+-\d{2}-\d{2}$/.test(tag);

/// getAppLock
///
/// Usage: getAppLock();
/// Note NO `await` to avoid blocking current thread.
/// Banner is shown when another tab calls `getAppLock`, stealing our lock.

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
    o("", `
You've opened ${ui.appName}
in another tab.

Please close it here or:
    `),
    getRestartButton(),
  );
};

/// onMessage

const onMessage = (event) => {
  if (event.origin !== location.origin) return;

  if (event.data.type === "oauth-redirect") {
    onRedirect(event.data.hash);
  }
};

/// openFirstScreen

export const openFirstScreen = async () => {
  await openScreen(screenTypes.page, {tag: getToday()});

  const persisted = await getPersisted();
  if (!persisted) await tryPersist();
};

/// openScreen, screenTypes

export const screenTypes = Object.seal({
  info: "info",
  page: "page",
  search: "search",
});

export const openScreen = async (type, props) => {
  const {replace, historyOnly} = props ?? {};
  if (replace) delete props.replace;
  if (historyOnly) delete props.historyOnly;

  const screenId = getId();
  mem.screens[screenId] = {type, props};

  if (history.state && !replace) {
    history.pushState(screenId, "");
  } else {
    history.replaceState(screenId, "");
  }

  // `pushState/replaceState` never trigger `popstate/onSetState`.
  if (!historyOnly) await onSetState({state: screenId});
};

/// onSetState

const onSetState = async (event) => {
  const screenId = event.state;
  if (!screenId || !ui.isActive) return;

  const screen = mem.screens[screenId];
  if (!screen) return;

  const {withoutSave} = screen.props ?? {};
  if (!withoutSave) await save();

  for (const screenType in screenTypes) {
    const el = ui[screenType];
    if (screenType === screen.type) {
      show(el);
    } else hide(el);
  }

  // `openInfo` will set `false`.
  info.closed = true;

  if (screen.type === screenTypes.page) {
    const {tag} = screen.props;
    await openPageByTag(tag);

    if (mem.fromSearch) {
      mem.fromSearch = false;
      if (mem.searchQuery) {
        showFindForm({
          withoutChanges: true,
        });
        ui.findInput.value = mem.searchQuery;
        Object.assign(mem.page, zeroCursor);
        await onFindNext();
      }
    }

  } else if (screen.type === screenTypes.search) {
    openSearch();

  } else if (screen.type === screenTypes.info) {
    const {header, items, props} = screen.props;
    openInfo(header, items, props);

  } else throw Error(screen.type);
};

/// initNavUI

export const initNavUI = () => {
  on(window, "message", onMessage);
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

const onOpenDateInput = async (date) => {
  if (date === mem.page.tag) return;

  await openScreen(screenTypes.page, {tag: date});
};

/// onOpenTag

export const onOpenTag = async () => {
  const {text, selStart: cursor} = mem.page;
  const {start, end, withFolder} = detectTag(text, cursor);

  const folderAndTag = text.slice(start, end);
  let insert = withFolder ? "" : folder;
  let tag = folderAndTag.replaceAll(folder, "");

  if (!tag) {
    tag = await enter("Enter new tag:");
    if (tag === null) return;

    tag = tag?.trim();
    if (!tag) {
      toast("It's empty!", {warn: true});
      return;
    }

    insert += tag;
  }

  if (insert) {
    mem.protectedLength += insert.length;
    ui.ta.setRangeText(insert, start, start);
    await save();
  }

  if (tag === mem.page.tag) {
    toast("It's opened already!");
    return;
  }

  await openScreen(screenTypes.page, {tag});
};

/// detectTag

export const detectTag = (text, cursor) => {
  const head = text.slice(0, cursor);
  const tail = text.slice(cursor);

  const start = head.search(/\S*$/);
  const end = cursor + tail.match(/\S*/)[0].length;

  const withFolder = text.codePointAt(start) === folderCodePoint;

  return {
    start,
    end,
    withFolder,
  };
}

/// onBack

export const onBack = () => {
  // In case `back()` does nothing, hint to click "open" first.
  toast("No way back!", {
    isShy: true,
  });

  history.back();
};

/// onOpenHome

export const homeTag = "Home";

export const onOpenHome = async () => {
  if (mem.page.tag === homeTag) {
    toast("You are home already!");
    return;
  }

  await openScreen(screenTypes.page, {tag: homeTag});
};

/// showOrHideOverdue, onMoveOverdue

export const showOrHideOverdue = () => {
  const today = getToday();
  if (mem.page?.tag !== today) {
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
  const today = getToday();
  if (mem.page.tag !== today) {
    // Midnight happened.
    await openScreen(screenTypes.page, {tag: today});
    await say("Welcome to a new day!");
    await onMoveOverdue();
    return;
  }

  if (!await ask(
`Move overdue to today?

${check} Done lines
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
  let hasPrev = false;

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
      hasPrev,
      hasNext: true,
    });

    hasPrev = true;
  }

  const text = mem.page.text.trim();
  if (text) parts.push(text);

  Object.assign(mem.page, {
    text: parts.join("\n"),
    edited: now,
  }, zeroCursor);

  mem.page.done = getDone(mem.page);
  await db.savePage(mem.page, {hasPrev});
  await openPage(mem.page);
};

/// onMoveToDate, onMoveToDateInput

export const onMoveToDate = () => {
  const {start, end} = getSel({wholeLines: true});
  setSel(start, end);
  showDateInput(ui.moveToDateInput);
};

const onMoveToDateInput = async (date) => {
  const {start, end, part} = getSel({
    wholeLines: true,
    withNewline: true,
  });

  ui.ta.setRangeText("", start, end, "end");
  await save({hasNext: true});

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
  await db.savePage(page, {hasPrev: true});
  showOrHideOverdue();
  toast(`Moved to ${date}`);
};

/// onFocus

const onFocus = (event) => {
  // Set `ui.focusedInput` only if it should be supported by `focused: true` actions.

  const el = event.target;
  if ([
    ui.ta,
    ui.dialogInput,
    ui.findInput,
    ui.replaceInput,
  ].includes(el)) ui.focusedInput = el;
  // `document.activeElement` may be `body` on button click!
};

/// switchDb

export const switchDb = async (passphrase) => {
  showOverlay(`
Opening the door
to another world
in the Multiverse...
  `);

  db.close();
  hideAtticForms();

  // Give time for attic animation
  // and to read the message.
  setTimeout(async () => {
    await db.load(passphrase);
    applyFont();
    await openScreen(screenTypes.page, {
      tag: getToday(),
      withoutSave: true,
    });
    hideOverlay();
  }, 1500);
};

/// idle

export const unidle = () => debounce("idle", 1000*60*5, onIdle);

const onIdle = () => {
  if (mem.isSecret) switchDb("");
};
