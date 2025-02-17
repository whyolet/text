// Please read "./undo.md"

import * as db from "./db.js";
import {mem} from "./db.js";
import {getNow, openScreen, screenTypes} from "./nav.js";
import {openPage} from "./page.js";
import {toast} from "./ui.js";

/// createOp

export const createOp = (newPage) => {
  const {tag, text: newText} = newPage;
  const oldPage = mem.oldPages[tag];
  const oldText = oldPage.text;
  let at = 0, del = "", ins = "";

  if (oldText !== newText) {
    let head = 0, tail = 0;

    const minLength = Math.min(
      oldText.length,
      newText.length,
    );

    while (
      head < minLength &&
      oldText.charAt(head) ==
      newText.charAt(head)
    ) head++;

    while (
      tail < minLength - head &&
      oldText.charAt(oldText.length - 1 - tail) ==
      newText.charAt(newText.length - 1 - tail)
    ) tail++;

    at = head;
    del = oldText.slice(head, oldText.length - tail);
    ins = newText.slice(head, newText.length - tail);
  }

  const op = {
    tag, at, del, ins,

    oss: oldPage.selStart,
    ose: oldPage.selEnd,
    osc: oldPage.scroll,
    odn: oldPage.done,

    nss: newPage.selStart,
    nse: newPage.selEnd,
    nsc: newPage.scroll,
    ndn: newPage.done,
  };

  Object.assign(oldPage, newPage);
  return op;
};

/// getRevertedOp

export const getRevertedOp = (op) => ({
  tag: op.tag,

  at: op.at,
  del: op.ins,
  ins: op.del,

  oss: op.nss,  // oldSelStart
  ose: op.nse,  // oldSelEnd
  osc: op.nsc,  // oldScroll
  odn: op.ndn,  // oldDone

  nss: op.oss,  // newSelStart
  nse: op.ose,  // newSelEnd
  nsc: op.osc,  // newScroll
  ndn: op.odn,  // newDone
});

/// onUndo

export const onUndo = async () => {
  const ids = mem.opIds;
  const opId = ids.undo ? ids.undo - 1 : ids.max;

  if (!opId || opId < ids.min) {
    return toast("It's the oldest!");
  }

  ids.undo = opId;
  await applyOp(opId, {forward: false});
};

/// onRedo

export const onRedo = async () => {
  const ids = mem.opIds;
  const opId = ids.undo;
  if (!opId) return toast("It's the newest!");

  ids.undo = opId < ids.max ? opId + 1 : null;
  await applyOp(opId, {forward: true});
};

/// applyOp

const applyOp = async (opId, props) => {
  const {forward} = props ?? {};
  const op = await db.loadOp(opId);
  const page = mem.pages[op.tag];
  const oldPage = mem.oldPages[op.tag];

  if (op.del || op.ins) {
    const del = forward ? op.del : op.ins;
    const ins = forward ? op.ins : op.del;
    const {text} = page;

    page.text = [
      text.slice(0, op.at),
      ins,
      text.slice(op.at + del.length),
    ].join("");

    page.edited = getNow();
  }

  Object.assign(page, {
    selStart: forward ? op.nss : op.oss,
    selEnd: forward ? op.nse : op.ose,
    scroll: forward ? op.nsc : op.osc,
    done: forward ? op.ndn : op.odn,
  });

  Object.assign(oldPage, page);

  await Promise.all([
    db.savePage(page, {withoutOp: true}),
    db.saveConf(db.conf.opIds),
  ]);

  if (page.tag === mem.page.tag) {
    await openPage(page);
    return;
  }

  openScreen(screenTypes.page, {tag: page.tag});
};
