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
import {getSel} from "./sel.js";
import {save} from "./page.js";
import {ui} from "./ui.js";

/// onCut

export const onCut = async () => {
  const {start, end, part, input, isTa} = getSel({
    focused: true,
    withNewline: true,
    // Not `withoutIndent`: to delete the line.
  });

  await navigator.clipboard.writeText(part);
  input.setRangeText("", start, end, "end");
  if (isTa) await save();
};

/// onCopy

export const onCopy = async () => {
  const {start, end, part, input} = getSel({
    focused: true,
    withoutIndent: true,
  });

  await navigator.clipboard.writeText(part);
  input.setSelectionRange(start, end);
};

/// onPaste

export const onPaste = async () => {
  const part = await navigator.clipboard.readText();

  const {start, end, input, isTa} = getSel({
    focused: true,
    withoutExpand: true,
  });

  input.setRangeText(part, start, end, "end");
  if (isTa) await save();
};
