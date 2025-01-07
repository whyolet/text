import {hideAtticForms} from "./nav.js";
import {getInt, ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, ui} from "./ui.js";

let recentLineNumber = null;

/// initLineUI

export const initLineUI = () => {
  ui.lineNumber = o("input", {
    "type": "number",
    min: 1,
    step: 1,
  });
  on(ui.lineNumber, "input", resizeLineNumber);

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
  on(document, "selectionchange", updateLineFormOnSelChange);
};

/// resizeLineNumber

const resizeLineNumber = () => {
  ui.lineNumber.style.width = "auto";
  ui.lineNumber.style.width = `${ui.lineNumber.scrollWidth}px`;
};

/// onLineForm

export const onLineForm = () => {
  if (isHidden(ui.lineForm)) {
    showLineForm();
  } else hideLineForm();
};

/// updateLineFormOnSelChange

export const updateLineFormOnSelChange = () => {
  // Don't check `ui.focusedInput` here as input to `ui.lineNumber` leads here too.
  if (
    document.activeElement !== ui.ta ||
    isHidden(ui.lineForm)
  ) return;

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
  resizeLineNumber();
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
  ui.ta.setSelectionRange(lineEnd, lineEnd);
};

/// getLineEnd

export const getLineEnd = (lineNumber) => {
  const text = ui.ta.value;
  let i = -1;
  while (
    lineNumber > 0 &&
    (i = text.indexOf("\n", i + 1)) !== -1
  ) lineNumber--;
  return i > 0 ? i : text.length;
};
