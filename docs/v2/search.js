import * as db from "./db.js";
import {onBack, openScreen, screenTypes} from "./nav.js";
import {getFindSelected} from "./sel.js";
import {ib, o, on, onClick, ui} from "./ui.js";

const mem = db.mem;

/// addToRecentTags

export const addToRecentTags = async (tag) => {
  const recentTags = mem.recentTags;
  const i = recentTags.indexOf(tag);
  if (i !== -1) recentTags.splice(i, 1);
  recentTags.unshift(tag);
  if (recentTags.length > 7) recentTags.pop();
  await db.saveConf(db.conf.recentTags);
};

/// initSearchUI

export const initSearchUI = () => {
  ui.searchInput = o("input", {
    placeholder: "Search…",
  });
  on(ui.searchInput, "input", onSearchInput);

  ui.found = o(".found");

  ui.search = o(".search",
    ui.searchInput,
    ib("close", "x", onClearOrBack),
    ui.found,
  );
};

/// onSearch

export const onSearch = () => {
  const what = ui.findInput.value || getFindSelected();
  openScreen(screenTypes.search, {what});
};

/// openSearch

export const openSearch = (what) => {
  ui.searchInput.value = what;
  ui.searchInput.focus();
  onSearchInput();
};

/// onSearchInput

const onSearchInput = () => {
  const findValue = ui.searchInput.value;
  const items = [];

  if (findValue) {
    const findWhat = findValue.toLowerCase();

    const tags = [];
    for (const page of Object.values(mem.pages)) {
      if (
        page
        .text
        .toLowerCase()
        .includes(findWhat)
      ) tags.push(page.tag);
    }

    items.push(o(".item header",
      o(".icon", tags.length ?
        "find_in_page"
        : "search_off"
      ),
      o("span", tags.length ?
        "Found"
        : "Not found!"
      ),
    ));

    tags.sort();
    for (const tag of tags) add(items, tag, findValue);

  } else {
    items.push(o(".item header",
      o(".icon", "history"),
      o("span", "Recent"),
    ));

    for (const tag of mem.recentTags) add(items, tag, findValue);

    items.push(o(".item header",
      o(".icon", "sort_by_alpha"),
      o("span", "All"),
    ));

    const tags = [];
    for (const page of Object.values(mem.pages)) {
      if (page.text) tags.push(page.tag);
    }

    tags.sort();
    for (const tag of tags) add(items, tag, findValue);
  }

  ui.found.textContent = "";
  for (const item of items) {
    ui.found.appendChild(item);
  }
};

/// add

const add = (items, tag, findValue) => {
  const el = o(".item button", tag);
  onClick(el, () => {
    openScreen(screenTypes.page, {tag, findValue});
  });
  items.push(el);
};

/// onClearOrBack

const onClearOrBack = () => {
  if (ui.searchInput.value) {
    ui.searchInput.value = "";
    onSearchInput();
  } else onBack();
};
