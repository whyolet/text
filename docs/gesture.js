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

import {closable, d, ic, o, on, say, ui} from "./ui.js";

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

const dd = (when, ...what) => o(".in",
  when ? o("b", `${when}: `) : null,
  ...what,
);

export const onTricks = async () => await say(
  closable("Tricks"),
  o(".tricks",
    d(
      d(ic("anchor")),
      dd("Tap", "Find next ⚓"),
      dd("Hold", "Add / remove ⚓"),
    ),
    d(
      d(ic("north"), ic("south")),
      dd("Tap", "Move one line up / down"),
      dd("Hold", "Move to the top / bottom"),
    ),
    d(
      d(ic("send")),
      dd("Tap", "Send to the next day"),
      dd("Hold", "Send to selected date"),
    ),
    d(
      d(ic("variables")),
      dd("Tap", "Select line under cursor"),
      dd("Tap", "…and its indent"),
      dd("Tap", "…and the next line"),
      dd("Hold",
        "Select all, like ",
        ic("select_all"),
      ),
    ),
    d(
      d(
        ic("backspace"),
        ic("exposure_plus_1"),
        ic("format_indent_decrease"),
        ic("format_indent_increase"),
        ic("check"),
        ic("format_list_bulleted"),
        ic("content_cut"),
        ic("content_copy"),
        ic("content_paste"),
      ),
      dd("Tap", "Do the action"),
      dd("Hold", "Select all + do the action"),
    ),
    d(
      d(ic("folder_open")),
      dd("", "Open page under cursor"),
      dd("", "or a link like https://…"),
    ),
    d(
      d(
        ic("undo"),
        ic("redo"),
      ),
      dd("",
        o("a", "Better undo / redo", {
          href: "https://github.com/whyolet/text/blob/main/docs/undo.md#undo",
          target: "_blank",
        }),
      ),
    ),
    d(
      d(o("span.header", "Page title:")),
      dd("Tap", "Rename the page"),
    ),
    d(
      d(ic("more_vert"), "menu in web browser -"),
      d(
        ic("install_desktop"),
        " Install or ",
        ic("add_box"),
        " Add to Home Screen,",
      ),
      dd("", "close website, open app,"),
      dd("", ic("menu"), " - Local data"),
    ),
    d(
      d(ic("menu"), " - Sync / Backup -"),
      d(ic("key"), " Encryption passphrase:"),
      dd("",
        'Start with "." for ',
        o("a", "multiverse", {
          href: "https://whyolet.com/text/encryption/",
          target: "_blank",
        }),
      ),
    ),
    d(
      d(ic("menu"), " - Save page:"),
      dd("", "(depends on browser)"),
      dd("Tap Save", "Create new file"),
      dd("Tap existing file + Save", "Overwrite"),
    ),
    d(
      d("Editable text area:"),
      dd("", "(depends on browser / keyboard)"),
      dd("Tap x3 or x4", "Select sentence / line"),
      dd(
        "Tap x2 or Hold",
        "Select word(s)",
        dd("Tap again", "Select one word"),
      ),
      dd("Hold + Drag", "Select as you drag"),
      dd("Hold empty space", "Select all"),
      dd("Select text + Hold + Drag", "Move it"),
      o(".in",
        o("b",
          "Select text + ",
          ic("shift"),
          " on keyboard: ",
        ),
        dd("", "Title / UPPER / lower-case"),
      ),
    ),
  ),
);
