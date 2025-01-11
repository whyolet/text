import * as db from "./db.js";
import {save} from "./page.js";
import {o, toast} from "./ui.js";

const mem = db.mem;

/// onExportPage

export const onExportPage = () => {
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

/// downloadURL

const downloadURL = (url, fileName) => {
  const a = o("a.hidden", {
    href: url,
    download: fileName,
  });

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
