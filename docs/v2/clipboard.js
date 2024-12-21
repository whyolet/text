import * as db from "./db.js";
import {getSel} from "./sel.js";
import {save} from "./page.js";
import {ui} from "./ui.js";

const mem = db.mem;

/// onCut

export const onCut = async () => {
  const {start, end, part} = getSel({withNewline: true});
  await navigator.clipboard.writeText(part);
  ui.ta.setRangeText("", start, end, "end");
  await save();
};

/// onCopy

export const onCopy = async () => {
  const {start, end, part} = getSel({withNewline: true});
  await navigator.clipboard.writeText(part);
  ui.ta.setSelectionRange(start, end);
};

/// onPaste

export const onPaste = async () => {
  const part = await navigator.clipboard.readText();
  const {selStart, selEnd} = mem.page;
  ui.ta.setRangeText(part, selStart, selEnd, "end");
  await save();
};
