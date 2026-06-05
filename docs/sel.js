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

import * as db from "./db.js";
import {mem} from "./db.js";
import {save} from "./page.js";
import {toast, ui} from "./ui.js";

/// setSel

export const setSel = (start, end, props) => {
  let {input} = props ?? {};
  input ??= ui.ta;

  input.setSelectionRange(start, end ?? start);

  // Workaround for some browsers to always scroll to selection:
  input.blur();
  input.focus();
};

/// getSel

export const getSel = (props) => {
  const {
    focused,  // Use focused input field, if any. Main textarea is used by default.
    withoutExpand,  // Get selection as is, ignore next flags.
    wholeLines,  // Expand both cursor and non-empty selection to whole lines. By default only a cursor is expanded.
    withNewline,  // Include newline character of the last line.
    withoutIndent,  // Exclude indentation of the first line.
  } = props ?? {};

  const input = focused && ui.focusedInput || ui.ta;
  const isTa = (input === ui.ta);
  const text = input.value;
  let start = input.selectionStart;
  let end = input.selectionEnd;

  if ((start === end || wholeLines) && !withoutExpand) {
    start = text
    .slice(0, start)
    .search(/[^\r\n]*$/);

    end += text.slice(end).match(
      withNewline ?
      /[^\r\n]*\r?\n?/
      : /[^\r\n]*/
    )[0].length;

    if (withoutIndent) {
      start += text
      .slice(start, end)
      .match(/\s*/)[0].length;
    }
  }

  const part = text.slice(start, end);
  return {start, end, part, input, isTa};
};

/// getQueryFromSel

export const getQueryFromSel = () => {
  const {start, end, part, input, isTa} = getSel({
    focused: true,
    withoutExpand: true,
  });

  if (!isTa) return input.value;

  if (
    start === end ||
    part.includes("\n")
  ) return "";

  return part;
};

/// strike

const strike = "─";
// NOTE: This char is also used in few precompiled /.../ regexes directly.

export const strikes = strike + strike;
const newline_striker = strikes + "$&" + strikes;

/// onStrike

export const onStrike = async () => {
  const {start, end, part, input, isTa} = getSel({
    focused: true,
    withoutIndent: true,
  });

  const result = part.includes(strike) ?
    part.replaceAll(strike, "")
    : (
      strikes +
      part.replaceAll(/[\r\n]+/g, newline_striker) +
      strikes
    );

  input.setRangeText(result, start, end, "select");
  if (isTa) await save();
};

/// onErase

export const onErase = async () => {
  const {start, end, input, isTa} = getSel({
    withNewline: true,
    focused: true,
  });

  input.setRangeText("", start, end, "end");
  if (isTa) await save();
};

/// onDuplicate

export const onDuplicate = async () => {
  const {start, end, part} = getSel({wholeLines: true});
  ui.ta.setRangeText("\n" + part, end, end);
  setSel(
    end + 1,
    end + 1 + part.length,
  );
  await save();
};

/// onMoveUp, onMoveDown

export const onMoveUp = async () => {
  const {start, end, part} = getSel({wholeLines: true});
  if (!start) {
    setSel(0, end);
    return toast("Start of text reached!");
  }

  const prev = mem.page.text
  .slice(0, start)
  .match(/([^\r\n]*)(\r?\n?)$/);

  const prevStart = prev.index;
  const [, prevPart, newline] = prev;

  const result = [
    part,
    newline,
    prevPart,
  ].join("");

  ui.ta.setRangeText(result, prevStart, end);

  setSel(
    prevStart,
    prevStart + (end - start),
  );

  await save();
};

export const onMoveDown = async () => {
  const text = mem.page.text;
  const {start, end, part} = getSel({wholeLines: true});

  if (end === text.length) {
    setSel(start, end);
    return toast("End of text reached!");
  }

  const [
    ,
    newline,
    nextPart,
  ] = text
  .slice(end)
  .match(/(\r?\n?)([^\r\n]*)/);

  const result = [
    nextPart,
    newline,
    part,
  ].join("");

  const added = nextPart.length + newline.length;
  ui.ta.setRangeText(result, start, end + added);
  setSel(start + added, end + added);
  await save();
};

/// onSelAll

export const onSelAll = async () => {
  const input = ui.focusedInput || ui.ta;
  setSel(0, input.value.length, {input});
  await save();
}

/// onSelLine

export const onSelLine = async () => {
  const {start, end} = getSel({
    focused: true,
    withoutExpand: true,
  });

  if (start !== end) {
    /// Keep clicking `onSelLine` to add lines to selection.

    const {start, end, input} = getSel({
      focused: true,
      wholeLines: true,
      withNewline: true,
    });

    setSel(start, end, {input});
  }

  // No `else` here, just a scoped block to use simple var names.
  {
    /// Select whole current lines without newline in the end.

    const {start, end, input, isTa} = getSel({
      focused: true,
      wholeLines: true,
    });

    setSel(start, end, {input});
    if (isTa) await save();
  }
};
