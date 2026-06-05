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

import {hideAtticForms} from "./nav.js";
import {setSel} from "./sel.js";
import {getInt, ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, ui} from "./ui.js";

let recentLineNumber = null;

/// initLineUI

export const initLineUI = () => {
  ui.lineNumber = o("input", {
    "type": "number",
    min: 1,
    step: 1,
  });

  ui.maxLineNumber = o("span");

  ui.lineForm = o(".line-form hidden",
    o(".main",
      "Line ",
      ui.lineNumber,
      " / ",
      ui.maxLineNumber,
    ),
    ib("close", "x", hideLineForm),
  );

  ui.attic.appendChild(ui.lineForm);
};

/// onLineForm

export const onLineForm = () => {
  if (isHidden(ui.lineForm)) {
    showLineForm();
  } else hideLineForm();
};

/// updateLineFormOnSelChange

export const updateLineFormOnSelChange = () => {
  if (isHidden(ui.lineForm)) return;

  showLineForm();
  // With up-to-date "Line/max".
};
  
/// showLineForm

export const showLineForm = () => {
  hideAtticForms();
  expand(ui.attic);
  show(ui.lineForm);

  const {lineNumber, maxLineNumber} = getLineNumbers();

  ui.maxLineNumber.textContent = maxLineNumber;
  ui.lineNumber.max = maxLineNumber;

  recentLineNumber = lineNumber;
  ui.lineNumber.value = lineNumber;
};

/// getLineNumbers

export const getLineNumbers = () => {
  // Ignore `mem.page` to react on `selectionchange` instantly.
  const text = ui.ta.value;
  const selStart = ui.ta.selectionStart;
  let maxLineNumber = 1, i = -1;
  let lineNumber = 1;

  while ((i = text.indexOf("\n", i + 1)) !== -1) {
    maxLineNumber++;
    if (i < selStart) lineNumber++;
  }

  return {lineNumber, maxLineNumber};
};

/// hideLineForm

export const hideLineForm = () => {
  if (isHidden(ui.lineForm)) return;

  hide(ui.lineForm);
  collapse(ui.attic);

  const lineNumber = getInt({
    oldValue: recentLineNumber,
    newValue: ui.lineNumber.value,
    min: 1,
    max: ui.lineNumber.max,
  });
  if (lineNumber === null) return;

  const lineEnd = getLineEnd(lineNumber);
  setSel(lineEnd);
};

/// getLineEnd

export const getLineEnd = (lineNumber) => {
  const text = ui.ta.value;
  let i = -1;
  while (
    lineNumber > 0 &&
    (i = text.indexOf("\n", i + 1)) !== -1
  ) lineNumber--;
  return i >= 0 ? i : text.length;
};
