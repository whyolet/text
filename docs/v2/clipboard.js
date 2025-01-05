import * as db from "./db.js";
import {getSel} from "./sel.js";
import {save} from "./page.js";
import {ui} from "./ui.js";

const mem = db.mem;

/// onCut

export const onCut = async () => {
  const {start, end, part, input, isTa} = getSel({
    withNewline: true,
    focused: true,
  });

  await navigator.clipboard.writeText(part);
  input.setRangeText("", start, end, "end");
  if (isTa) await save();
};

/// onCopy

export const onCopy = async () => {
  const {start, end, part, input} = getSel({
    withNewline: true,
    focused: true,
  });

  await navigator.clipboard.writeText(part);
  input.setSelectionRange(start, end);
};

/// onPaste

export const onPaste = async () => {
  const part = await navigator.clipboard.readText();

  const {start, end, input, isTa} = getSel({
    withoutExpand: true,
    focused: true,
  });

  input.setRangeText(part, start, end, "end");
  if (isTa) await save();
};
