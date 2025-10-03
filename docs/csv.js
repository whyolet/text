import {mem} from "./db.js";
import {getNow} from "./nav.js";
import {getDone, zeroCursor} from "./page.js";

/// keys

const requiredKeys = ["tag", "text"];
const keys = requiredKeys.concat([
  "edited", "done",
  "selStart", "selEnd", "scroll",
]);
const keysLine = keys.join(",");

const defaultParser = (value) => value;
const intParser = (value) => parseInt(value, 10) || 0;
const parsers = {
  done: (value) => value.toLowerCase() === "true",
  selStart: intParser,
  selEnd: intParser,
  scroll: intParser,
};

/// getCSV

export const getCSV = () => {
  const rows = [keysLine];
  for (const page of Object.values(mem.pages)) {
    const row = [];
    for (const key of keys) {
      const value = String(
        page[key] ?? ""
      ).replaceAll(`"`, `""`);
      row.push(
        /[",\r\n]/.test(value)
        ? `"${value}"`
        : value
      );
    }
    rows.push(row.join(","));
  }
  return rows.join("\n");
};

/// getPagesFromCSV

export const getPagesFromCSV = (data) => {
  const text = (
    data.startsWith('\uFEFF')
    ? data.slice(1)
    : data
  ).replaceAll("\r\n", "\n");

  const len = text.length;
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  let i = 0;

  while (i < len) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (
          i + 1 < len &&
          text[i + 1] === char
        ) {
          value += char;
          i++;
        } else quoted = false;
      } else value += char;
    } else {
      if (char === '"') {
        quoted = true;
      } else if (char === ",") {
        row.push(value);
        value = "";
      } else if (char === "\n") {
        row.push(value);
        value = "";
        rows.push(row);
        row = [];
      } else value += char;
    }
    i++;
  }
  if (value) row.push(value);
  if (row.length) rows.push(row);

  if (!rows.length) {
    alert("File is empty!");
    return null;
  }

  const importedKeys = rows.shift();
  for (const key of requiredKeys) {
    if (!importedKeys.includes(key)) {
      alert(`"${key}" column
is not found!`);
      return null;
    }
  }

  const defaultPage = {
    edited: getNow(),
    ...zeroCursor
  };

  const pages = [];
  for (const row of rows) {
    if (row.length !== importedKeys.length) continue;

    const page = Object.assign({}, defaultPage);
    for (let i = 0; i < row.length; i++) {
      const key = importedKeys[i];
      if (!keys.includes(key)) continue;
      const parser = parsers[key] ?? defaultParser;
      page[key] = parser(row[i]);
    }
    if (!("done" in page)) {
      page.done = getDone(page.text);
    }
    pages.push(page);
  }
  return pages;
};
