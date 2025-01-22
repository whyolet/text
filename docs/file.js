import {mem} from "./db.js";
import {getNow} from "./nav.js";
import {save} from "./page.js";
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
