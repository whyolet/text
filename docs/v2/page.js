import {onCut, onCopy, onPaste} from "./clipboard.js";
import {getId} from "./crypto.js";
import * as db from "./db.js";
import {autoindent, onDedent, onIndent} from "./indent.js";
import {hideLineForm, onLineForm, updateLineFormOnSelChange} from "./line.js";
import {getNow, getTodayPlus, onBack, onMoveOverdue, onOpenDate, onOpenHome, onOpenTag, showOrHideOverdue} from "./nav.js";
import {onErase, onMoveDown, onMoveUp, onSelAll, onStrike} from "./sel.js";
import {collapse, debounce, hide, ib, o, on, onClick, toast, ui} from "./ui.js";
import {onRedo, onUndo} from "./undo.js";

const mem = db.mem;

/// initPageUI

export const initPageUI = () => {
  ui.moveOverdue = ib("history", "p", onMoveOverdue);  // Past
  hide(ui.moveOverdue);

  ui.header = o(".header");
  onClick(ui.header, onHeader);

  ui.ta = o("textarea");
  on(ui.ta, "input", onInput);

  ui.page = o(".page",

    /// top

    ib("menu", "m"),
    ui.moveOverdue,
    
    ui.header,
    
    ib("calendar_month", "g", onOpenDate),  // Go to date
    ib("search", "s"),
    ib("find_in_page", "f"),
    ib("123", "l", onLineForm),

    /// center

    ib("folder_open", "o", onOpenTag),
    ib("arrow_back", "b", onBack),
    ib("home", "h", onOpenHome),

    ui.ta,

    ib("north", "u", onMoveUp),
    ib("send", "n"),  // Next day/s
    ib("south", "d", onMoveDown),

    /// bottom

    ib("backspace", "e", onErase),
    ib("remove", "k", onStrike),  // striKe through
    ib("format_indent_decrease", "j", onDedent),
    ib("format_indent_increase", "i", onIndent),

    ib("undo", "z", onUndo),  // Ctrl+Z
    ib("redo", "Z", onRedo),  // Ctrl+Shift+Z

    ib("content_cut", "x", onCut),
    ib("content_copy", "c", onCopy),
    ib("content_paste", "v", onPaste),
    ib("select_all", "a", onSelAll),
  );

  onClick(ui.page, () => ui.ta.focus());
};

/// openPage/ByTag

export const openPageByTag = (tag) => {
  const page = mem.pages[tag] || {
    id: getId(),  // local, for save
    tag,
    text: "",
    edited: getNow(),  // text was updated by user
    selStart: 0,
    selEnd: 0,
    scroll: 0,
  };

  openPage(page);
};

export const openPage = (page) => {
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

  ui.ta.setSelectionRange(
    page.selStart,
    page.selEnd,
  );

  ui.ta.scrollTop = page.scroll;

  updateLineFormOnSelChange();
  showOrHideOverdue();
};

/// onHeader

const onHeader = () => {
  hideLineForm();
  collapse(ui.attic);
  ui.page.classList.toggle("zen-mode");
}

/// onInput

const onInput = () => {
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
