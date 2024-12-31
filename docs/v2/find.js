import {hideAtticForms} from "./nav.js";
import {ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, ui} from "./ui.js";

/// initFindUI

export const initFindUI = () => {
  ui.findInput = o({
    o: "input",
    style: "grid-area: f",
    placeholder: "Find…",
  });

  ui.replaceInput = o({
    o: "input",
    style: "grid-area: r",
    placeholder: "Replace…",
  });

  ui.findForm = o(".find-form hidden",
    ib("keyboard_arrow_up", "p"),
    ib("keyboard_arrow_down", "n"),
    ui.findInput,
    ib("arrow_forward", "o"),
    ib("arrow_split", "a"),
    ui.replaceInput,
    ib("close", "w", hideFindForm),
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
};

/// hideFindForm

export const hideFindForm = () => {
  if (isHidden(ui.findForm)) return;

  ui.findInput.value = "";
  ui.replaceInput.value = "";
  hide(ui.findForm);
  collapse(ui.attic);
};
