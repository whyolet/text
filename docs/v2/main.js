import "./error.js";
import {setPassphrase} from "./crypto.js";
import * as db from "./db.js";
import {getAppLock, openScreen, screenTypes} from "./nav.js";
import {setPageUI} from "./page.js";
import {o, showBanner, ui} from "./ui.js";

showBanner(o(".header", "Loading..."));

getAppLock();

setPassphrase("");
await db.load();

setPageUI();
openScreen(screenTypes.page, {tag: "draft"});

document.body.textContent = "";
document.body.appendChild(ui.page);
