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

import {mem} from "./db.js";
import {getNow} from "./nav.js";
import {getDone, zeroCursor} from "./page.js";
import {warn} from "./ui.js";

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

export const getPagesFromCSV = async (data) => {
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
    await warn("File is empty!");
    return null;
  }

  const importedKeys = rows.shift();
  for (const key of requiredKeys) {
    if (!importedKeys.includes(key)) {
      await warn(`"${key}" column is not found!`);
      return null;
    }
  }

  const defaultPage = {
    edited: getNow(),
    ...zeroCursor
  };

  const pages = [];
  for (const row of rows) {
    if (row.length !== importedKeys.length) {
      await warn(`Failed to match ${importedKeys.length} columns
${JSON.stringify(importedKeys)}
and a row with ${row.length} cells
${JSON.stringify(row)}`);
      return null;
    }

    const page = Object.assign({}, defaultPage);
    for (let i = 0; i < row.length; i++) {
      const key = importedKeys[i];
      if (!keys.includes(key)) continue;
      const parser = parsers[key] ?? defaultParser;
      page[key] = parser(row[i]);
    }
    if (!("done" in page)) {
      page.done = getDone(page);
    }
    pages.push(page);
  }
  return pages;
};
