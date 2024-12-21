import * as db from "./db.js";
import {getSel} from "./sel.js";
import {ui} from "./ui.js";

const mem = db.mem;

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

  const indent = templateLine.match(/^[\t ]*/)[0];

  if (templateLine === indent) {
    // Move indent from template line to current line, to keep blank lines clean.
    ui.ta.setRangeText(
      emptyLines + indent,
      i - matchedLines.length,
      i,
      "end",
     );
  } else {
    // Copy indent from template line to current line.
    ui.ta.setRangeText(indent, i, i, "end");
  }

  mem.textLength = ui.ta.value.length;
};
