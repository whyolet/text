import {on, ui} from "./ui.js";

/// states

const states = new WeakMap();

/// detectGestures

export const detectGestures = (el, handlers) => {
  states.set(el, {
    handlers,
    startX: 0,
    startY: 0,
    startT: 0,
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

  state.startX = state.endX = event.clientX;
  state.startY = state.endY = event.clientY;
  state.startT = performance.now();
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

  const {handlers, startX, startY, startT, endX, endY} = state;

  const dT = performance.now() - startT;
  if (dT > 500) return;

  const dX = endX - startX;
  const dY = endY - startY;

  const absDX = Math.abs(dX);
  const absDY = Math.abs(dY);

  if (
    absDX > 100 &&
    absDX > 2 * absDY
  ) {
    if (dX > 0) {
      handlers.onSwipeRight?.();
    } else {
      handlers.onSwipeLeft?.();
    }
  }
};
