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
      "in another tab.",
    ),
    o("", "Please either close this one or:"),
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
  ib("history", "o"),  // overdue
  o(".header", "header"),
  ib("find_in_page", "f"),
  ib("manage_search", "s"),

  /// center

  ib("tag", "t"),
  ib("arrow_back", "b"),
  ib("home", "h"),

  ui.ta,

  ib("north", "u"),  // up
  ib("send", "l"),  // later
  ib("south", "d"),  // down

  /// bottom

  ib("backspace", "y"),
  ib("remove", "k"),  // strike through
  ib("format_indent_decrease", "e"),
  ib("format_indent_increase", "i"),

  ib("undo", "z"),
  ib("redo", "r"),

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

