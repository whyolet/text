/*
 * Whyolet Text - personal tasks/text editor.
 * Copyright (C) 2026  Denis Ryzhkov <denisr@denisr.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as db from "./db.js";
import {mem} from "./db.js";
import {hideAtticForms} from "./nav.js";
import {save} from "./page.js";
import {getSel} from "./sel.js";
import {choose, enter, getInt, ib, isHidden, hide, show, isCollapsed, collapse, expand, o, on, toast, ui} from "./ui.js";

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
    ib("palette", "", onColors),
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

/// defaultColors

export const defaultColors = "325-547-769-bad-dcf";
// Keep in sync with `style.css`.

/// onColors

export const onColors = async () => {
  let found = false;

  const options = `
Dark,Whyolet,${defaultColors}
Light,Whyolet,fff-ccf-98b-547-639
Dark,Darcula,2b2b2b-323232-606366-a9b7c6-ffc66d
Dark,Dracula,282a36-44475a-bd93f9-f8f8f2-ffb86c
Light,Tody,fff-cdffcd-4a4-333-000
Customize...,,
`
    .trim()
    .split("\n")
    .map((line) => {
      const [head, tail, value] = line.split(",");
      const isCurrent = (value === mem.colors) || !found && !value;
      if (isCurrent) found = true;

      const item = o(".item button",
        o(".icon", isCurrent ? "radio_button_checked" : "radio_button_unchecked"),
        head,
        " ",
        o("span.active", tail),
      );
      if (value) setColors(item, value);

      return {item, value};
    });

  const answer = await choose("Colors", ...options);
  if (answer === null) return;

  const colors = answer || await inputColors();
  if (!colors) return;

  mem.colors = colors;
  setColors();
  await db.saveConf(db.conf.colors);
};

/// inputColors

const inputColors = async () => {
  const state = {
    answer: mem.colors,
    error: "",
    stop: false,
  };

  while (!state.stop) {
    await validateColors(state);
  }

  return state.answer;
};

const colorNamesString = "Background-Selection-Button-Text-Notice";
const colorNames = colorNamesString
  .toLowerCase()
  .split("-");

const validateColors = async (state) => {
  const error = state.error ?
    "Error: " + state.error
    : "";

  const help = `${error}

Please enter 5 hex colors:
${colorNamesString}

Example:
325-547-769-bad-dcf

Tutorial:
Brightness from 0 to F: 0123456789abcdef
Mix Red+Green+Blue: RGB or RRGGBB
Brightest Red: f00 or ff0000
Teal (middle Green+Blue): 008080
Darkest Black: 000 or 000000

A or AA in RGBA/RRGGBBAA means:
0 or 00: fully transparent
80: middle of transparent/opaque
f or ff: fully opaque
`;

  state.answer = await enter(help, state.answer);

  if (state.answer === null) {
    state.stop = true;
    return;
  }

  state.answer = state.answer
    .trim()
    .replaceAll("#", "")
    .toLowerCase();

  const colors = state.answer
    .split("-")
    .map((color) => color.trim());

  const colorsExpected = 5;
  const digitsExpected = [3, 4, 6, 8];
  const hexDigits = "0123456789abcdef";

  if (colors.length !== colorsExpected) {
    const s = colors.length === 1 ? "" : "s";
    state.error = `
We need ${colorsExpected} colors separated by "-"
but we have ${colors.length} color${s} "${state.answer}".`;
    return;
  }

  for (const color of colors) {
    if (!digitsExpected.includes(color.length)) {
      const s = color.length === 1 ? "" : "s";
      state.error = `
We need color "${color}"
to have 3, 4, 6, or 8 digits
(RGB, RGBA, RRGGBB, RRGGBBAA)
but it has ${color.length} digit${s}.`;
      return;
    }

    for (const digit of color) {
      if (!hexDigits.includes(digit)) {
        state.error = `
We need color "${color}"
to have hex digits only
(${hexDigits})
but it has digit "${digit}".`;
        return;
      }
    }
  }

  state.answer = colors.join("-");
  state.stop = true;
};

/// setColors

export const setColors = (el, colors) => {
  el ??= document.documentElement;
  colors ??= mem.colors;
  const colorValues = colors.split("-");
  for (let i = 0; i < colorNames.length; i++) {
    el.style.setProperty(
      "--" + colorNames[i],
      "#" + colorValues[i],
    );
  }
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
  setColors();
};
