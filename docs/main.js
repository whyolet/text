import "./error.js";
import * as db from "./db.js";
import {initFindUI} from "./find.js";
import {initFontUI} from "./font.js";
import {initInfoUI} from "./info.js";
import {initLineUI} from "./line.js";
import {initMenuUI} from "./menu.js";
import {getAppLock, initNavUI, openFirstScreen, screenTypes} from "./nav.js";
import {initPageUI} from "./page.js";
import {initSearchUI} from "./search.js";
import {on, showBanner, ui} from "./ui.js";

on(window, "load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }
});

showBanner({isActive: true},
  "Loading...",
);

getAppLock();  // No await!

await db.load("");

initNavUI();
initMenuUI();
initFontUI();
initLineUI();
initInfoUI();
initFindUI();
initSearchUI();
initPageUI();

ui.body.textContent = "";
for (const screenType in screenTypes)  {
  ui.body.appendChild(ui[screenType]);
}

await openFirstScreen();
