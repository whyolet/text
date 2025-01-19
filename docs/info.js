import {onBack, openScreen, screenTypes} from "./nav.js";
import {ib, o, ui} from "./ui.js";

/// initInfoUI

export const initInfoUI = () => {
  ui.infoHeader = o(".header");
  ui.infoItems = o(".items");

  ui.info = o(".info",
    ui.infoHeader,
    ib("close", "x", onBack),
    ui.infoItems,
  );
};

/// openInfoScreen

export const openInfoScreen = (header, items) => {
  openScreen(screenTypes.info, {header, items});
};

/// openInfo

export const openInfo = (header, items) => {
  ui.infoHeader.textContent = header;
  ui.infoItems.textContent = "";
  for (const item of items) {
    ui.infoItems.appendChild(
      item instanceof Node ?
      item : o("", item)
    );
  }
};
