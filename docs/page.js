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
import {getNow, getToday, hideAtticForms, isDateTag, onBack, onMoveOverdue, onMoveToDate, onOpenDate, onOpenHome, onOpenTag, openScreen, screenTypes, showOrHideOverdue} from "./nav.js";
import {addToRecentTags, onSearch} from "./search.js";
import {onDuplicate, onErase, onMoveDown, onMoveUp, onSelAll, onSelLine, onStrike, strikes} from "./sel.js";
import {debounce, hide, ib, o, on, onClick, toast, ui} from "./ui.js";
import {onRedo, onUndo} from "./undo.js";

/// initPageUI

export const initPageUI = () => {
  ui.moveOverdue = ib("history", "p", onMoveOverdue);  // Past
  hide(ui.moveOverdue);

  ui.saveFile = ib("file_save", "s", onSaveFile);
  hide(ui.saveFile);

  ui.header = o(".header");
  onClick(ui.header, onHeader);

  ui.ta = o("textarea");
  on(ui.ta, "input", onInput);
  applyFont();

  detectGestures(ui.ta, {
    onSwipeLeft: () => openNextDate({forward: true}),
    onSwipeRight: () => openNextDate({forward: false}),
  });

  ui.frame = o(".frame",

    /// top

    ib("menu", "m", onMenuForm),
    ui.moveOverdue,
    ui.saveFile,
    
    ui.header,

    ib("calendar_month", "g", onOpenDate),  // Go to date
    ib("search", "F", onSearch, {focused: true}),  // // Ctrl+Shift+F
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
    done: true,
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

  const moving = (i === -1 ?
    text : text.slice(0, i)
  ).trim();

  const anchored = (i === -1 ?
    "" : text.slice(i)
  ).trim();

  const lines = moving.split("\n");
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

  const nextTag = (new Date(
    Date.parse(tag) +
    (forward ? 1 : -1) *
    1000*60*60*24
  )).toISOString().split("T")[0];

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
    // Flash changed tag, unless a not shy toast is shown, e.g. "Synced OK".
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

const zenMode = "zen-mode";

const onHeader = () => {
  hideAtticForms();
  const isZen = ui.frame.classList.toggle(zenMode);
  const header = isZen ? "visibility"
    : getHeader(mem.page);
  toast(header, {isPinned: true, isIcon: isZen});
}

/// onInput

const onInput = () => {
  if (!ui.isActive) return;

  autoindent();
  debounce("save", 1000, save);
};

/// save

export const save = async (props) => {
  debounce("save");

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
