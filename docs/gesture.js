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
