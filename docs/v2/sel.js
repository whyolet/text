import * as db from "./db.js";
import {save} from "./page.js";
import {ui} from "./ui.js";

const mem = db.mem;

/// strike

const strike = "─";
// NOTE: This char is used in few precompiled /.../ regexes directly.

const strikes = strike + strike;
const newline_striker = strikes + "$&" + strikes;

/// onStrike

export const onStrike = async () => {
  const page = mem.page;
  const text = page.text;

  let start = page.ss, end = page.se;
  if (start === end) {
    start = text.slice(0, start).search(/[^\r\n]*$/);
    end += text.slice(end).match(/[^\r\n]*/)[0].length;
  }

  let sel = text.slice(start, end);

  sel = sel.includes(strike) ?
    sel.replaceAll(strike, "")
    : (
      strikes +
      sel.replaceAll(/[\r\n]+/g, newline_striker) +
      strikes
    );

  ui.ta.setRangeText(sel, start, end, "select");
  await save();
};
