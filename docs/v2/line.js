import {hideAtticForms} from "./nav.js";
import {getInt, ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, ui} from "./ui.js";

let lineNumber = null;

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
    ib("close", "w", hideLineForm),
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
  if (
    ui.focusedInput !== ui.ta ||
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

  // Ignore `mem.page` to react on `selectionchange` instantly.
  const text = ui.ta.value;
  const selStart = ui.ta.selectionStart;
  let maxLineNumber = 1, i = -1;
  lineNumber = 1;  // Outer state.

  while ((i = text.indexOf("\n", i + 1)) !== -1) {
    maxLineNumber++;
    if (i < selStart) lineNumber++;
  }

  ui.maxLineNumber.textContent = maxLineNumber;
  ui.lineNumber.max = maxLineNumber;

  ui.lineNumber.value = lineNumber;
  resizeLineNumber();
};

/// hideLineForm

export const hideLineForm = () => {
  if (isHidden(ui.lineForm)) return;

  hide(ui.lineForm);
  collapse(ui.attic);

  lineNumber = getInt({
    oldValue: lineNumber,
    newValue: ui.lineNumber.value,
    min: 1,
    max: ui.lineNumber.max,
  });
  if (lineNumber === null) return;

  const lineEnd = getLineEnd(lineNumber);
  ui.ta.setSelectionRange(lineEnd, lineEnd);
};

/// getLineEnd

const getLineEnd = (lineNumber) => {
  const text = ui.ta.value;
  let i = -1;
  while (
    lineNumber > 0 &&
    (i = text.indexOf("\n", i + 1)) !== -1
  ) lineNumber--;
  return i > 0 ? i : text.length;
};
