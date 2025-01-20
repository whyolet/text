import * as db from "./db.js";
import {mem} from "./db.js";
import {hideAtticForms} from "./nav.js";
import {getInt, ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, toast, ui} from "./ui.js";

/// initFontUI

export const initFontUI = () => {
  ui.zoomInput = o("input", {
    "type": "number",
    min: 10,
    max: 1000,
    step: 1,
  });
  on(ui.zoomInput, "change", saveZoom);

  ui.fontForm = o(".font-form hidden",
    ib("format_letter_spacing_wider", "a", onMono),
    o(".main",
      ib("remove", "", () => saveZoom({add: -10})),
      ui.zoomInput,
      ib("add", "", () => saveZoom({add: 10})),
    ),
    ib("close", "x", hideFontForm),
  );

  ui.attic.appendChild(ui.fontForm);
};

/// onFontForm

export const onFontForm = () => {
  if (isHidden(ui.fontForm)) {
    showFontForm();
  } else hideFontForm();
};

/// showFontForm

export const showFontForm = () => {
  hideAtticForms();
  expand(ui.attic);
  show(ui.fontForm);

  ui.zoomInput.value = mem.zoom;
};

/// hideFontForm

export const hideFontForm = () => {
  if (isHidden(ui.fontForm)) return;

  hide(ui.fontForm);
  collapse(ui.attic);
};

/// onMono

const onMono = async () => {
  mem.mono = !mem.mono;
  await db.saveConf(db.conf.mono);
  applyFont();

  toast(mem.mono ?
    "fixed-width"
    : "variable-width"
  );
};

/// saveZoom

const saveZoom = async (props) => {
  const {add = 0} = props ?? {};

  const zoom = getInt({
    oldValue: mem.zoom,
    newValue: ui.zoomInput.value,
    add,
    min: ui.zoomInput.min,
    max: ui.zoomInput.max,
    fix: true,
  });
  if (zoom === null) return;

  ui.zoomInput.value = zoom;
  mem.zoom = zoom;
  await db.saveConf(db.conf.zoom);
  applyFont();
};

/// applyFont

export const applyFont = () => {
  ui.ta.style.fontSize = `${mem.zoom}%`;

  const classes = ui.ta.classList;
  if (mem.mono) {
    classes.add("mono");
  } else classes.remove("mono");
};
