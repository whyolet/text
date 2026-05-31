/*
 * Whyolet Text - personal tasks/text editor.
 * Copyright (C) 2026  Denis Ryzhkov <denisr@denisr.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import "./intercept.js";
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
