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

import {openScreen, screenTypes} from "./nav.js";
import {hide, ib, o, show, ui} from "./ui.js";

/// To check if info screen got closed.

export const info = {closed: true};

/// initInfoUI

export const initInfoUI = () => {
  ui.infoHeader = o(".header", {
    style: "grid-area: h",
  });

  ui.infoClose = ib("close", "x", () => {
    info.closed = true;
    history.back();
  });

  ui.infoItems = o(".items");

  ui.info = o(".info",
    ui.infoHeader,
    ui.infoClose,
    ui.infoItems,
  );
  hide(ui.info);
};

/// openInfoScreen

export const openInfoScreen = async (header, items, props) => {
  await openScreen(screenTypes.info, {header, items, props});
};

/// openInfo

export const openInfo = (header, items, props) => {
  const {withoutClose} = props ?? {};
  ui.infoHeader.textContent = header;

  if (withoutClose) {
    hide(ui.infoClose);
  } else show(ui.infoClose);
  info.closed = false;

  ui.infoItems.textContent = "";
  for (const item of items.flat()) {
    ui.infoItems.appendChild(
      item instanceof Node ?
      item : o("", item)
    );
  }
};
