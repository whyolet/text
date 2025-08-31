import {getId} from "./crypto.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {getExportedBytes, importBackup} from "./file.js";
import {info} from "./info.js";
import {o, toast, ui} from "./ui.js";

const scope = "https://www.googleapis.com/auth/drive.file";
const syncedFileName = "whyolet-text.db";

/// onGDriveSync

export const onGDriveSync = async () => {
  if (mem.isSecret) {
    alert(`Syncing this secret world
with the "${syncedFileName}" file
at your Google Drive
would break the privacy!

Please ⬇️Export the encrypted DB file,
move it privately to another device,
⬆️Import it there to the same secret world,
rename and delete the file.`);
    return;
  }

  mem.nonce = getId();
  await db.saveConf(db.conf.nonce);

  const form = o("form", {
    method: "GET",
    action: "https://accounts.google.com/o/oauth2/v2/auth",
  });

  const params = {
    client_id: "688517838791-tuli5btteuvei4m8el5t8e7lv11c653i.apps.googleusercontent.com",
    prompt: "select_account",
    scope,
    state: mem.nonce,
    response_type: "token",
    redirect_uri: "https://text.whyolet.com/",
  };

  for (const [name, value] of Object.entries(params)) {
    form.appendChild(
      o("input", {
        "type": "hidden",
        name,
        value,
      }),
    );
  }

  ui.body.appendChild(form);
  form.submit();
};

/// onRedirect

export const onRedirect = async (hash) => {
  const accessToken = await getAccessToken(hash);
  if (info.closed) return;
  if (!accessToken) return syncFailed();

  const options = {
    cache: "no-store",
    headers: {
      "Authorization": "Bearer " + accessToken,
    },
  };

  const search = new URLSearchParams({
    corpora: "user",
    q: `name = '${syncedFileName}' and trashed = false and 'me' in owners`,
    // `sharedWithMe = false` is buggy.
  });

  const url = "https://www.googleapis.com/drive/v3/files?" + search.toString();

  const response = await fetch(url, options);
  if (info.closed) return;

  if (!response.ok) throw Error(
    await response.text(),
  );

  const {files} = await response.json();
  if (info.closed) return;

  if (files.length > 1) return syncFailed(
`there are multiple files
named "${syncedFileName}"
in your Google Drive.`,
`delete the duplicates`,
  );

  const file = (files.length === 1) ? files[0] : null;

  if (file) {
    const ok = await downloadAndImport(file, options);
    if (info.closed || !ok) return;
  }

  const ok = await exportAndUpload(file, options);
  if (info.closed || !ok) return;

  history.back();
  toast("Synced OK");
};

/// getAccessToken

export const getAccessToken = async (hash) => {
  const params = Object.fromEntries(new URLSearchParams(hash.slice(1)));

  if (params.error) return syncFailed(params.error);

  if (params.scope !== scope) return;
  // No error: not GDrive sync.

  if (
    params.state !== mem.nonce ||
    !mem.nonce
  ) return syncFailed("outdated or incorrect link.");

  mem.nonce = "";
  await db.saveConf(db.conf.nonce);
  return params.access_token;
};

/// syncFailed

const syncFailed = (reason, solution) => {
  if (solution) solution += `
and `;

  if (reason && !info.closed) alert(
`Sync failed:
${reason}

Please ${solution || ""}try again.`,
  );

  if (!info.closed) history.back();
  return false;
};

/// downloadAndImport

const downloadAndImport = async (file, options) => {
  const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

  const response = await fetch(url, options);
  if (info.closed) return false;

  if (!response.ok) throw Error(
    await response.text(),
  );

  const buffer = await response.arrayBuffer();
  if (info.closed) return false;

  return await importBackup(buffer, {
    isSync: true,
  });
};

/// exportAndUpload

const exportAndUpload = async (file, options) => {
  const data = await getExportedBytes();
  const dataType = "application/octet-stream";
  if (info.closed) return false;

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

  const response = await fetch(url, {
    method: file ? "PATCH" : "POST",
    body,
    ...options,
  });
  if (info.closed) return false;

  if (!response.ok) throw Error(
    await response.text(),
  );

  const result = await response.json();
  if (info.closed) return false;

  if (
    result.kind !== "drive#file" ||
    !result.id
  ) throw Error(
    "Unexpected upload response: " +
    JSON.stringify(result),
  );

  return true;
};
