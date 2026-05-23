import * as db from "./db.js";
import {mem} from "./db.js";
import {hideAtticForms} from "./nav.js";
import {save} from "./page.js";
import {getSel} from "./sel.js";
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

/// defaultColors

export const defaultColors = "325-547-769-bad-dcf";
// Keep in sync with `style.css`.

/// onColors

export const onColors = async () => {
  const options = `
Customize...,
Dark Whyolet,${defaultColors}
Light Whyolet,fff-ccf-98b-547-639
Light Green,fff-cdffcd-4a4-333-000
`
    .trim()
    .split("\n")
    .map((line) => {
      const [name, value] = line.split(",");
      return {name, value};
    });

  const lines = options.map(
    (option, index) =>
    `${index}. ${option.name}`
  );
  lines.push(lines.shift());

  const answer = prompt(`
Colors:
${lines.join("\n")}

Enter the number:
`.trim());

  if (answer === null) return;

  const index = parseInt(answer, 10);
  const valid = Array.from(options.keys());
  if (!valid.includes(index)) {
    toast(`From 0 to ${options.length - 1}!`);
    return;
  }

  const colors = index ?
    options[index].value
    : inputColors();

  if (!colors) return;

  mem.colors = colors;
  setColors();
  await db.saveConf(db.conf.colors);
};

/// inputColors

const inputColors = () => {
  const state = {
    answer: mem.colors,
    error: "",
    stop: false,
  };

  while (!state.stop) {
    validateColors(state);
  }

  return state.answer;
};

const validateColors = (state) => {
  const error = state.error ?
    "Error: " + state.error
    : "";

  const help = `${error}

Please enter 5 hex colors:
Background-Hint-Button-Text-Notice

Example:
325-547-769-bad-dcf

Tutorial:
Brightness from 0 to F: 0123456789abcdef
Mix Red+Green+Blue: RGB or RRGGBB
Brightest Red: f00 or ff0000
Teal (middle Green+Blue): 008080
Darkest Black: 000 or 000000
`.trim();

  state.answer = prompt(help, state.answer);

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
  const digitsExpected = [3, 6];
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
to have either 3 (RGB)
or 6 (RRGGBB) digits
but it has ${color.length} digit${s}.`;
      return;
    }

    for (const digit of color) {
      if (!hexDigits.includes(digit)) {
        state.error = `
We need color "${color}"
to have hex digits only:
${hexDigits}
but it has digit "${digit}".`;
        return;
      }
    }
  }

  state.answer = colors.join("-");
  state.stop = true;
};

/// setColors

const setColors = () => {
  const colors = mem.colors.split("-");
  const names = "back hint tool text high".split(" ");
  const root = document.documentElement;

  for (let i = 0; i < names.length; i++) {
    root.style.setProperty(
      "--" + names[i],
      "#" + colors[i],
    );
  }
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

  setColors();
};
