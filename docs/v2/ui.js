import * as db from "./db.js";
import {save} from "./page.js";

const mem = db.mem;

/// o

/** o - bullet point in a tree of HTML elements.
 *
 * o("tag.class",
 *   o("tag", {attr: value}, "text"),
 *   o(".class"),
 *   o("", {attr: cond ? val : null},
 *     cond ? o("br") : null,
 *   ),
 * )
 *
 * `null` attrs and kids are skipped.
 * Non-`Node` objects become attrs.
 * Primitives like `string` become text nodes.
 * Default `o()` has `div` tag, no class, no attrs, no kids.
 */

export const o = (tag_cls, ...kids) => {
  const [tag, cls] = (tag_cls || "").split(".");
  const el = document.createElement(tag || "div");
  if (cls) el.className = cls;

  for (const kid of kids) {
    if (kid === null) continue;

    if (kid instanceof Node) {
      el.appendChild(kid);
      continue;
    }

    if (typeof kid === "object") {
      const attrs = kid;
      for (const key in attrs) {
        const val = attrs[key];
        if (val === null) continue;
        el.setAttribute(key, val);
      }
      continue;
    }

    el.appendChild(document.createTextNode(kid));
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
  const el = o(".icon button",
    {
      "style": shortcut ?
        `grid-area: ${shortcut}`
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

/// getDateInput, showDateInput

export const getDateInput = (onSet) => {
  const el = o("input.hidden", {
    "type": "date",
  });

  on(el, "change", () => {
    const date = el.value;
    if (!date || date === mem.page.tag) return;

    onSet(date);
  });

  return el;
};

export const showDateInput = (el) => {
  el.value = "";  // To get `change`.

  if ("showPicker" in el) {
    try {
      el.showPicker();
      return;
    } catch {}
  }

  el.click();
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
