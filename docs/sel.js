import * as db from "./db.js";
import {mem} from "./db.js";
import {save} from "./page.js";
import {toast, ui} from "./ui.js";

/// getSel

export const getSel = (props) => {
  const {
    focused,
    withNewline,
    withoutExpand,
    withoutIndent,
    wholeLines,
  } = props ?? {};

  const input = focused && ui.focusedInput || ui.ta;
  const isTa = (input === ui.ta);
  const text = input.value;
  let start = input.selectionStart;
  let end = input.selectionEnd;

  if ((start === end || wholeLines) && !withoutExpand) {
    start = text
    .slice(0, start)
    .search(/[^\r\n]*$/);

    end += text.slice(end).match(
      withNewline ?
      /[^\r\n]*\r?\n?/
      : /[^\r\n]*/
    )[0].length;

    if (withoutIndent) {
      start += text
      .slice(start, end)
      .match(/\s*/)[0].length;
    }
  }

  const part = text.slice(start, end);
  return {start, end, part, input, isTa};
};

/// getQueryFromSel

export const getQueryFromSel = () => {
  const {start, end, part, input, isTa} = getSel({
    focused: true,
    withoutExpand: true,
  });

  return isTa ? (
    (
      start === end ||
      part.includes("\n")
    ) ? "" : part
  ) : input.value;
};

/// strike

const strike = "─";
// NOTE: This char is also used in few precompiled /.../ regexes directly.

export const strikes = strike + strike;
const newline_striker = strikes + "$&" + strikes;

/// onStrike

export const onStrike = async () => {
  const {start, end, part, input, isTa} = getSel({
    focused: true,
    withoutIndent: true,
  });

  const result = part.includes(strike) ?
    part.replaceAll(strike, "")
    : (
      strikes +
      part.replaceAll(/[\r\n]+/g, newline_striker) +
      strikes
    );

  input.setRangeText(result, start, end, "select");
  if (isTa) await save();
};

/// onErase

export const onErase = async () => {
  const {start, end, input, isTa} = getSel({
    withNewline: true,
    focused: true,
  });

  input.setRangeText("", start, end, "end");
  if (isTa) await save();
};

/// onDuplicate

export const onDuplicate = async () => {
  const {start, end, part} = getSel({wholeLines: true});
  ui.ta.setRangeText("\n" + part, end, end);
  ui.ta.setSelectionRange(
    end + 1,
    end + 1 + part.length,
  );
  await save();
};

/// onMoveUp, onMoveDown

export const onMoveUp = async () => {
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

  await save();
};

export const onMoveDown = async () => {
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
  await save();
};

/// onSelAll

export const onSelAll = () => {
  const input = ui.focusedInput || ui.ta;
  input.setSelectionRange(0, input.value.length);
}

/// onSelLine

export const onSelLine = async () => {
  const {start, end} = getSel({
    focused: true,
    withoutExpand: true,
  });

  if (start !== end) {
    /// Grow to the next line.

    const {start, end, input} = getSel({
      focused: true,
      wholeLines: true,
      withNewline: true,
    });

    input.setSelectionRange(start, end);
  }

  {
    /// Select whole current lines.

    const {start, end, input, isTa} = getSel({
      focused: true,
      wholeLines: true,
    });

    input.setSelectionRange(start, end);
    if (isTa) await save();
  }
};
