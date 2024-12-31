import "./error.js";
import {setPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {initFindUI} from "./find.js";
import {initLineUI} from "./line.js";
import {getAppLock, getTodayPlus, initNavUI, openScreen, screenTypes} from "./nav.js";
import {initPageUI} from "./page.js";
import {o, showBanner, ui} from "./ui.js";

showBanner({isActive: true},
  o(".header", "Loading..."),
);

getAppLock();

setPassphrase("");
await db.load();

initNavUI();
initFindUI();
initLineUI();

initPageUI();
openScreen(screenTypes.page, {tag: getTodayPlus(0)});

const body = document.body;
body.textContent = "";
for (const el of [
  ui.attic,
  ui.openDateInput,
  ui.moveToDateInput,
  ui.page,
]) body.appendChild(el);

ui.ta.focus();
