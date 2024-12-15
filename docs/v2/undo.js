// Please read "./undo.md"

import * as db from "./db.js";
import {openPage} from "./page.js";
import {toast} from "./ui.js";

const mem = db.mem;

/// onUndo

export const onUndo = async () => {
  const ids = mem.opIds;

  let opId = ids.undo || ids.max;
  if (!opId || opId === ids.min) {
    return toast("This is the oldest!");
  }

  opId--;
  mem.opIds.undo = opId;
  await applyOp(opId);
};

/// onRedo

export const onRedo = async () => {
  let opId = mem.opIds.undo;
  if (!opId) {
    return toast("This is the newest!");
  }

  opId++;
  mem.opIds.undo = (opId === mem.opIds.max ? null : opId);
  await applyOp(opId);
};

/// applyOp

const applyOp = async (opId) => {
  const page = await db.loadOp(opId);

  await Promise.all([
    db.savePage(page, {withoutOp: true}),
    db.saveConf(db.conf.opIds),
  ]);

  openPage(page);
};
