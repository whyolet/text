import "./error.js";
import {setPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {ib, o, on, onClick, restartButton, showBanner, ui} from "./ui.js";

showBanner(o(".header", "Loading..."));

/// single tab app lock

(async () => {
  try {
    await navigator.locks.request(
      "app",
      {steal: true},
      () => new Promise(() => {}),
    );
  } catch {}

  showBanner(
    o(".header", "Paused!"),
    o("",
      "You've opened Whyolet Text", o("br"),
      "in another tab.", o("br"),
      o("br"),
      "Please either close this one or:"
    ),
    restartButton,
  );
})();

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
  ib("123", "l"),  // Line/s

  /// center

  ib("folder_open", "o"),
  ib("arrow_back", "b"),
  ib("home", "h"),

  ui.ta,

  ib("north", "u"),  // Up
  ib("send", "r"),  // Right to tomoRRow/lateR
  ib("south", "d"),  // Down

  /// bottom

  ib("backspace", "y"),
  ib("remove", "k"),  // striKe through
  ib("format_indent_decrease", "e"),
  ib("format_indent_increase", "i"),

  ib("undo", "z"),  // Ctrl+Z
  ib("redo", "Z"),  // Ctrl+Shift+Z

  ib("content_cut", "x"),
  ib("content_copy", "c"),
  ib("content_paste", "v"),
  ib("select_all", "a"),
);

/// show app

// TODO: goTag("draft", true);
document.body.textContent = "";
document.body.appendChild(page);

ui.isActive = true;
// TODO: Check it in events, on navigation.

