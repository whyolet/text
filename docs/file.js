import {Bytes, decrypt, encrypt} from "./crypto.js";
import * as db from "./db.js";
import {mem} from "./db.js";
import {getNow, showOrHideOverdue} from "./nav.js";
import {getPage, openPage, save} from "./page.js";
import {o, on, toast, ui} from "./ui.js";

/// onPageExport

export const onPageExport = () => {
  const {tag, text} = mem.page;

  const fileName = (
    tag.replace(/^.*[\/\\]/, "")
    + (tag.includes(".") ? "" : ".txt")
  );

  const url = (
    "data:application/octet-stream;charset=utf-8,"
    + encodeURIComponent(text)
  );

  downloadURL(url, fileName);
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
    delete exportedPage.id;
    exportedPages.push(exportedPage);
  }

  const bytes = await encrypt(
    exportedPages,
    {isExport: true},
  );

  const blob = new Blob(
    [bytes],
    {type: "application/octet-stream"},
  );

  const url = URL.createObjectURL(blob);

  downloadURL(url, fileName);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60*1000);
};

/// downloadURL

const downloadURL = (url, fileName) => {
  const a = o("a.hidden", {
    href: url,
    download: fileName,
  });

  ui.body.appendChild(a);
  a.click();
  ui.body.removeChild(a);
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

    delete importedPage.id;
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
Skipped unchanged paged: ${unchanged}`);
};

/// getUploaded

const getUploaded = async (props) => {
  const {isText} = props ?? {};

  return await new Promise(done => {
    const input = o("input.hidden", {"type": "file"});

    on(input, "cancel", () => done(null));

    on(input, "change", () => {
      const file = input.files[0];

      const reader = new FileReader();
      on(reader, "abort", () => done(null));
      on(reader, "error", () => done(null));
      on(reader, "load", () => done(reader.result));

      if (isText) {
        reader.readAsText(file);
      } else reader.readAsArrayBuffer(file);
    });

    ui.body.appendChild(input);
    input.click();
    ui.body.removeChild(input);
  });
};
