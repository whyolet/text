import {Bytes, decrypt, encrypt, setExportPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {getNow, showOrHideOverdue} from "./nav.js";
import {getPage, openPage, save} from "./page.js";
import {hide, o, on, show, toast, ui} from "./ui.js";

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

export const onBackupExport = async () => {
  const now = getNow()
  .replace("T", "--")
  .replaceAll(":", "-")
  .replace(/\.\d+/, "");

  const fileName = `whyolet-text--${now}.db`;

  const exportedPages = [];
  for (const page of Object.values(mem.pages)) {
    const exportedPage = Object.assign({}, page);
    deleteLocalProps(exportedPage);
    exportedPages.push(exportedPage);
  }

  const bytes = await encrypt(
    exportedPages,
    {isExport: true},
  );

  await saveFile({
    saverId: "backup",
    fileName,
    data: bytes,
  });
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
    fileHandle: handle,
    fileName,
    data,
    isText,
  } = props ?? {};

  if ("showSaveFilePicker" in window) {
    let fileHandle = handle;
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
  const text = await getUploaded({isText: true});
  if (text === null) return;

  ui.ta.value = text;
  ui.ta.setSelectionRange(0, 0);
  ui.ta.scrollTop = 0;
  await save();
};

/// onBackupImport

export const onBackupImport = async () => {
  const buffer = await getUploaded();
  if (buffer === null) return;

  const bytes = new Bytes(buffer);
  const importedPages = await decrypt(bytes, {isImport: true});
  if (importedPages === null) return;

  const safe = confirm(`Do you want to keep changes
made after this backup?`);

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
        if (safe) continue;
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

  const maxIndex = unsavedPages.length - 1;
  for (const [i, unsavedPage] of unsavedPages.entries()) {
    await db.savePage(unsavedPage, {
      hasPrev: i > 0,
      hasNext: i < maxIndex,
    });
  }

  if (needReopenPage) {
    await openPage(mem.page);
  }

  showOrHideOverdue();

  alert(`Created pages: ${created}
Updated pages: ${updated}
${safe ? "\nSkipped" : "…including"} pages changed after backup: ${outdated
}${safe ? "" : "\n"}
Skipped unchanged pages: ${unchanged}`);
};

/// getUploaded

const getUploaded = async (props) => {
  const {isText} = props ?? {};

  return await new Promise(done => {
    const input = o("input.hidden", {"type": "file"});

    on(input, "cancel", () => done(null));

    on(input, "change", async () => {
      const file = input.files[0];
      done(
        isText ? await file.text()
        : await file.arrayBuffer()
      );
    });

    ui.body.appendChild(input);
    input.click();
    ui.body.removeChild(input);
  });
};

/// onSetExportPassphrase

export const onSetExportPassphrase = () => {
  const newValue = prompt(`A passphrase (few words)
for backup and sync files:`);
  if (newValue === null) return;

  setExportPassphrase(newValue);

  alert(`This passphrase will be kept in memory
until you set a new passphrase
or close this app.`);
};
