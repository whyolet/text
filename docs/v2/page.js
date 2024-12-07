import {mem} from "./db.js";
import {ib, o, ui} from "./ui.js";

/// setPageUI

export const setPageUI = () => {

  ui.ta = o("textarea");

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
    tu: (new Date()).toISOString(),
    // when the Text was Updated, ISO UTC
  };

  ui.ta.value = page.text;
  ui.ta.setSelectionRange(page.ss, page.se);
  ui.ta.scrollTop = page.st;
};
