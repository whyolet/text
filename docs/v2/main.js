import "./error.js";
import {setPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {getAppLock} from "./nav.js";
import {ib, o, showBanner, ui} from "./ui.js";

/// loading

showBanner(o(".header", "Loading..."));
getAppLock();

/// db

setPassphrase("");
await db.load();

/// page

ui.ta = o("textarea");

const page = o(".page",

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

/// show app

// TODO: openPage("draft", true);
document.body.textContent = "";
document.body.appendChild(page);

ui.isActive = true;
// TODO: Check it in events, on navigation.
