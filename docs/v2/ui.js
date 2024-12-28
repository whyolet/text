import * as db from "./db.js";
import {save} from "./page.js";

/// o - bullet point in a tree of elements:
/// o("tag.class", ...kids)
/// o({o: "tag.class", attr: value}, ...kids)
/// Default tag is "div", no class, no kids.

export const o = (data, ...kids) => {
  let tag_cls, attrs;
  if (typeof data === "string") {
    tag_cls = data;
  } else {
    tag_cls = data.o || "";
    delete data.o;
    attrs = data;
  }

  const [tag, cls] = tag_cls.split(".");

  const el = document.createElement(tag || "div");
  if (cls) el.className = cls;

  if (attrs) for (const key in attrs) {
    const val = attrs[key];
    if (val !== null) el.setAttribute(key, val);
  }

  for (const kid of kids) {
    if (kid !== null) el.appendChild(
      typeof kid === "string"
      ? document.createTextNode(kid)
      : kid
    );
  }

  return el;
};

/// UI elements and data.

export const ui = {isActive: true};

/// on, onClick

export const on = (el, eventName, handler, props) => {
  el.addEventListener(eventName, handler, props);
};

export const onClick = (el, handler) => on(el, "click", handler);

/// isHidden, hide, show

const hidden = "hidden";

export const isHidden = (el) => el.classList.contains(hidden);

export const hide = (el) => el.classList.add(hidden);

export const show = (el) => el.classList.remove(hidden);

/// isCollapsed, collapse, expand

const collapsed = "collapsed";

export const isCollapsed = (el) => el.classList.contains(collapsed);

export const collapse = (el) => el.classList.add(collapsed);

export const expand = (el) => el.classList.remove(collapsed);

/// Icon Button.

export const ib = (name, shortcut, handler) => {
  const el = o(
    {
      "o": ".icon button",
      "style": shortcut ? `grid-area: ${shortcut}`
      : null,
    },
    name,
  );

  onClick(el, async () => {
    ui.ta.focus();
    await save();
    if (handler) handler();
  });

  return el;
};

/// showBanner

export const showBanner = (props, ...kids) => {
  const {isActive} = props ?? {};
  if (!ui.isActive) return;

  ui.isActive = isActive;
  db.close();

  document.body.textContent = "";
  document.body.appendChild(
    o(".banner", ...kids)
  );
};

/// getRestartButton

export const getRestartButton = () => {
  const el = o(".button",
    o(".icon", "refresh"),
    " Restart",
  );

  onClick(el, () => {
    location.reload();
  });

  return el;
};

/// debounce

const timerIds = {};

export const debounce = (timerName, millis, action) => {
  if (timerIds[timerName]) clearTimeout(timerIds[timerName]);

  if (millis === undefined) return;

  timerIds[timerName] = setTimeout(action, millis);
};

/// toast

let toastTimerId = 0;
let pinnedMessage = "";
const pinned = "pinned";

export const toast = (message, props) => {
  const {isPinned} = props ?? {};
  if (isPinned) pinnedMessage = message;

  if (toastTimerId) {
    if (isPinned) return; // Keep showing time-limited message.

    clearTimeout(toastTimerId);
    toastTimerId = 0;
  }

  ui.header.textContent = message;
  const cls = ui.header.classList;
  if (isPinned) {
    cls.add(pinned);
    return;
  }
  cls.remove(pinned);

  toastTimerId = setTimeout(() => {
    toastTimerId = 0;
    ui.header.textContent = pinnedMessage;
    cls.add(pinned);
  }, 1000);
};

/// getInt

export const getInt = (props) => {
  const {oldValue, newValue, min, max} = props;
  if (newValue === null) return null;

  const result = parseInt(newValue, 10);
  if (
    result === oldValue ||
    Number.isNaN(result)
  ) return null;

  if (
    result < min ||
    result > max
  ) {
    toast(`From ${min} to ${max}`);
    return null;
  }

  return result;
};
