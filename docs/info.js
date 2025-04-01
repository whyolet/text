import {onBack, openScreen, screenTypes} from "./nav.js";
import {hide, ib, o, show, ui} from "./ui.js";

/// initInfoUI

export const initInfoUI = () => {
  ui.infoHeader = o(".header", {
    style: "grid-area: h",
  });
  ui.infoClose = ib("close", "x", onBack);
  ui.infoItems = o(".items");

  ui.info = o(".info",
    ui.infoHeader,
    ui.infoClose,
    ui.infoItems,
  );
};

/// openInfoScreen

export const openInfoScreen = (header, items, props) => {
  openScreen(screenTypes.info, {header, items, props});
};

/// openInfo

export const openInfo = (header, items, props) => {
  const {withoutClose} = props ?? {};
  ui.infoHeader.textContent = header;

  if (withoutClose) {
    hide(ui.infoClose);
  } else show(ui.infoClose);

  ui.infoItems.textContent = "";
  for (const item of items) {
    ui.infoItems.appendChild(
      item instanceof Node ?
      item : o("", item)
    );
  }
};
