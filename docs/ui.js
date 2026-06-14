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

import * as db from "./db.js";
import {mem} from "./db.js";
import {setColors} from "./font.js";
import {unidle} from "./nav.js";
import {save} from "./page.js";
import {setSel} from "./sel.js";

/// o

/** o - bullet point in a tree of HTML elements.
 *
 * o("tag.class",
 *   o("tag", {attr: value}, "text"),
 *   o(".class"),
 *   o("", {attr: cond ? val : null},
 *     cond ? o("input") : null,
 *   ),
 * )
 *
 * `null` attrs and kids are skipped.
 * Array of kids is flattened - for reusable sub-arrays.
 * Non-`Node` objects become attrs.
 * Primitives like `string` become text nodes.
 * Multiline strings are trimmed with inner newlines preserved, and wrapped to scrollable `div`.
 * Default `o()` has `div` tag, no class, no attrs, no kids.
 */

export const o = (tag_cls, ...kids) => {
  const [tag, cls] = (tag_cls || "").split(".");
  const el = document.createElement(tag || "div");
  if (cls) el.className = cls;

  for (const kid of kids.flat()) {
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

    if (
      typeof kid === "string" &&
      kid.includes("\n")
    ) {
      const span = o("div.br");
      span.appendChild(document.createTextNode(kid.trim()));
      el.appendChild(span);
      continue;
    }
    el.appendChild(document.createTextNode(kid));
  }

  return el;
};

/// UI elements and data.

export const ui = {
  appName: "Whyolet Text",
  body: document.body,
  isActive: true,
  supportEmail: "support@whyolet.com",
};

ui.supportHref = `mailto:${ui.supportEmail}?subject=Whyolet%20Text`;

const addWarn = (message) => `⚠️ ${message.trim()}`;

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

/// anim

export const anim = (action) => {
  if (document.startViewTransition) {
    document.startViewTransition(action);
  } else action();
};

/// Icon Button.

export const ib = (
  icon,  // Web icon name from https://fonts.google.com/icons
  shortcut,  // CSS `grid-area` for now. TODO: `Ctrl+...` keyboard shortcut.
  handler,  // Function to call or URL to open on click.
  props,
 ) => {
  const {
    focused,  // If valid for input fields too, not just for the main textarea.
  } = props ?? {};

  const el = o(
    ".icon button" + (shortcut ?
      ` shortcut-${shortcut}`
      : ""
    ),
    {
      "style": shortcut ?
        `grid-area: ${shortcut}`
        : null,
    },
    icon,
  );

  onClick(el, async () => {
    if (!ui.isActive) return;
    unidle();

    const input = focused && ui.focusedInput || ui.ta;
    input.focus();
    if (input === ui.ta) await save();
    if (!handler) return;

    if (typeof handler === "string") {
      open(handler, "_blank");
      return;
    };

    handler();
  });

  return el;
};

/// showBanner

export const showBanner = (props, ...items) => {
  const {isActive} = props ?? {};
  if (!ui.isActive) return;

  ui.isActive = isActive;
  if (!isActive) db.close();

  items = items.map(item =>
    item instanceof Node
      ? item
      : o("", item)
  );

  items[0]?.classList.add("header");

  ui.body.textContent = "";
  ui.body.appendChild(
    o(".full centered", ...items),
  );
};

/// getRestartButton

export const getRestartButton = () => {
  const el = o(".rounded button",
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
let toastTimerIsShy = false;
let pinnedMessage = "";
const pinned = "pinned";

export const toast = (message, props) => {
  const {isPinned, isShy, warn} = props ?? {};
  if (warn) message = addWarn(message);
  if (isPinned) pinnedMessage = message;

  if (toastTimerId) {
    if (
      isPinned ||
      isShy && !toastTimerIsShy
    ) {
      // Keep showing another message.
      return;
    }

    clearTimeout(toastTimerId);
    toastTimerId = 0;
    toastTimerIsShy = false;
  }

  setHeader(message);

  const cls = ui.header.classList;
  if (isPinned) {
    cls.add(pinned);
    return;
  }
  cls.remove(pinned);

  toastTimerId = setTimeout(() => {
    toastTimerId = 0;
    toastTimerIsShy = false;

    setHeader(pinnedMessage);
    cls.add(pinned);
  }, warn ? 2000 : 1000);
  toastTimerIsShy = isShy;
};

/// setHeader

const setHeader = (message) => {
  ui.header.textContent = message;
};

/// showOverlay, hideOverlay

export const showOverlay = (...items) => {
  ui.overlay = o(".overlay", ...items);
  ui.body.appendChild(ui.overlay);
};

export const hideOverlay = () => {
  if (!ui.overlay) return;

  ui.body.removeChild(ui.overlay);
  ui.overlay = null;
};

/// dialog, input, btns

let reply;

export const dialog = async (...items) => {
  const result = await new Promise(done => {
    reply = done;
    showOverlay(o(".dialog", ...items));

    if (!ui.dialogInput) {
      ui.focusedInput?.blur();
      return;
    }

    setSel(
      ui.dialogInput.value.length,
      null,
      {input: ui.dialogInput},
    );
  });

  reply = ui.dialogInput = null;
  hideOverlay();
  return result;
};

export const input = (defaultValue, props) => {
  const {secret} = props ?? {};

  ui.dialogInput = o("input", {
    type: secret ? "password" : "text",
    value: defaultValue ?? "",
  });

  on(ui.dialogInput, "keydown", (e) => {
    if (e.key === "Enter") {
      reply(ui.dialogInput.value);
    } else if (e.key === "Escape") {
      reply(null);
    }
  });

  if (!secret) return ui.dialogInput;

  let visible = false;

  const toggle = ib("visibility", "", () => {
    visible = !visible;
    const {selectionStart, selectionEnd} = ui.dialogInput;
    ui.dialogInput.type = visible ? "text" : "password";
    setSel(
      selectionStart,
      selectionEnd,
      {input: ui.dialogInput},
    );
    toggle.textContent = visible ? "visibility_off" : "visibility";
  }, {focused: true});

  return o(".secret",
    ui.dialogInput,
    toggle,
  );
};

on(ui.body, "keydown", (e) => {
  if (reply && e.key === "Escape") {
    reply(null);
  }
});

export const btn = (text, getResult) => {
  const el = o(".rounded button", text);
  onClick(el, () => reply(getResult()));
  return el;
};

export const okBtn = () => btn("OK", () => ui.dialogInput?.value ?? true);

export const cancelBtn = () => btn("Cancel", () => null);

export const btns = (...buttons) => o(".buttons", ...buttons);

export const ok = () => btns(
  okBtn(),
);

export const okCancel = () => btns(
  cancelBtn(),
  okBtn(),
);

/// say, warn, debug

export const say = async (...items) => await dialog(...items, ok());

export const warn = async (message) => await say(addWarn(message));

export const debug = async (data) => await say(JSON.stringify(data));

/// ask, choose

export const ask = async (...items) => !!await dialog(...items, okCancel());

export const choose = async (header, ...options) => {
  const items = [];
  for (const option of options) {
    const item = option.item ?? o(".item button", option.text);
    const value = option.value;
    if (option.colors) {
      setColors(item, option.colors);
    }
    onClick(item, () => reply(value));
    items.push(item);
  }

  return await dialog(
    o(".header",
      header || "Make a choice:",
    ),
    o(".choose",
      o(".items", ...items),
    ),
  );
};

/// enter

export const enter = async (message, defaultValue, props) => await dialog(
  message || null,
  input(defaultValue || "", props),
  okCancel(),
);

/// getInt

export const getInt = (props) => {
  const {oldValue, newValue, add, min, max, fix} = props;
  if (newValue === null) return null;

  let result = parseInt(newValue, 10);
  if (Number.isNaN(result)) return null;

  if (add) result += add;
  if (result === oldValue) return null;

  if (
    result < min ||
    result > max
  ) {
    toast(`From ${min} to ${max}`);
    return fix ?
      ((result < min) ? min : max)
      : null;
  }

  return result;
};
