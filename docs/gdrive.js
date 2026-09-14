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

import {getId} from "./crypto.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {getExportedBytes, importBackup, onSetExportPassphrase} from "./file.js";
import {info, openInfoScreen} from "./info.js";
import {choose, enter, getInt, mi, o, toast, ui, warn} from "./ui.js";

export const defaultSyncSeconds = 60;
const scope = "https://www.googleapis.com/auth/drive.file";
const syncedFileName = "whyolet-text.db";
const spinClass = "spin";
const warnClass = "active";

/// onSyncMenu

export const onSyncMenu = async () => {
  if (mem.isSecret) {
    await warn(`
Syncing this secret world
with the "${syncedFileName}" file
at your Google Drive
would break the privacy!

Please ⬇️Export the encrypted DB file,
move it privately to another device,
⬆️Import it there to the same secret world,
rename and delete the file.
    `);
    return;
  }

  const timerText = mem.syncSeconds ?
    `Sync every ${mem.syncSeconds} seconds`
    : "Enable auto-sync";

  const action = await choose(
    "Sync",
    mi("key", "Encryption passphrase", onSetExportPassphrase),
    mi("drive_export", "Select Google Drive", onSelAcc),
    mi("timer", timerText, onSyncTimerSetup),
    mem.syncSeconds ?
      mi("block", "Disable auto-sync", onDisableSync)
      : null,
  );
  if (!action) return;

  await action();
};

/// onSyncTimerSetup

const onSyncTimerSetup = async () => {
  const answer = await enter(
    "",
    mem.syncSeconds || defaultSyncSeconds,
    {
      prefix: "Sync every",
      inline: true,
      suffix: "seconds",
    },
  );

  const intSeconds = getInt({
    oldValue: mem.syncSeconds,
    newValue: answer,
    min: 10,
    max: 10*60*60,
    fix: true,
  });
  if (intSeconds === null) return;

  mem.syncSeconds = intSeconds;
  await db.saveConf(db.conf.syncSeconds);
  toast(`${mem.syncSeconds} seconds`);
  if (!mem.isSyncing) restartSyncTimer();
};

/// restartSyncTimer

const restartSyncTimer = () => {
  clearTimeout(mem.syncTimerId);
  if (!mem.syncSeconds) return;

  mem.syncTimerId = setTimeout(sync, mem.syncSeconds * 1000);
};

/// onDisableSync

const onDisableSync = async () => {
  if (!mem.isSyncing) clearTimeout(mem.syncTimerId);

  mem.syncSeconds = 0;
  await db.saveConf(db.conf.syncSeconds);

  dontAskClick();
  toast("Disabled");
};

/// onSelAcc

const onSelAcc = () => {
  mem.syncMode = "selAcc";

  // No await to keep click.
  db.saveConf(db.conf.syncMode);

  sync({clicked: true});
};

/// onSync

export const onSync = () => {
  sync({clicked: true});
};

/// sync

export const sync = (props) => {
  const {clicked} = props ?? {};
  if (mem.isSecret) return;

  if (mem.syncMode === "auto") {
    autoSync();
    return;
  }

  if (clicked) {
    signIn();
  } else askClick();
};

/// signIn

const signIn = () => {
  mem.nonce = getId();

  const params = {
    client_id: "688517838791-tuli5btteuvei4m8el5t8e7lv11c653i.apps.googleusercontent.com",
    scope,
    state: mem.nonce,
    response_type: "token",
    redirect_uri: "https://text.whyolet.com/",
  };

  if (mem.syncMode === "selAcc" || !mem.gdriveEmail) {
    params.prompt = "select_account";
  } else {
    params.prompt = "none";
    params.login_hint = mem.gdriveEmail;
  }

  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams(params).toString();

  const width = Math.min(500, innerWidth);
  const height = Math.min(600, innerHeight);
  const left = screenX + (outerWidth - width) / 2;
  const top = screenY + (outerHeight - height) / 2;

  const popup = open(url, "_blank", `popup,left=${left},top=${top},width=${width},height=${height}`);

  if (!popup) {
    mem.nonce = "";
    alert("Please allow popup!");
    return;
  }

  // popup -> google -> our main.js -> intercept.js -> onMessage -> onRedirect
};

/// onRedirect

export const onRedirect = async (hash) => {
  const params = Object.fromEntries(new URLSearchParams(hash.slice(1)));

  if (params.error === "interaction_required") {
    mem.syncMode = "selAcc";
    await db.saveConf(db.conf.syncMode);

    await warn(`
Please click 🔄 again
to confirm Google Drive`,
    );

    askClick();
    return;
  }

  if (params.error) {
    await syncFailed(params.error);
    return;
  }

  if (params.scope !== scope) return;
  // No error: not GDrive sync.

  if (
    params.state !== mem.nonce ||
    !mem.nonce
  ) {
    await syncFailed("outdated or incorrect link.");
    return;
  }

  mem.nonce = "";

  mem.gdriveToken = params.access_token;
  await db.saveConf(db.conf.gdriveToken);

  mem.syncMode = "auto";
  await db.saveConf(db.conf.syncMode);

  toast("← Syncing…");
  sync();
};

/// autoSync

const autoSync = async () => {
  if (mem.isSyncing) return;

  mem.isSyncing = true;
  try {
    clearTimeout(mem.syncTimerId);
    dontAskClick();
    ui.sync.classList.add(spinClass);
    await autoSyncCore();
  } finally {
    mem.isSyncing = false;
    ui.sync.classList.remove(spinClass);
    restartSyncTimer();
  }
};

const autoSyncCore = async () => {
  const search = new URLSearchParams({
    corpora: "user",
    fields: "files(id,modifiedTime,owners/emailAddress)",
    q: `name = '${syncedFileName}' and trashed = false and 'me' in owners`,
    // `sharedWithMe = false` is buggy.
  });

  const url = "https://www.googleapis.com/drive/v3/files?" + search.toString();

  const response = await authFetch(url);
  if (!response) return;

  const {files} = await response.json();

  if (files.length > 1) {
    const s = files.length > 2 ? "s" : "";
    await syncFailed(`
there are multiple files
named "${syncedFileName}"
in your Google Drive.`,
`delete the duplicate${s}`,
    );
    return;
  }

  const file = (files.length === 1) ? files[0] : null;

  const email = file ?
    file.owners[0].emailAddress
    : await getEmail();

  if (
    email &&
    mem.gdriveEmail !== email
  ) {
    mem.gdriveEmail = email;
    await db.saveConf(db.conf.gdriveEmail);
  }

  if (file && (
    !mem.gdriveDownloaded ||
    mem.gdriveDownloaded < file.modifiedTime
  )) {
    const ok = await downloadAndImport(file);
    if (!ok) return;

    mem.gdriveDownloaded = file.modifiedTime;
    await db.saveConf(db.conf.gdriveDownloaded);
  }

  if (
    !mem.gdriveUploaded ||
    mem.gdriveUploaded < mem.pagesUpdated
  ) {
    const ok = await exportAndUpload(file);
    if (!ok) return;

    mem.gdriveUploaded = mem.pagesUpdated;
    await db.saveConf(db.conf.gdriveUploaded);
  }
};

/// getEmail

const getEmail = async () => {
  const url = "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)";

  const response = await authFetch(url);
  if (!response) return "";

  const {user} = await response.json();
  return user.emailAddress;
};

/// downloadAndImport

const downloadAndImport = async (file) => {
  const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

  const response = await authFetch(url);
  if (!response) return false;

  const buffer = await response.arrayBuffer();

  return await importBackup(buffer, {
    isSync: true,
  });
};

/// exportAndUpload

const exportAndUpload = async (file) => {
  const data = await getExportedBytes();
  const dataType = "application/octet-stream";

  const metadata = JSON.stringify({
    name: syncedFileName,
    mimeType: dataType,
  });
  const metadataType = "application/json";

  const sep = "--";
  const boundary = getId();
  const newline = "\r\n";
  const typeHeader = "Content-Type: ";

  const head = [
    sep, boundary, newline,
    typeHeader, metadataType, newline,
    newline,
    metadata, newline,
    sep, boundary, newline,
    typeHeader, dataType, newline,
    newline,
  ].join("");

  const tail = [
    newline,
    sep, boundary, sep, newline,
  ].join("");

  const body = new Blob([head, data, tail], {
    type: "multipart/related; boundary=" + boundary,
  });

  const url = `https://www.googleapis.com/upload/drive/v3/files${
    file ? "/" + file.id : ""
  }?uploadType=multipart`;

  const response = await authFetch(url, {
    method: file ? "PATCH" : "POST",
    body,
  });
  if (!response) return false;

  const result = await response.json();

  if (
    result.kind !== "drive#file" ||
    !result.id
  ) throw Error(
    "Unexpected upload response: " +
    JSON.stringify(result),
  );

  return true;
};

/// authFetch

const authFetch = async (url, options) => {
  const fetchOptions = {
    cache: "no-store",
    ...options,
    headers: {
      "Authorization": "Bearer " + mem.gdriveToken,
      ...options?.headers,
    },
  };

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    // E.g. network error "Failed to fetch": toast-inform and retry later after syncSeconds.
    toast(error.message, {
      warn: true,
    });
    return null;
  }

  if (response.ok) return response;

  if (response.status === 401) {
    mem.syncMode = "renew";
    await db.saveConf(db.conf.syncMode);
    askClick();
    return null;
  }

  throw Error(await response.text());
};

/// askClick, dontAskClick

const askClick = () => {
  ui.sync.textContent = "sync_problem";
  ui.sync.classList.add(warnClass);
  toast("⬅️ Please sync!");
};

const dontAskClick = () => {
  ui.sync.textContent = "sync";
  ui.sync.classList.remove(warnClass);
};

/// syncFailed

const syncFailed = async (reason, solution) => {
  if (solution) {
    solution += `
and `;
  } else solution = "";

  await warn(`
Sync failed:
${reason.trim()}

Please ${solution}try again.
  `);
};
