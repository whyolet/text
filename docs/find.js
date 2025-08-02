import {mem} from "./db.js";
import {hideAtticForms} from "./nav.js";
import {getLineEnd, getLineNumbers} from "./line.js";
import {getQueryFromSel} from "./sel.js";
import {save} from "./page.js";
import {ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, toast, ui} from "./ui.js";

/// initFindUI

export const initFindUI = () => {
  ui.findInput = o("input", {
    style: "grid-area: i",
    placeholder: "Find…",
  });

  ui.replaceInput = o("input", {
    style: "grid-area: i",
    placeholder: "Replace…",
  });

  ui.findForm = o(".find-form hidden",
    ib("move_down", "r", onReplaceForm),
    ui.findInput,
    ib("keyboard_arrow_up", "p", onFindPrev),
    ib("keyboard_arrow_down", "n", onFindNext),
    ib("close", "x", onClearOrHide),
  );

  ui.replaceForm = o(".replace-form hidden",
    ib("fast_forward", "a", onReplaceAll),
    ui.replaceInput,
    ib("play_arrow", "o", onReplaceOne),
  );

  ui.attic.appendChild(ui.findForm);
  ui.attic2.appendChild(ui.replaceForm);
};

/// onFindForm

export const onFindForm = () => {
  if (isHidden(ui.findForm)) {
    showFindForm();
  } else hideFindForm();
};

/// onReplaceForm

const onReplaceForm = () => {
  if (isHidden(ui.replaceForm)) {
    showReplaceForm();
  } else hideReplaceForm();
};

/// showFindForm

export const showFindForm = (props) => {
  const {withoutChanges} = props ?? {};

  hideAtticForms();
  expand(ui.attic);
  show(ui.findForm);
  if (withoutChanges) return;

  const query = getQueryFromSel();
  ui.findInput.value = query;
  if (!query) ui.findInput.focus();
};

/// showReplaceForm

const showReplaceForm = () => {
  expand(ui.attic2);
  show(ui.replaceForm);
  ui.replaceInput.value = ui.findInput.value;
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
  hide(ui.findForm);
  collapse(ui.attic);

  hideReplaceForm();
};

/// hideReplaceForm

const hideReplaceForm = () => {
  if (isHidden(ui.replaceForm)) return;

  ui.replaceInput.value = "";
  hide(ui.replaceForm);
  collapse(ui.attic2);
};

/// onFindPrev, onFindNext

const onFindPrev = async () => await onFindForward(false);

export const onFindNext = async () => await onFindForward(true);

const onFindForward = async (forward) => {
  const lowerQuery = ui.findInput.value.toLowerCase();
  if (!lowerQuery) {
    ui.findInput.focus();
    toast("Find what?");
    return false;
  }

  const lowerText = mem.page.text.toLowerCase();

  const start = mem.page.selStart + (
    forward ? 1 : -1
  );

  const found = (
    start < 0 ||
    start >= lowerText.length
  ) ? -1 : (forward ?
    lowerText.indexOf(lowerQuery, start)
    : lowerText.lastIndexOf(lowerQuery, start)
  );
  if (found === -1) {
    toast("Not found!");
    return false;
  }

  ui.ta.setSelectionRange(found, found + lowerQuery.length);
  await save();
  return true;
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
