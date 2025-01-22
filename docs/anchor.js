import {mem} from "./db.js";
import {save} from "./page.js";
import {ui} from "./ui.js";

/// anchor

export const anchor = "⚓";

/// onAnchor

export const onAnchor = async () => {
  const {text, selStart} = mem.page;

  const i = text.indexOf(anchor);
  if (i === -1) {
    ui.ta.setRangeText(anchor, selStart, selStart);
    ui.ta.setSelectionRange(selStart, selStart + 1);
    await save();
    return;
  }

  if (i === selStart) {
    ui.ta.setRangeText("", selStart, selStart + 1);
    ui.ta.setSelectionRange(selStart, selStart);
    await save();
    return;
  }

  ui.ta.setSelectionRange(i, i + 1);
  await save();
};
