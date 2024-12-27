import * as db from "./db.js";
import {save} from "./page.js";
import {toast, ui} from "./ui.js";

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
    start = text
    .slice(0, start)
    .search(/[^\r\n]*$/);

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

/// onMoveUp, onMoveDown

export const onMoveUp = () => {
  const {start, end, part} = getSel({wholeLines: true});
  if (!start) {
    ui.ta.setSelectionRange(0, end);
    return toast("Start of text reached!");
  }

  const prev = mem.page.text
  .slice(0, start)
  .match(/([^\r\n]*)(\r?\n?)$/);

  const prevStart = prev.index;
  const [, prevPart, newline] = prev;

  const result = [
    part,
    newline,
    prevPart,
  ].join("");

  ui.ta.setRangeText(result, prevStart, end);

  ui.ta.setSelectionRange(
    prevStart,
    prevStart + (end - start),
  );
};

export const onMoveDown = () => {
  const text = mem.page.text;
  const {start, end, part} = getSel({wholeLines: true});

  if (end === text.length) {
    ui.ta.setSelectionRange(start, end);
    return toast("End of text reached!");
  }

  const [
    ,
    newline,
    nextPart,
  ] = text
  .slice(end)
  .match(/(\r?\n?)([^\r\n]*)/);

  const result = [
    nextPart,
    newline,
    part,
  ].join("");

  const added = nextPart.length + newline.length;
  ui.ta.setRangeText(result, start, end + added);
  ui.ta.setSelectionRange(start + added, end + added);
};

/// onSelAll

export const onSelAll = () => {
  const focused = document.activeElement;
  if (!focused) return;

  focused.setSelectionRange(0, focused.value.length);
}
