import {getId} from "./crypto.js";
import * as db from "./db.js";
import {autoindent} from "./indent.js";
import {onBack, onOpen} from "./nav.js";
import {onErase, onStrike} from "./sel.js";
import {debounce, ib, o, on, onClick, toast, ui} from "./ui.js";
import {onRedo, onUndo} from "./undo.js";

const mem = db.mem;

const getNow = () => (new Date()).toISOString();  // UTC

/// initPageUI

export const initPageUI = () => {

  ui.header = o(".header");
  onClick(ui.header, () => ui.page.classList.toggle("zen-mode"));

  ui.ta = o("textarea");
  on(ui.ta, "input", onInput);

  ui.page = o(".page",

    /// top

    ib("menu", "m"),
    
    ui.header,
    
    ib("calendar_month", "g"),  // Go to date
    ib("search", "s"),
    ib("find_in_page", "f"),
    ib("123", "l"),  // Line/s

    /// center

    ib("folder_open", "o", onOpen),
    ib("arrow_back", "b", onBack),
    ib("home", "h"),

    ui.ta,

    ib("north", "u"),  // Up
    ib("send", "n"),  // Next day/s
    ib("south", "d"),  // Down

    /// bottom

    ib("backspace", "e", onErase),
    ib("remove", "k", onStrike),  // striKe through
    ib("format_indent_decrease", "j"),
    ib("format_indent_increase", "i"),

    ib("undo", "z", onUndo),  // Ctrl+Z
    ib("redo", "Z", onRedo),  // Ctrl+Shift+Z

    ib("content_cut", "x"),
    ib("content_copy", "c"),
    ib("content_paste", "v"),
    ib("select_all", "a"),
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

  toast(page.tag, {isPinned: true});

  ui.ta.value = page.text;

  ui.ta.setSelectionRange(
    page.selStart,
    page.selEnd,
  );

  ui.ta.scrollTop = page.scroll;
};

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
