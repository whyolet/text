import {onAnchor} from "./anchor.js";
import {onCut, onCopy, onPaste} from "./clipboard.js";
import {getId} from "./crypto.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {onFindForm} from "./find.js";
import {applyFont} from "./font.js";
import {detectGestures} from "./gesture.js";
import {autoindent, onDedent, onIndent} from "./indent.js";
import {updateLineFormOnSelChange} from "./line.js";
import {onMenuForm} from "./menu.js";
import {getNow, getTodayPlus, hideAtticForms, isDateTag, onBack, onMoveOverdue, onMoveToDate, onOpenDate, onOpenHome, onOpenTag, showOrHideOverdue} from "./nav.js";
import {addToRecentTags, onSearch} from "./search.js";
import {onDuplicate, onErase, onMoveDown, onMoveUp, onSelAll, onStrike} from "./sel.js";
import {debounce, hide, ib, o, on, onClick, toast, ui} from "./ui.js";
import {onRedo, onUndo} from "./undo.js";

/// initPageUI

export const initPageUI = () => {
  ui.moveOverdue = ib("history", "p", onMoveOverdue);  // Past
  hide(ui.moveOverdue);

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
    
    ui.header,
    
    ib("calendar_month", "g", onOpenDate),  // Go to date
    ib("search", "s", onSearch),
    ib("find_in_page", "f", onFindForm),
    ib("anchor", "y", onAnchor),

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
    ib("remove", "k", onStrike, {focused: true}),  // striKe through
    ib("add", "w", onDuplicate),

    ib("format_indent_decrease", "j", onDedent),
    ib("format_indent_increase", "i", onIndent),

    ib("undo", "z", onUndo),  // Ctrl+Z
    ib("redo", "Z", onRedo),  // Ctrl+Shift+Z

    ib("content_cut", "x", onCut, {focused: true}),
    ib("content_copy", "c", onCopy, {focused: true}),
    ib("content_paste", "v", onPaste, {focused: true}),
    ib("select_all", "a", onSelAll, {focused: true}),
  );

  ui.page = o(".page",
    ui.attic,
    ui.openDateInput,
    ui.moveToDateInput,
    ui.frame,
  );
};

/// getPage, zeroCursor

export const getPage = (tag) => {
  let page = mem.pages[tag];
  if (page) return page;

  page = {
    id: getId(),  // local, for save
    tag,
    text: "",
    edited: getNow(),  // text was updated by user
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

/// openNextDate

const openNextDate = async (props) => {
  const {forward = true} = props ?? {};
  const {tag} = mem.page;

  if (!isDateTag(tag)) {
    onOpenHome();
    return;
  }

  const date = new Date(
    Date.parse(tag) +
    (forward ? 1 : -1) *
    1000*60*60*24
  );

  await openPageByTag(
    date
    .toISOString()
    .split("T")[0]
  );
};

/// openPage/ByTag

export const openPageByTag = async (tag) => {
  const page = getPage(tag);
  await openPage(page);
};

export const openPage = async (page) => {
  mem.page = page;
  mem.pages[page.tag] = page;
  mem.textLength = page.text.length;

  const today = getTodayPlus(0);
  const header = (page.tag === today ?
    `Today ${today}`
    : page.tag
  );
  toast(header, {isPinned: true});

  ui.ta.value = page.text;
  ui.ta.focus();

  ui.ta.setSelectionRange(
    page.selStart,
    page.selEnd,
  );

  ui.ta.scrollTop = page.scroll;

  updateLineFormOnSelChange();
  showOrHideOverdue();
  await addToRecentTags(page.tag);
};

/// onHeader

const onHeader = () => {
  hideAtticForms();
  ui.frame.classList.toggle("zen-mode");
}

/// onInput

const onInput = () => {
  if (!ui.isActive) return;

  autoindent();
  debounce("save", 1000, save);
};

/// save

export const save = async () => {
  debounce("save");

  const page = mem.page;
  if (!page) return;

  const next = {
    text: ui.ta.value,
    selStart: ui.ta.selectionStart,
    selEnd: ui.ta.selectionEnd,
    scroll: ui.ta.scrollTop,
  };

  let needSave = mem.opIds.undo ? false : (
    page.selStart !== next.selStart ||
    page.selEnd !== next.selEnd ||
    page.scroll !== next.scroll
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

  await db.savePage(page);
};
