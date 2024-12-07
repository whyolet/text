import * as db from "./db.js";

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

export const ui = {};

/// on, onClick

export const on = (el, eventName, handler) => {
  el.addEventListener(eventName, handler);
};

export const onClick = (el, handler) => on(el, "click", handler);

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

  onClick(el, () => {
    ui.ta.focus();
    if (handler) handler();
  });

  return el;
};

/// showBanner

export const showBanner = (...kids) => {
  db.close();

  document.body.textContent = "";
  document.body.appendChild(o(".banner", ...kids));
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

/// debounced

const timerIds = {};

export const debounced = (timerName, millis, action) => {
  if (timerIds[timerName]) clearTimeout(timerIds[timerName]);

  timerIds[timerName] = setTimeout(action, millis);
};