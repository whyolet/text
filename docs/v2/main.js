import "./error.js";
import {setPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {getAppLock, initNav, openScreen, screenTypes} from "./nav.js";
import {initPageUI} from "./page.js";
import {o, showBanner, ui} from "./ui.js";

showBanner({isActive: true},
  o(".header", "Loading..."),
);

getAppLock();

setPassphrase("");
await db.load();

initPageUI();
openScreen(screenTypes.page, {tag: "draft"});

document.body.textContent = "";
document.body.appendChild(ui.page);

initNav();
ui.ta.focus();
