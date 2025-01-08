import * as db from "./db.js";
import {hideAtticForms} from "./nav.js";
import {getLineEnd, getLineNumbers} from "./line.js";
import {getFindSelected, getSel} from "./sel.js";
import {save} from "./page.js";
import {ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, toast, ui} from "./ui.js";

const mem = db.mem;

/// initFindUI

export const initFindUI = () => {
  ui.findInput = o("input", {
    style: "grid-area: f",
    placeholder: "Find…",
  });

  ui.replaceInput = o("input", {
    style: "grid-area: r",
    placeholder: "Replace…",
  });

  ui.findForm = o(".find-form hidden",
    ib("keyboard_arrow_up", "p", onFindPrev),
    ib("keyboard_arrow_down", "n", onFindNext),
    ui.findInput,
    ib("arrow_forward", "o", onReplaceOne),
    ib("arrow_split", "a", onReplaceAll),
    ui.replaceInput,
    ib("close", "x", onClearOrHide),
  );

  ui.attic.appendChild(ui.findForm);
};

/// onFindForm

export const onFindForm = () => {
  if (isHidden(ui.findForm)) {
    showFindForm();
  } else hideFindForm();
};

/// showFindForm

export const showFindForm = () => {
  hideAtticForms();
  expand(ui.attic);
  show(ui.findForm);

  ui.findInput.value = getFindSelected();
};

/// onClearOrHide

const onClearOrHide = () => {
  if (
    ui.findInput.value ||
    ui.replaceInput.value
  ) {
    ui.findInput.value = "";
    ui.replaceInput.value = "";
  } else hideFindForm();
};

/// hideFindForm

export const hideFindForm = () => {
  if (isHidden(ui.findForm)) return;

  ui.findInput.value = "";
  ui.replaceInput.value = "";
  hide(ui.findForm);
  collapse(ui.attic);
};

/// onFindPrev, onFindNext

const onFindPrev = async () => await onFindForward(false);

export const onFindNext = async () => await onFindForward(true);

const onFindForward = async (forward) => {
  const what = ui.findInput.value.toLowerCase();
  if (!what) {
    ui.findInput.focus();
    toast("Find what?");
    return;
  }

  const where = mem.page.text.toLowerCase();

  const start = mem.page.selStart + (
    forward ? 1 : -1
  );

  const found = (
    start < 0 ||
    start >= where.length
  ) ? -1 : (forward ?
    where.indexOf(what, start)
    : where.lastIndexOf(what, start)
  );
  if (found === -1) return toast("Not found!");

  ui.ta.setSelectionRange(found, found + what.length);
  await save();
};

/// onReplaceOne, onReplaceAll

const onReplaceOne = async () => {
  ui.ta.setRangeText(
    ui.replaceInput.value,
    mem.page.selStart,
    mem.page.selEnd,
    "select",
  );

  await save();
};

const onReplaceAll = async () => {
  const oldText = mem.page.text;
  const newText = oldText.replaceAll(
    ui.findInput.value,
    ui.replaceInput.value,
  );

  if (oldText === newText) return toast("Replaced none!");

  // Keep cursor at the same line.
  const {lineNumber} = getLineNumbers();
  ui.ta.value = newText;
  const lineEnd = getLineEnd(lineNumber);
  ui.ta.focus();
  ui.ta.setSelectionRange(lineEnd, lineEnd);

  await save();
  toast("Replaced all");
};
