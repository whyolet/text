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
    withNewline: true,
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
