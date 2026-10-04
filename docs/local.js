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
import {btn, closable, dialog, fatal, enter, o, onClick, say, warn} from "./ui.js";

/// isPersistSupported

const isPersistSupported = (
  "storage" in navigator &&
  "persist" in navigator.storage
);

/// getPersisted

export const getPersisted = async () => {
  if (isPersistSupported) {
    return await navigator.storage.persisted();
  }
  return false;
};

/// tryPersist

export const tryPersist = async () => {
  if (isPersistSupported) {
    return await navigator.storage.persist();
  }
  return false;
};

/// onLocalData

export const onLocalData = async () => {
  let persisted = await getPersisted();
  if (!persisted) persisted = await tryPersist();

  const action = await dialog(
    closable("Local data"),
    persisted ? [
      o("", "Good news: your web browser has agreed not to delete your local data."),
      o("", "However, to be safe, use the menu to backup or sync your data."),
    ] : [
      o("", "Bad news: your web browser plans to delete your local data."),
      o("", 'To avoid this, click "Install app" or "Add to Home Screen" in the browser menu, and open the installed app.'),
      o("",
        'If you still see this warning, please request "Notification" permission ',
        o("a", {
          href: "https://web.dev/articles/persistent-storage#how_is_permission_granted",
          target: "_blank",
        }, "required"),
        ' for "Persistent storage" permission:',
      ),
      btn(
        "toggle_on",
        "Request permission",
        () => onRequestPerm,
      ),
    ],
    o(".hr"),
    o("b", "DANGER ZONE"),
    o("", "If you remove this web app from the home screen, your local data may be deleted or kept. This depends on your web browser and OS."),
    o("", "If you use the button below, there is no way back, unless you have a backup file, or a recent sync, or another device with this data."),
    btn(
      "delete_forever",
      "Delete your local data",
      () => onDeleteLocalData,
    ),
    mem.isSecret ? btn(
      "bomb",
      "Set the trap",
      () => onSetTrap,
    ) : null,
  );

  if (action) await action();
};

/// onRequestPerm

const onRequestPerm = async () => {
  if (await tryPersist()) {
    await onSuccess();
    return;
  }

  if (!isPersistSupported) {
    await warn("Persistence is not supported, get a new browser!");
    return;
  }

  if (!("Notification" in window)) {
    await warn("Notification is not supported, get a new browser!");
    return;
  }

  if (Notification.permission === "granted") {
    await warn("Notification was allowed already, but it does not help. Try another browser.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    await warn("Notification is NOT allowed! Please try again.");
    return;
  }

  if (!await tryPersist()) {
    await warn("Notification is allowed, but it does not help. Try another browser.");
    return;
  }

  await onSuccess();
};

/// onSuccess

const onSuccess = async () => {
  await say("Success!");
  setTimeout(onLocalData, 200);
};

/// onDeleteLocalData

const onDeleteLocalData = async () => {
  const answer = await enter('Do you want to delete all your data from this app on this device? Type "yes" to confirm.');

  if (!answer || answer.trim().toLowerCase() !== "yes") {
    await say(`
Deletion was canceled.
Your data is still here.
    `);
    return;
  }

  await db.deleteLocalData();

  await fatal(
    "Your data is deleted",
    `
You've successfully
deleted your data
from this app on this device.

You can start from scratch now.
    `,
  );
};

/// onSetTrap

const onSetTrap = async () => {
  const answer = await enter('Do you want to silently delete all other secret worlds in this app on this device when this secret world is opened again? Type "yes" to confirm.');

  const yes = answer?.trim().toLowerCase() === "yes";

  mem.trap = yes ? "t" : "f";
  // To avoid revealing by the size of encrypted JSON.

  await db.saveConf(db.conf.trap);

  await say("The trap is " + (
    yes ? "enabled" : "disabled"
  ));
};
