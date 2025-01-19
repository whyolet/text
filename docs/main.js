import "./error.js";
import {setPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {initFindUI} from "./find.js";
import {initInfoUI} from "./info.js";
import {initLineUI} from "./line.js";
import {getPersisted, tryPersist} from "./local.js";
import {initMenuUI} from "./menu.js";
import {getAppLock, getTodayPlus, initNavUI, openScreen, screenTypes} from "./nav.js";
import {initPageUI} from "./page.js";
import {initSearchUI} from "./search.js";
import {o, showBanner, ui} from "./ui.js";

showBanner({isActive: true},
  "Loading...",
);

getAppLock();

setPassphrase("");
await db.load();

initNavUI();
initMenuUI();
initInfoUI();
initFindUI();
initSearchUI();
initLineUI();
initPageUI();

ui.body.textContent = "";
for (const screenType in screenTypes)  {
  ui.body.appendChild(ui[screenType]);
}

openScreen(screenTypes.page, {tag: getTodayPlus(0)});

const persisted = await getPersisted();
if (!persisted) await tryPersist();
