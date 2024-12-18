import {getId} from "./crypto.js";
import * as db from "./db.js";
import {onBack, onOpen} from "./nav.js";
import {onStrike} from "./sel.js";
import {debounce, ib, o, on, toast, ui} from "./ui.js";
import {onRedo, onUndo} from "./undo.js";

const mem = db.mem;

const getNow = () => (new Date()).toISOString();

/// initPageUI

export const initPageUI = () => {

  ui.header = o(".header");

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

    ib("backspace", "e"),  // Erase
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
};

/// openPage/ByTag

export const openPageByTag = (tag) => {
  const page = mem.pages[tag] || {
    id: getId(),  // local, for save
    tag,
    text: "",
    ss: 0,  // selectionStart
    se: 0,  // selectionEnd
    st: 0,  // scrollTop
    tu: getNow(),  // when the Text was Updated, ISO UTC
  };

  openPage(page);
};

export const openPage = (page) => {
  mem.page = page;
  mem.pages[page.tag] = page;

  toast(page.tag, {isPinned: true});

  ui.ta.value = page.text;
  ui.ta.setSelectionRange(page.ss, page.se);
  ui.ta.scrollTop = page.st;
};

/// onInput, save

const onInput = () => debounce("save", 1000, save);

export const save = async () => {
  debounce("save");

  const page = mem.page;
  if (!page) return;

  const next = {
    text: ui.ta.value,
    ss: ui.ta.selectionStart,
    se: ui.ta.selectionEnd,
    st: ui.ta.scrollTop,
  };

  let needSave = mem.opIds.undo ? false : (
    page.ss !== next.ss ||
    page.se !== next.se ||
    page.st !== next.st
  );

  if (page.text !== next.text) {
    page.tu = getNow();
    needSave = true;
  }

  if (!needSave) return;

  if (mem.opIds.undo) {
    await db.saveUndoneOps();
  }

  Object.assign(page, next);
  await db.savePage(page);
};
