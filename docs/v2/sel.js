import * as db from "./db.js";
import {save} from "./page.js";
import {ui} from "./ui.js";

const mem = db.mem;

/// getSel

const getSel = (props) => {
  const withNewline = props?.withNewline;

  let {
    text,
    ss: start,
    se: end,
  } = mem.page;

  if (start === end) {
    start = text.slice(0, start).search(/[^\r\n]*$/);

    end += text.slice(end).match(
      withNewline ?
      /[^\r\n]*\r?\n?/
      : /[^\r\n]*/
    )[0].length;
  }

  const sel = text.slice(start, end);
  return {start, end, sel};
};

/// strike

const strike = "─";
// NOTE: This char is used in few precompiled /.../ regexes directly.

const strikes = strike + strike;
const newline_striker = strikes + "$&" + strikes;

/// onStrike

export const onStrike = async () => {
  const {start, end, sel} = getSel();

  const next = sel.includes(strike) ?
    sel.replaceAll(strike, "")
    : (
      strikes +
      sel.replaceAll(/[\r\n]+/g, newline_striker) +
      strikes
    );

  ui.ta.setRangeText(next, start, end, "select");
  await save();
};

/// onErase

export const onErase = async () => {
  const {start, end} = getSel({withNewline: true});
  ui.ta.setRangeText("", start, end, "end");
  await save();
};
