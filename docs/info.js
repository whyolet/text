import {onBack, openScreen, screenTypes} from "./nav.js";
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
    onBack();
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
  for (const item of items) {
    ui.infoItems.appendChild(
      item instanceof Node ?
      item : o("", item)
    );
  }
};
