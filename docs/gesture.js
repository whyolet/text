/*
 * Whyolet Text - personal tasks/text editor.
 * Copyright (C) 2026  Denis Ryzhkov <denisr@denisr.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {closable, o, on, say, ui} from "./ui.js";

/// states

const states = new WeakMap();

/// detectGestures

export const detectGestures = (el, handlers) => {
  states.set(el, {
    handlers,
    startX: 0,
    startY: 0,
    startT: 0,
    endX: 0,
    endY: 0,
  });

  on(el, "pointerdown", onPointerDown);
  on(el, "pointermove", onPointerMove);
  on(el, "pointerup", onPointerUp);
};

/// onPointerDown

const onPointerDown = (event) => {
  const state = states.get(event.currentTarget);
  if (!state || !event.isPrimary || !ui.isActive) return;

  state.startX = state.endX = event.clientX;
  state.startY = state.endY = event.clientY;
  state.startT = performance.now();
};

/// onPointerMove

const onPointerMove = (event) => {
  const state = states.get(event.currentTarget);
  if (!state || !event.isPrimary || !ui.isActive) return;

  state.endX = event.clientX;
  state.endY = event.clientY;
};

/// onPointerUp

const onPointerUp = (event) => {
  const state = states.get(event.currentTarget);
  if (!state || !event.isPrimary || !ui.isActive) return;

  const {handlers, startX, startY, startT, endX, endY} = state;

  const dT = performance.now() - startT;
  if (dT > 500) return;

  const dX = endX - startX;
  const dY = endY - startY;

  const absDX = Math.abs(dX);
  const absDY = Math.abs(dY);

  if (
    absDX > 100 &&
    absDX > 2 * absDY
  ) {
    if (dX > 0) {
      handlers.onSwipeRight?.();
    } else {
      handlers.onSwipeLeft?.();
    }
  }
};

/// onTricks

export const onTricks = async () => await say(
  closable("Tricks"),
  o(".scrollable",

    o("",
      o(".icon", "anchor"),
      " Anchor:",
    ),
    o(".in",
      o("b", "Tap: "),
      "find / next",
    ),
    o(".in",
      o("b", "Hold: "),
      "add / remove",
    ),
    o("br"),

    o("",
      o(".icon", "north"),
      o(".icon", "south"),
      " Move:",
    ),
    o(".in",
      o("b", "Tap: "),
      "one line up / down",
    ),
    o(".in",
      o("b", "Hold: "),
      "to the top / bottom",
    ),
    o("br"),

    o("",
      o(".icon", "send"),
      " Postpone:",
    ),
    o(".in",
      o("b", "Tap: "),
      "to the next day",
    ),
    o(".in",
      o("b", "Hold: "),
      "to selected date",
    ),
    o("br"),

    o("",
      o(".icon", "variables"),
      " Select:",
    ),
    o(".in",
      o("b", "Tap: "),
      "line under cursor",
    ),
    o(".in",
      o("b", "Tap again: "),
      "…and its indent",
    ),
    o(".in",
      o("b", "Tap again: "),
      "…and the next line",
    ),
    o(".in",
      o("b", "Hold: "),
      "select all, like ",
      o(".icon", "select_all"),
    ),
    o("br"),

    o("",
      o(".icon", "backspace"),
      o(".icon", "exposure_plus_1"),
      o(".icon", "format_indent_decrease"),
      o(".icon", "format_indent_increase"),
      o(".icon", "check"),
      o(".icon", "format_list_bulleted"),
      o(".icon", "content_cut"),
      o(".icon", "content_copy"),
      o(".icon", "content_paste"),
      " actions:",
    ),
    o(".in",
      o("b", "Tap: "),
      "do the action",
    ),
    o(".in",
      o("b", "Hold: "),
      "select all + do the action",
    ),
    o("br"),

    o("",
      o(".icon", "folder_open"),
      " Open:",
    ),
    o(".in", "a page under cursor"),
    o(".in", "or a link like https://…"),
    o("br"),

    o("",
      o(".icon", "undo"),
      o(".icon", "redo"),
      " Undo / Redo:",
    ),
    o(".in",
      o("a", "better than usual", {
        href: "https://github.com/whyolet/text/blob/main/docs/undo.md#undo",
        target: "_blank",
      }),
    ),
    o("br"),

    o("",
      o("span.header", "Page title:"),
    ),
    o(".in",
      o("b", "Tap: "),
      "rename the page",
    ),
    o("br"),

    o("",
      o(".icon", "more_vert"),
      "menu in web browser -",
    ),
    o("",
      o(".icon", "install_desktop"),
      " Install or ",
      o(".icon", "add_box"),
      " Add to Home Screen,",
    ),
    o(".in", "then close website,"),
    o(".in",
      "open the app - ",
      o(".icon", "menu"),
      " - Local data",
    ),
    o("br"),

    o("",
      o(".icon", "menu"),
      " - Sync / Backup -",
    ),
    o("",
      o(".icon", "key"),
      " Encryption passphrase:",
    ),
    o(".in",
      'start with "." to use the ',
      o("a", "multiverse", {
        href: "https://whyolet.com/text/encryption/",
        target: "_blank",
      }),
    ),
    o("br"),

    o("",
      o(".icon", "menu"),
      " - Save page:",
    ),
    o(".in",
      o("b", "Tap Save: "),
      "create new file",
    ),
    o(".in",
      o("b", "Tap existing file + Save: "),
      "overwrite",
    ),
    o("br"),

    o("", "Editable text area:"),
    o(".in", "(depends on browser / keyboard)"),
    o(".in",
      o("b", "Tap x3 or x4: "),
      "select sentence or line",
    ),
    o(".in",
      o("b", "Tap x2 or Hold: "),
      "select word(s)",
      o(".in",
        o("b", "Tap again: "),
        "select one word",
      ),
    ),
    o(".in",
      o("b", "Hold + Drag: "),
      "select as you drag",
    ),
    o(".in",
      o("b", "Hold empty space: "),
      "select all",
    ),
    o(".in",
      o("b",
        "Select text + tap ",
        o(".icon", "shift"),
        " on keyboard: ",
      ),
      o(".in",
        "Title / UPPER / lower-case",
      ),
    ),
  ),
);
