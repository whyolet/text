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

import {mem} from "./db.js";
import {save} from "./page.js";
import {setSel} from "./sel.js";
import {toast, ui} from "./ui.js";

/// anchor

export const anchor = "⚓";
const anchorCodePoint = anchor.codePointAt(0);

/// onFindAnchor

export const onFindAnchor = async () => {
  const {text, selStart} = mem.page;
  let i = text.indexOf(anchor, selStart + 1);

  if (i === -1) {
    i = text.indexOf(anchor);
    if (i === -1) {
      toast("Not found! Hold ⚓", {warn: true});
      return;
    }
    toast(i === selStart ?
      "Found this ⚓ only"
      : "Found the first ⚓"
    );
  }

  setSel(i, i + 1);
  await save();
};

/// onToggleAnchor

export const onToggleAnchor = async () => {
  const {text, selStart} = mem.page;

  /// Del

  if (text.codePointAt(selStart) === anchorCodePoint) {
    ui.ta.setRangeText("", selStart, selStart + 1);
    setSel(selStart);
    await save();
    return;
  }

  /// Add

  ui.ta.setRangeText(anchor, selStart, selStart);
  setSel(selStart, selStart + 1);
  await save();
};
