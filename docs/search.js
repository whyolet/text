import * as db from "./db.js";
import {mem} from "./db.js";
import {isDateTag, openScreen, screenTypes} from "./nav.js";
import {getQueryFromSel} from "./sel.js";
import {hide, ib, o, on, onClick, ui} from "./ui.js";

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

  ui.found = o(".items");

  ui.search = o(".search",
    o(".icon", "search"),
    ui.searchInput,
    ib("close", "x", onClearOrBack),
    ui.found,
  );
  hide(ui.search);
};

/// onSearch

export const onSearch = async () => {
  const query = getQueryFromSel() || mem.searchQuery;
  await openScreen(screenTypes.search, {query});
};

/// openSearch

export const openSearch = (query) => {
  ui.searchInput.value = query;
  ui.searchInput.focus();
  onSearchInput();
};

/// onSearchInput

const onSearchInput = () => {
  const items = [];
  const query = ui.searchInput.value;
  mem.searchQuery = query;

  if (query) {
    const lowerQuery = query.toLowerCase();

    const tags = [];
    for (const page of Object.values(mem.pages)) {
      if (
        page
        .text
        .toLowerCase()
        .includes(lowerQuery)
      ) tags.push(page.tag);
    }

    if (tags.length) {
      addHeader(items, "find_in_page", "Found");
    } else addHeader(items, "search_off", "Not found!");

    tags.sort();
    for (const tag of tags) add(items, tag, query);

  } else {
    items.push(o(".item header",
      o(".icon", "history"),
      o("span", "Recent"),
    ));

    for (const tag of mem.recentTags) add(items, tag, query);

    const tags = [], dates = [];
    for (const page of Object.values(mem.pages)) {
      if (!page.text) continue;

      if (isDateTag(page.tag)) {
        dates.push(page.tag);
      } else tags.push(page.tag);
    }

    if (tags.length) {
      addHeader(items, "sort_by_alpha", "Tags");
      tags.sort();
      for (const tag of tags) add(items, tag, query);
    }

    if (dates.length) {
      addHeader(items, "calendar_month", "Dates");
      dates.sort();
      for (const tag of dates) add(items, tag, query);
    }
  }

  ui.found.textContent = "";
  for (const item of items) {
    ui.found.appendChild(item);
  }
};

/// addHeader

const addHeader = (items, icon, text) => {
  items.push(o(".item header",
    o(".icon", icon),
    o("span", text),
  ));
};

/// add

const add = (items, tag, query) => {
  const el = o(".item button", tag);
  onClick(el, () => {
    openScreen(screenTypes.page, {
      replace: true,
      tag,
      query,
    });
  });
  items.push(el);
};

/// onClearOrBack

const onClearOrBack = () => {
  if (ui.searchInput.value) {
    ui.searchInput.value = "";
    onSearchInput();
  } else history.back();
};
