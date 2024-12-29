import "./error.js";
import {setPassphrase} from "./crypto.js";
import * as db from "./db.js";
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

ui.attic = o(".attic collapsible collapsed");
initLineUI();
initNavUI();

initPageUI();
openScreen(screenTypes.page, {tag: getTodayPlus(0)});

const body = document.body;
body.textContent = "";
body.appendChild(ui.attic);
body.appendChild(ui.openDateInput);
body.appendChild(ui.page);

ui.ta.focus();
