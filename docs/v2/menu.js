import {onLineForm} from "./line.js";
import {hideAtticForms} from "./nav.js";
import {ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, ui} from "./ui.js";

/// initMenuUI

export const initMenuUI = () => {
  ui.menuForm = o(".menu-form hidden",
    o(".main",
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
      ib("123", "", onLineForm),
    ),
    ib("close", "x", hideMenuForm),
  );

  ui.attic.appendChild(ui.menuForm);
};

/// onMenuForm

export const onMenuForm = () => {
  if (isHidden(ui.menuForm)) {
    showMenuForm();
  } else hideMenuForm();
};

/// showMenuForm

export const showMenuForm = () => {
  hideAtticForms();
  expand(ui.attic);
  show(ui.menuForm);
};

/// hideMenuForm

export const hideMenuForm = () => {
  if (isHidden(ui.menuForm)) return;

  hide(ui.menuForm);
  collapse(ui.attic);
};
