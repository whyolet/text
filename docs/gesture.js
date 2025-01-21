import {on, ui} from "./ui.js";

/// states

const states = new WeakMap();

/// detectGestures

export const detectGestures = (el, handlers) => {
  states.set(el, {
    handlers,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });

  on(el, "pointerdown", onPointerDown);
  on(el, "pointermove", onPointerMove);
  on(el, "pointerup", onPointerUp);
};

/// onPointerDown

const onPointerDown = (event) => {
  const state = states.get(event.currentTarget);
  if (!state || !event.isPrimary) return;

  state.startX = event.clientX;
  state.startY = event.clientY;
};

/// onPointerMove

const onPointerMove = (event) => {
  const state = states.get(event.currentTarget);
  if (!state || !event.isPrimary) return;

  state.endX = event.clientX;
  state.endY = event.clientY;
};

/// onPointerUp

const onPointerUp = (event) => {
  const state = states.get(event.currentTarget);
  if (!state || !event.isPrimary) return;

  const {handlers, startX, startY, endX, endY} = state;

  const dX = endX - startX;
  const dY = endY - startY;

  const absDX = Math.abs(dX);
  const absDY = Math.abs(dY);

  if (
    absDX > 2 * absDY &&
    absDX > ui.ta.clientWidth / 3
  ) {
    if (dX > 0) {
      handlers.onSwipeRight?.();
    } else {
      handlers.onSwipeLeft?.();
    }
  }
};
