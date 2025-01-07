import "./error.js";
import {setPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {initFindUI} from "./find.js";
import {initLineUI} from "./line.js";
import {getAppLock, getTodayPlus, initNavUI, openScreen, screenTypes} from "./nav.js";
import {initPageUI} from "./page.js";
import {initSearchUI} from "./search.js";
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
initSearchUI();

const body = document.body;
body.textContent = "";
for (const screenType in screenTypes)  {
  body.appendChild(ui[screenType]);
}

openScreen(screenTypes.page, {tag: getTodayPlus(0)});
