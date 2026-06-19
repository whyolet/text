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

import {Bytes, decrypt, encrypt, setExportKey1} from "./crypto.js";
import {getCSV, getPagesFromCSV} from "./csv.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {getNow, showOrHideOverdue, switchDb} from "./nav.js";
import {getPage, openPage, save, savePages} from "./page.js";
import {setSel} from "./sel.js";
import {choose, enter, hide, o, on, say, show, toast, ui} from "./ui.js";

/// onPageExport

export const onPageExport = async () => {
  const {tag, text} = mem.page;

  const fileName = (
    tag.replace(/^.*[\/\\]/, "")
    + (tag.includes(".") ? "" : ".txt")
  );

  const fileHandle = await saveFile({
    fileName,
    data: text,
    isText: true,
  });
  if (!fileHandle) return;

  mem.fileHandles[tag] = fileHandle;
  mem.page.fileSaved = getNow();
  showOrHideSaveFile();
};

/// showOrHideSaveFile

export const showOrHideSaveFile = () => {
  const fileHandle = mem.fileHandles[mem.page.tag];
  if (
    fileHandle &&
    mem.page.fileSaved < mem.page.edited
  ) {
    show(ui.saveFile);
  } else hide(ui.saveFile);
};

/// onSaveFile

export const onSaveFile = async () => {
  const fileHandle = mem.fileHandles[mem.page.tag];
  if (!fileHandle) return;

  try {
    await saveFile({
      fileHandle,
      data: mem.page.text,
      isText: true,
    });
  } catch (error) {
    if (error.name !== "InvalidStateError") throw error;

    onPageExport();
    return;
  }

  mem.page.fileSaved = getNow();
  showOrHideSaveFile();
};

/// onBackupExport

export const onBackupExportDB = async () => await onBackupExport("db");

export const onBackupExportCSV = async () => await onBackupExport("csv");

const onBackupExport = async (format) => {
  const now = getNow()
  .replace("T", "--")
  .replaceAll(":", "-")
  .replace(/\.\d+/, "");

  const fileName = `whyolet-text--${now}.${format}`;

  const data = (
    format === "db"
    ? await getExportedBytes()
    : getCSV()
  );

  await saveFile({
    saverId: "backup",
    fileName,
    data,
    isText: format === "csv",
  });
};

/// getExportedBytes

export const getExportedBytes = async () => {
  const exportedPages = [];
  for (const page of Object.values(mem.pages)) {
    const exportedPage = Object.assign({}, page);
    deleteLocalProps(exportedPage);
    exportedPages.push(exportedPage);
  }

  return await encrypt(
    exportedPages,
    {isExport: true},
  );
};

/// deleteLocalProps

const deleteLocalProps = (pageCopy) => {
  delete pageCopy.id;
  delete pageCopy.fileSaved;
};

/// saveFile

const saveFile = async (props) => {
  const {
    saverId = "page",
    fileName,
    data,
    isText,
  } = props ?? {};
  let {fileHandle} = props ?? {};

  if ("showSaveFilePicker" in window) {
    if (!fileHandle) {
      try {
        fileHandle = await showSaveFilePicker({
          id: saverId,
          startIn: "downloads",
          suggestedName: fileName,
        });
      } catch (error) {
        if (error.name === "AbortError") return null;

        throw error;
      }
    }

    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    return fileHandle;
  }

  /// No `showSaveFilePicker`

  const blob = new Blob([data], {
    type: isText ? "text/plain"
      : "application/octet-stream",
  });

  const url = URL.createObjectURL(blob);

  const a = o("a.hidden", {
    href: url,
    download: fileName,
  });

  ui.body.appendChild(a);
  a.click();
  ui.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60*1000);
  return null;
};

/// onPageImport

export const onPageImport = async () => {
  const file = await getUploaded();
  if (file === null) return;

  ui.ta.value = await file.text();
  setSel(0);
  ui.ta.scrollTop = 0;
  await save();
  toast("Loaded " + file.name);
};

/// onBackupImport

export const onBackupImport = async () => {
  const file = await getUploaded();
  if (file === null) return;

  const isCSV = file.name.toLowerCase().endsWith(".csv");

  const data = await (isCSV
    ? file.text()
    : file.arrayBuffer()
  );
  await importBackup(data, {isCSV});
};

/// importBackup

export const importBackup = async (data, props) => {
  const {isCSV, isSync} = props ?? {};

  const importedPages = (
    isCSV
    ? await getPagesFromCSV(data)
    : await decrypt(
      new Bytes(data),
      {isImport: true},
    )
  );
  if (importedPages === null) return false;

  let keepChanges;
  if (isSync) {
    keepChanges = true;
  } else {
    const answer = await choose(
      `Importing ${importedPages.length} page${importedPages.length === 1 ? "" : "s"}, choose:`,
      {
        value: true,
        icon: "sync",
        text: "Sync (keep recent changes)",
      },
      {
        value: false,
        icon: "history",
        text: "Restore (overwrite recent changes)",
      },
      {
        value: null,
        icon: "close",
        text: `Cancel (do nothing)`,
      },
    );
    if (answer === null) return false;

    keepChanges = answer;
  }

  const unsavedPages = [];
  let needReopenPage = false;
  let created = 0, updated = 0;
  let outdated = 0, unchanged = 0;

  for (const importedPage of importedPages) {
    const tag = importedPage.tag;
    let localPage = mem.pages[tag];

    if (localPage) {
      if (
        localPage.edited ===
        importedPage.edited
      ) {
        unchanged++;
        continue;
      }

      if (
        localPage.edited >
        importedPage.edited
      ) {
        outdated++;
        if (keepChanges) continue;
      }

      updated++;
    } else {
      created++;
      localPage = getPage(tag);
    }

    deleteLocalProps(importedPage);
    Object.assign(localPage, importedPage);
    unsavedPages.push(localPage);

    if (localPage === mem.page) needReopenPage = true;
  }

  await savePages(unsavedPages);
  if (needReopenPage) {
    await openPage(mem.page);
  }
  showOrHideOverdue();
  if (isSync) return true;

  await say(`
Created pages: ${created}
Updated pages: ${updated}
${keepChanges ? "\nSkipped" : "…including"} pages changed after backup: ${outdated
}${keepChanges ? "" : "\n"}
Skipped unchanged pages: ${unchanged}
  `);

  return true;
};

/// getUploaded

const getUploaded = async () => {
  return await new Promise(done => {
    const input = o("input.hidden", {"type": "file"});

    on(input, "cancel", () => done(null));

    on(input, "change", async () => {
      const file = input.files[0];
      done(file);
    });

    ui.body.appendChild(input);
    input.click();
    ui.body.removeChild(input);
  });
};

/// onSetExportPassphrase

export const onSetExportPassphrase = async () => {
  const newValue = await enter(`
A passphrase (few words)
for backup and sync files:
  `, "", {secret: true});
  if (newValue === null) return;

  const hasDot = newValue.startsWith(".");

    await say(`
Backup and sync files
will be encrypted and decrypted
using this passphrase
until you set a new one
or close this app.
` + (hasDot ? `
The first dot in this passphrase
opens the door...
` : "")
  );

  if (hasDot) {
    await switchDb(newValue.slice(1));
    // It calls `setExportKey1` too.
    return;
  }

  await setExportKey1(newValue);
};
