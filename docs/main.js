import "./error.js";
import {setDbPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {initFindUI} from "./find.js";
import {initFontUI} from "./font.js";
import {initInfoUI} from "./info.js";
import {initLineUI} from "./line.js";
import {getPersisted, tryPersist} from "./local.js";
import {initMenuUI, openMenuInfo} from "./menu.js";
import {getAppLock, getToday, initNavUI, openScreen, screenTypes} from "./nav.js";
import {initPageUI} from "./page.js";
import {initSearchUI} from "./search.js";
import {o, showBanner, ui} from "./ui.js";

showBanner({isActive: true},
  "Loading...",
);

getAppLock();

setDbPassphrase("");
await db.load();

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

if (location.hash === "#about") {
  openMenuInfo({withoutClose: true});
} else {
  openScreen(screenTypes.page, {tag: getToday()});

  const persisted = await getPersisted();
  if (!persisted) await tryPersist();
}
