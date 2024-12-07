import {mem} from "./db.js";
import {debounced, ib, o, on, ui} from "./ui.js";

/// setPageUI

export const setPageUI = () => {

  ui.ta = o("textarea");
  on(ui.ta, "input", onInput);

  ui.page = o(".page",

    /// top

    ib("menu", "m"),
    
    o(".header", "header"),
    
    ib("find_in_page", "f"),
    ib("search", "s"),
    ib("calendar_month", "g"),  // Go to date
    ib("123", "l"),  // Line/s

    /// center

    ib("folder_open", "o"),
    ib("arrow_back", "b"),
    ib("home", "h"),

    ui.ta,

    ib("north", "u"),  // Up
    ib("send", "n"),  // Next day/s
    ib("south", "d"),  // Down

    /// bottom

    ib("backspace", "e"),  // Erase
    ib("remove", "k"),  // striKe through
    ib("format_indent_decrease", "j"),
    ib("format_indent_increase", "i"),

    ib("undo", "z"),  // Ctrl+Z
    ib("redo", "Z"),  // Ctrl+Shift+Z

    ib("content_cut", "x"),
    ib("content_copy", "c"),
    ib("content_paste", "v"),
    ib("select_all", "a"),
  );
};

/// openPage

export const openPage = (tag) => {
  const page = mem.pages[tag] || {
    tag,
    text: "",
    ss: 0,  // selectionStart
    se: 0,  // selectionEnd
    st: 0,  // scrollTop
    tu: getNow(),  // when the Text was Updated, ISO UTC
  };

  mem.tag = tag;
  mem.pages[tag] = page;

  ui.ta.value = page.text;
  ui.ta.setSelectionRange(page.ss, page.se);
  ui.ta.scrollTop = page.st;
};

const getNow = () => (new Date()).toISOString();

/// onInput, save

const onInput = () => debounced("save", 1000, save);

const save = () => debounced("save", null, () => {
  const tag = mem.tag;
  const page = mem.pages[tag];

  const next = {
    text: ui.ta.value,
    ss: ui.ta.selectionStart,
    se: ui.ta.selectionEnd,
    st: ui.ta.scrollTop,
  };

  let needSave = (
    page.ss !== next.ss ||
    page.se !== next.se ||
    page.st !== next.st
  );

  if (page.text !== next.text) {
    page.tu = getNow();
    needSave = true;
  }

  if (!needSave) return;

  Object.assign(page, next);
  alert(JSON.stringify(page));
});

