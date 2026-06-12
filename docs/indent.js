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
import {getSel, setSel} from "./sel.js";
import {save} from "./page.js";
import {ui} from "./ui.js";

const indent = "  ";

/// autoindent

export const autoindent = () => {
  /*
    To react to a newline entered,
    `autoindent` is called before debounced `save`,
    so `mem.page` is outdated,
    and we should not update it here,
    to keep the diff for `save`.
  */

  const text = ui.ta.value;
  if (text.length <= mem.textLength) {
    mem.textLength = text.length;
    return;
  }

  mem.textLength = text.length;

  const i = ui.ta.selectionStart;
  if (
    i !== ui.ta.selectionEnd ||
    i === 0 ||
    !"\r\n".includes(text.charAt(i - 1))
  ) return;

  const [
    matchedLines,
    templateLine,
    emptyLines,
  ] = text
  .slice(0, i)
  .match(/([^\r\n]*)([\r\n]*)$/);

  const indents = templateLine.match(/^[\t ]*(?:● )?/)[0];

  if (templateLine === indents) {
    // Move indents from template line to current line, to keep blank lines clean.
    ui.ta.setRangeText(
      emptyLines + indents,
      i - matchedLines.length,
      i,
      "end",
     );
  } else {
    // Copy indents from template line to current line.
    ui.ta.setRangeText(indents, i, i, "end");
  }

  mem.textLength = ui.ta.value.length;
};

/// onIndent

export const onIndent = async () => {
  const {start, end} = getSel({withoutExpand: true});

  const {
    start: wholeStart,
    end: wholeEnd,
    part,
  } = getSel({wholeLines: true});

  const isSingle = !part.includes("\n");
  let firstAdd = null;

  const result = part
  .split("\n")
  .map(line => {
    const add = (
      isSingle ||
      /\S/.test(line)
    ) ? indent : "";

    firstAdd ??= add;
    return add + line;
  })
  .join("\n");

  ui.ta.setRangeText(result, wholeStart, wholeEnd);

  setSel(
    start + firstAdd.length,
    end + (result.length - part.length),
  );

  await save();
};

/// onDedent

export const onDedent = async () => {
  const {start, end} = getSel({withoutExpand: true});

  const {
    start: wholeStart,
    end: wholeEnd,
    part,
  } = getSel({wholeLines: true});

  let firstDel = null;

  const result = part
  .split("\n")
  .map(line => {
    let prefix = indent;
    while (prefix) {
      if (line.startsWith(prefix)) {
        firstDel ??= prefix;
        return line.slice(prefix.length);
      }
      prefix = prefix.slice(1);
    }
    firstDel ??= "";
    return line;
  })
  .join("\n");

  ui.ta.setRangeText(result, wholeStart, wholeEnd);

  setSel(
    Math.max(wholeStart, start - firstDel.length),
    Math.max(wholeStart, end - (part.length - result.length)),
  );

  await save();
};
