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

import {anchor, onAnchor} from "./anchor.js";
import {onCut, onCopy, onPaste} from "./clipboard.js";
import {getId} from "./crypto.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {onSaveFile, showOrHideSaveFile} from "./file.js";
import {onFindForm} from "./find.js";
import {applyFont} from "./font.js";
import {detectGestures} from "./gesture.js";
import {autoindent, onDedent, onIndent} from "./indent.js";
import {updateLineFormOnSelChange} from "./line.js";
import {onMenuForm} from "./menu.js";
import {detectTag, folder, getNow, getToday, hideAtticForms, homeTag, isDateTag, onBack, onMoveOverdue, onMoveToDate, onOpenDate, onOpenHome, onOpenTag, openScreen, screenTypes, showOrHideOverdue, unidle} from "./nav.js";
import {addToRecentTags, onSearch} from "./search.js";
import {onDuplicate, onErase, onMoveDown, onMoveUp, onSelAll, onSelLine, onStrike, strikes} from "./sel.js";
import {anim, debounce, hide, ib, o, on, onClick, toast, ui} from "./ui.js";
import {onRedo, onUndo} from "./undo.js";

/// initPageUI

export const initPageUI = () => {
  ui.moveOverdue = ib("history", "p", onMoveOverdue);  // Past
  hide(ui.moveOverdue);

  ui.saveFile = ib("file_save", "s", onSaveFile);
  hide(ui.saveFile);

  ui.zenModeIcons = new Map([
    [false, "fullscreen"],
    [true, "visibility"],
  ]);
  ui.zenMode = ib(ui.zenModeIcons.get(false), "q", onZen);

  ui.header = o(".header");
  onClick(ui.header, onHeader);

  ui.ta = o("textarea");
  on(ui.ta, "input", onInput);
  on(document, "selectionchange", onSelChange);
  applyFont();

  detectGestures(ui.ta, {
    onSwipeLeft: () => openNextDate({forward: true}),
    onSwipeRight: () => openNextDate({forward: false}),
  });

  ui.frame = o(".frame",

    /// top

    ib("menu", "m", onMenuForm),
    ui.saveFile,
    ui.moveOverdue,
    ui.zenMode,
    
    ui.header,

    ib("calendar_month", "g", onOpenDate),  // Go to date
    ib("search", "F", onSearch, {focused: true}),  // Ctrl+Shift+F
    ib("find_in_page", "f", onFindForm),  // Ctrl+F
    ib("anchor", "j", onAnchor),

    /// center

    ib("folder_open", "o", onOpenTag),
    ib("arrow_back", "b", onBack),
    ib("home", "h", onOpenHome),

    ui.ta,

    ib("north", "u", onMoveUp),
    ib("send", "n", onMoveToDate),  // Next
    ib("south", "d", onMoveDown),

    /// bottom

    ib("backspace", "e", onErase, {focused: true}),
    ib("variables", "l", onSelLine, {focused: true}),
    ib("remove", "k", onStrike, {focused: true}),  // striKe through
    ib("add", "w", onDuplicate),

    ib("format_indent_decrease", "I", onDedent),  // Ctrl+Shift+I
    ib("format_indent_increase", "i", onIndent),  // Ctrl+I

    ib("undo", "z", onUndo),  // Ctrl+Z
    ib("redo", "Z", onRedo),  // Ctrl+Shift+Z

    ib("content_cut", "x", onCut, {focused: true}),
    ib("content_copy", "c", onCopy, {focused: true}),
    ib("content_paste", "v", onPaste, {focused: true}),
    ib("select_all", "a", onSelAll, {focused: true}),
  );

  ui.page = o(".page",
    ui.attic,
    ui.attic2,
    ui.openDateInput,
    ui.moveToDateInput,
    ui.frame,
  );
  hide(ui.page);
};

/// getPage, zeroCursor

export const getPage = (tag) => {
  let page = mem.pages[tag];
  if (page) return page;

  page = {
    id: getId(),  // local, for save
    tag,
    text: "",
    done: true, // no `notDoneText`
    edited: getNow(),  // text was updated by user
    fileSaved: null,  // when
    ...zeroCursor
  };

  mem.pages[tag] = page;
  mem.oldPages[tag] = Object.assign({}, page);
  return page;
};

export const zeroCursor = {
  selStart: 0,
  selEnd: 0,
  scroll: 0,
};

/// getDone, splitDoneText

export const getDone = (page) => {
  // For quicker saves.
  if (!isDateTag(page.tag)) {
    return false;
  }

  const {notDoneText, doneText} = splitDoneText(page);
  return !notDoneText;
};

export const splitDoneText = (page) => {
  const {text} = page;
  const i = text.indexOf(anchor);

  const movable = (i === -1 ?
    text : text.slice(0, i)
  ).trim();

  const anchored = (i === -1 ?
    "" : text.slice(i)
  ).trim();

  const lines = movable.split("\n");
  const notDoneLines = [];
  const doneLines = [];

  for (const line of lines) {
    if (line.includes(strikes)) {
      doneLines.push(line);
    } else notDoneLines.push(line);
  }

  if (anchored) doneLines.push(anchored);

  return {
    notDoneText: notDoneLines.join("\n"),
    doneText: doneLines.join("\n"),
  };
};

/// openNextDate

const openNextDate = async (props) => {
  const {forward = true} = props ?? {};
  const {tag} = mem.page;

  if (!isDateTag(tag)) {
    return;
  }

  const date = new Date(tag);
  date.setUTCDate(date.getUTCDate() + (forward ? 1 : -1));
  const nextTag = date.toISOString().split("T")[0];

  await openScreen(screenTypes.page, {tag: nextTag});
};

/// openPage/ByTag

export const openPageByTag = async (tag) => {
  const page = getPage(tag);
  await openPage(page);
};

export const openPage = async (page) => {
  const tagChanged = (mem.page?.tag !== page.tag);

  mem.page = page;
  mem.pages[page.tag] = page;
  mem.textLength = page.text.length;

  const header = getHeader(page);
  toast(header, {isPinned: true});
  if (tagChanged) {
    toast(header, {isShy: true});
  }

  ui.ta.value = page.text;
  ui.ta.focus();

  ui.ta.setSelectionRange(
    page.selStart,
    page.selEnd,
  );

  ui.ta.scrollTop = page.scroll;

  updateLineFormOnSelChange();
  showOrHideOverdue();
  showOrHideSaveFile();
  ui.frame.classList.remove(zenMode);
  await addToRecentTags(page.tag);
};

/// getHeader

const getHeader = (page) => {
  const today = getToday();
  return (page.tag === today ?
    `Today ${today}`
    : page.tag
  );
};

/// onHeader

const onHeader = async () => {
  // Header is not an `ib` having auto-save.
  await save();

  const oldTag = mem.page.tag;
  if (
    oldTag === homeTag ||
    isDateTag(oldTag)
  ) {
    toast("It can't be renamed!");
    return;
  }

  const answer = prompt("Rename to:", oldTag);
  if (answer === null) return;

  const newTag = answer.replaceAll(/[─\s📂]/gu, "");
  if (!newTag) {
    toast("It's empty!");
    return;
  }

  if (newTag === oldTag) {
    toast("It's the same!");
    return;
  }

  const newPage = getPage(newTag);
  if (newPage.text) {
    toast("It exists!");
    return;
  }

  const query = folder + oldTag;
  const replacement = folder + newTag;
  const unsavedPages = [];
  const now = getNow();

  for (const page of Object.values(mem.pages)) {
    if (!page.text.includes(query)) continue;

    const parts = [];
    let start = 0, processed = 0;
    while (true) {
      start = page.text.indexOf(query, start);
      if (start === -1) {
        const part = page.text.slice(processed);
        parts.push(part);
        break;
      }

      if (
        start > 0 &&
        !/[─\s]/.test(page.text.charAt(start - 1))
      ) {
        start++;
        continue;
      }

      const stop = start + query.length;
      if (
        stop < page.text.length &&
        !/[─\s]/.test(page.text.charAt(stop))
      ) {
        start++;
        continue;
      }

      const part = page.text.slice(processed, start);
      parts.push(part + replacement);
      start = processed = stop;
    }
    if (parts.length === 1) continue;

    page.text = parts.join("");
    page.edited = now;
    unsavedPages.push(page);
  }

  newPage.text = mem.page.text;
  newPage.edited = now;
  newPage.done = getDone(newPage);
  unsavedPages.push(newPage);

  mem.page.text = "";
  mem.page.edited = now;
  mem.page.done = true;
  if (!unsavedPages.includes(mem.page)) {
    unsavedPages.push(mem.page);
  }

  await savePages(unsavedPages);
  await openPage(newPage);
};

/// onZen

const zenMode = "zen-mode";

const onZen = () => {
  hideAtticForms();

  anim(() => {
    const isZen = ui.frame.classList.toggle(zenMode);
    ui.zenMode.textContent = ui.zenModeIcons.get(isZen);

    toast(
      isZen ? "" : getHeader(mem.page),
      {isPinned: true},
    );
  });
};

/// onSelChange

const onSelChange = () => {
  if (document.activeElement !== ui.ta) return;

  protectTag();
  updateLineFormOnSelChange();
};

/// protectTag

const protectTag = () => {
  // Protect a tag from accidental partial change.
  // See comment in `autoindent` re `mem.page` and `save`.

  const cursor = ui.ta.selectionStart;
  if (cursor !== ui.ta.selectionEnd) return;

  const {start, end, withFolder} = detectTag(ui.ta.value, cursor);
  if (!withFolder) return;

  // TODO: Find a better way to protect tags which does not break the "insert" UX.
  // ui.ta.setSelectionRange(start, end);
};

/// onInput

const onInput = () => {
  if (!ui.isActive) return;

  autoindent();
  debounce("save", 1000, save);
};

/// save

export const save = async (props) => {
  debounce("save");
  unidle();

  const page = mem.page;
  if (!page) return;

  const next = {
    tag: page.tag,  // for `getDone`
    text: ui.ta.value,
    selStart: ui.ta.selectionStart,
    selEnd: ui.ta.selectionEnd,
    scroll: ui.ta.scrollTop,
  };

  next.done = getDone(next);

  let needSave = mem.opIds.undo ? false : (
    page.selStart !== next.selStart ||
    page.selEnd !== next.selEnd ||
    page.scroll !== next.scroll ||
    page.done !== next.done
  );

  if (page.text !== next.text) {
    page.edited = getNow();
    needSave = true;
  }

  Object.assign(page, next);
  mem.textLength = page.text.length;
  if (!needSave) return;

  if (mem.opIds.undo) {
    await db.saveUndoneOps();
  }

  await db.savePage(page, props);
  showOrHideSaveFile();
};

/// savePages

export const savePages = async (pages) => {
  const maxIndex = pages.length - 1;
  for (const [i, page] of pages.entries()) {
    await db.savePage(page, {
      hasPrev: i > 0,
      hasNext: i < maxIndex,
    });
  }
};
