import * as db from "./db.js";
import {save} from "./page.js";
import {ui} from "./ui.js";

const mem = db.mem;

/// getSel

export const getSel = (props) => {
  const withNewline = props?.withNewline;
  const wholeLines = props?.wholeLines;

  let {
    text,
    selStart: start,
    selEnd: end,
  } = mem.page;

  if (start === end || wholeLines) {
    start = text.slice(0, start).search(/[^\r\n]*$/);

    end += text.slice(end).match(
      withNewline ?
      /[^\r\n]*\r?\n?/
      : /[^\r\n]*/
    )[0].length;
  }

  const part = text.slice(start, end);
  return {start, end, part};
};

/// strike

const strike = "─";
// NOTE: This char is also used in few precompiled /.../ regexes directly.

const strikes = strike + strike;
const newline_striker = strikes + "$&" + strikes;

/// onStrike

export const onStrike = async () => {
  const {start, end, part} = getSel();

  const result = part.includes(strike) ?
    part.replaceAll(strike, "")
    : (
      strikes +
      part.replaceAll(/[\r\n]+/g, newline_striker) +
      strikes
    );

  ui.ta.setRangeText(result, start, end, "select");
  await save();
};

/// onErase

export const onErase = async () => {
  const {start, end} = getSel({withNewline: true});
  ui.ta.setRangeText("", start, end, "end");
  await save();
};

/// onSelAll

export const onSelAll = () => {
  const focused = document.activeElement;
  if (!focused) return;

  focused.setSelectionRange(0, focused.value.length);
}
