import * as db from "./db.js";
import {onBack, openScreen, screenTypes} from "./nav.js";
import {getFindSelected} from "./sel.js";
import {ib, o, ui} from "./ui.js";

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

  ui.found = o(".found",
    {style: "grid-area: f"},
    "TODO",
  );

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
};

/// onClearOrBack

const onClearOrBack = () => {
  if (ui.searchInput.value) {
    ui.searchInput.value = "";
  } else onBack();
};
